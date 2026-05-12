"""Fixtures compartidas. Los tests de `user/` son de integración contra PostgreSQL."""

from __future__ import annotations

import os
import re

import pytest
from sqlalchemy import text


def _postgres_configured() -> bool:
    url = os.getenv("DATABASE_URL", "")
    return url.startswith("postgresql://") or url.startswith("postgresql+psycopg2://")


@pytest.fixture(scope="session")
def api_client():
    """Cliente HTTP contra la app FastAPI (levanta `main` una vez por sesión)."""
    if not _postgres_configured():
        pytest.skip(
            "Tests de integración: definí DATABASE_URL con PostgreSQL "
            "(p. ej. el mismo que docker-compose)."
        )
    # Sobrescribir (no setdefault): el Makefile carga .env con ALLOW_PUBLIC_SIGNUP=false
    # y los tests de registro público necesitan alta sin JWT de admin.
    os.environ["ALLOW_PUBLIC_SIGNUP"] = "true"
    os.environ.setdefault("MAIL_SUPPRESS", "true")
    os.environ.setdefault("REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN", "false")

    from app.core.config import get_settings

    get_settings.cache_clear()

    from sqlalchemy import text
    from sqlalchemy.exc import OperationalError

    from app.core.database import engine

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except OperationalError as exc:
        pytest.skip(f"PostgreSQL no accesible (¿levantaste la base?): {exc}")

    from main import app
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        yield client

    get_settings.cache_clear()


@pytest.fixture(autouse=True)
def _truncate_user_tables(api_client):
    """Estado limpio por test (FK: hijos se truncan en cascada desde users)."""
    from app.core.database import engine

    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE users RESTART IDENTITY CASCADE"))
    yield


@pytest.fixture
def register_payload():
    return {
        "username": "shop_user",
        "email": "shop_user@example.com",
        "password": "secret12",
    }


def post_login(client, identifier: str, password: str):
    """Login OAuth2 (campo form `username` = usuario o email)."""
    return client.post(
        "/api/auth/login",
        data={"username": identifier, "password": password},
    )


def extract_token_from_mail_body(body: str, param: str = "token") -> str:
    m = re.search(rf"[?&]{param}=([^&\s]+)", body)
    assert m, f"no se encontró {param}= en el cuerpo del mail: {body!r}"
    return m.group(1)
