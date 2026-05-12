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
