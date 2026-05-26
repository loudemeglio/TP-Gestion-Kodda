"""Parches de esquema al arranque: create_all no agrega columnas a tablas ya existentes."""

from sqlalchemy import text
from sqlalchemy.engine import Engine

# Postgres: nuevos valores de ENUM no pueden usarse en la misma transacción que ADD VALUE.
_PAYMENT_METHOD_ENUM_VALUES = (
    "transferencia",
    "mercado_pago",
    "tarjeta_credito",
    "tarjeta_debito",
)


def _ensure_paymentmethod_enum_values(conn) -> None:
    for value in _PAYMENT_METHOD_ENUM_VALUES:
        conn.execute(
            text(f"ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS '{value}'")
        )


def apply_schema_patches(engine: Engine) -> None:
    """PostgreSQL: columnas nuevas en tablas viejas (p. ej. users sin email_verified_at)."""
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
                "email_verified_at TIMESTAMP WITH TIME ZONE"
            )
        )

        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS status_message TEXT"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS shoe_size VARCHAR(20)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS top_size VARCHAR(20)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bottom_size VARCHAR(20)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE"))
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS scam_report_count INTEGER DEFAULT 0")
        )
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE")
        )

        conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE"))
        conn.execute(
            text("ALTER TABLE products ADD COLUMN IF NOT EXISTS size VARCHAR(20) DEFAULT 'Único'")
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS user_billing_info (
                    user_id INTEGER PRIMARY KEY
                        REFERENCES users(id) ON DELETE CASCADE,
                    legal_name VARCHAR(200) NOT NULL,
                    tax_id VARCHAR(20) NOT NULL,
                    tax_condition VARCHAR(50) NOT NULL,
                    billing_address VARCHAR(300) NOT NULL,
                    city VARCHAR(100),
                    province VARCHAR(100),
                    postal_code VARCHAR(20),
                    billing_email VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS orders (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
                    subtotal DOUBLE PRECISION NOT NULL,
                    total DOUBLE PRECISION NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS order_items (
                    id SERIAL PRIMARY KEY,
                    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
                    product_name VARCHAR NOT NULL,
                    unit_price DOUBLE PRECISION NOT NULL,
                    quantity INTEGER NOT NULL,
                    seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS invoices (
                    order_id INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
                    legal_name VARCHAR(200) NOT NULL,
                    tax_id VARCHAR(20) NOT NULL,
                    tax_condition VARCHAR(50) NOT NULL,
                    billing_address VARCHAR(300) NOT NULL,
                    city VARCHAR(100),
                    province VARCHAR(100),
                    postal_code VARCHAR(20),
                    billing_email VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(
            text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)")
        )

        enum_exists = conn.execute(
            text("SELECT 1 FROM pg_type WHERE typname = 'paymentmethod'")
        ).scalar()
        if enum_exists:
            _ensure_paymentmethod_enum_values(conn)

    # Segunda transacción: usar valores del enum recién agregados (requiere commit previo).
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE orders SET payment_method = 'mercado_pago' "
                "WHERE payment_method IS NULL"
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS payment_intents (
                    id SERIAL PRIMARY KEY,
                    token VARCHAR(36) NOT NULL UNIQUE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    amount DOUBLE PRECISION NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    approved_at TIMESTAMP WITH TIME ZONE
                )
                """
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_payment_intents_token "
                "ON payment_intents (token)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_payment_intents_user_id "
                "ON payment_intents (user_id)"
            )
        )

        conn.execute(
            text(
                """
                DO $$ BEGIN
                    CREATE TYPE ratingkind AS ENUM ('positive', 'negative');
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$;
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS seller_ratings (
                    id SERIAL PRIMARY KEY,
                    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                    buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    kind ratingkind NOT NULL,
                    score INTEGER,
                    comment TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    CONSTRAINT uq_seller_rating_per_order UNIQUE (order_id, buyer_id, seller_id)
                )
                """
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_seller_ratings_order_id "
                "ON seller_ratings (order_id)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_seller_ratings_seller_id "
                "ON seller_ratings (seller_id)"
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS seller_review_queue (
                    id SERIAL PRIMARY KEY,
                    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    negative_count_snapshot INTEGER NOT NULL,
                    reason VARCHAR(500) NOT NULL,
                    resolved_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_seller_review_queue_seller_id "
                "ON seller_review_queue (seller_id)"
            )
        )

        conn.execute(text("ALTER TABLE seller_ratings ADD COLUMN IF NOT EXISTS stars INTEGER"))
        conn.execute(text("ALTER TABLE seller_ratings ADD COLUMN IF NOT EXISTS description TEXT"))
        conn.execute(
            text("ALTER TABLE seller_ratings ADD COLUMN IF NOT EXISTS matches_description BOOLEAN")
        )
        conn.execute(
            text("ALTER TABLE seller_ratings ADD COLUMN IF NOT EXISTS delivered_on_time BOOLEAN")
        )
        conn.execute(
            text(
                "ALTER TABLE seller_ratings ADD COLUMN IF NOT EXISTS is_scam_report BOOLEAN DEFAULT FALSE"
            )
        )
        conn.execute(text("ALTER TABLE seller_ratings ALTER COLUMN kind DROP NOT NULL"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS buyer_reviews (
                    id SERIAL PRIMARY KEY,
                    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    stars INTEGER NOT NULL,
                    comment TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    CONSTRAINT uq_buyer_review_per_order_seller UNIQUE (order_id, seller_id)
                )
                """
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_buyer_reviews_buyer_id "
                "ON buyer_reviews (buyer_id)"
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR(200) NOT NULL,
                    message TEXT NOT NULL,
                    is_read BOOLEAN NOT NULL DEFAULT FALSE,
                    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_notifications_user_id "
                "ON notifications (user_id)"
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS system_settings (
                    key VARCHAR(100) PRIMARY KEY,
                    value INTEGER NOT NULL
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO system_settings (key, value)
                VALUES ('max_scam_reports', 1)
                ON CONFLICT (key) DO NOTHING
                """
            )
        )
