"""Parches de esquema al arranque: create_all no agrega columnas a tablas ya existentes."""

from sqlalchemy import text
from sqlalchemy.engine import Engine


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
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paymentmethod') THEN
                        ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'transferencia';
                        ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'mercado_pago';
                        ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'tarjeta_credito';
                        ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'tarjeta_debito';
                    END IF;
                END $$;
                """
            )
        )
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
