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
