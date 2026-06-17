"""Fixtures compartidas. Los tests de `user/` son de integración contra PostgreSQL."""

from __future__ import annotations

import os
import re
import uuid

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
    os.environ["MAIL_SUPPRESS"] = "true"
    # Igual que ALLOW_PUBLIC_SIGNUP: forzar false para que el .env del dev no rompa
    # tests que esperan login sin verificar; los que necesitan true usan monkeypatch.
    os.environ["REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN"] = "false"

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

    default_categories = (
        "Camperas",
        "Remeras",
        "Pantalones",
        "Vestidos",
        "Calzado",
        "Accesorios",
        "Otros",
    )
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE users RESTART IDENTITY CASCADE"))
        conn.execute(text("TRUNCATE TABLE brands RESTART IDENTITY CASCADE"))
        conn.execute(text("TRUNCATE TABLE categories RESTART IDENTITY CASCADE"))
        for category_name in default_categories:
            conn.execute(
                text("INSERT INTO categories (name, is_active) VALUES (:name, TRUE)"),
                {"name": category_name},
            )

        conn.execute(
            text(
                """
                INSERT INTO system_settings (key, value)
                VALUES ('max_scam_reports', 1)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO system_settings (key, value)
                VALUES ('min_bad_ratings', 2)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO system_settings (key, value)
                VALUES ('max_stars', 2)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
                """
            )
        )
    yield


def promote_to_admin(username: str) -> None:
    from app.core.database import SessionLocal
    from app.users.models import User, UserRole

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        assert user is not None, f"usuario {username!r} no encontrado"
        user.role = UserRole.ADMIN
        db.commit()
    finally:
        db.close()


def register_user_headers(client, username: str, email: str, password: str = "secret12") -> dict:
    payload = {"username": username, "email": email, "password": password}
    assert client.post("/api/users/", json=payload).status_code == 201
    r = post_login(client, username, password)
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def create_test_brand(client, admin_headers: dict, name: str = "Nike") -> int:
    r = client.post("/api/admin/catalog/brands", json={"name": name}, headers=admin_headers)
    assert r.status_code == 201, r.text
    return r.json()["id"]


def get_active_category_id(client, user_headers: dict, name: str = "Remeras") -> int:
    r = client.get("/api/catalog/categories/active", headers=user_headers)
    assert r.status_code == 200, r.text
    for item in r.json():
        if item["name"] == name:
            return item["id"]
    assert r.json(), "no hay categorías activas en el catálogo de prueba"
    return r.json()[0]["id"]


def build_product_payload(
    client,
    seller_headers: dict,
    admin_headers: dict,
    *,
    brand_name: str | None = None,
    category_name: str = "Remeras",
    **overrides,
) -> dict:
    if brand_name is None:
        brand_name = f"Brand-{uuid.uuid4().hex[:8]}"
    body = {
        "name": "Producto test",
        "description": "Descripción de prueba",
        "price": 15000,
        "stock": 2,
        "brand_id": create_test_brand(client, admin_headers, brand_name),
        "category_id": get_active_category_id(client, seller_headers, category_name),
        "size": "M",
        "main_image_url": None,
    }
    body.update(overrides)
    return body


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
