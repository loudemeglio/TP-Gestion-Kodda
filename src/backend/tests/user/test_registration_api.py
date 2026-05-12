"""
Registro público: historias de alta de usuario y correo de verificación (API).

La redirección al inicio tras registro es responsabilidad del frontend (React Router);
acá se valida la API: perfil creado, errores por duplicados y encolado del mail.
"""

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import engine
from app.users.models import EmailVerificationToken, User

from tests.conftest import extract_token_from_mail_body


@pytest.mark.postgres
def test_register_creates_profile_and_returns_201(api_client, register_payload):
    """Criterio: el usuario se registra y se le crea el perfil (respuesta 201 con datos)."""
    r = api_client.post("/api/users/", json=register_payload)
    assert r.status_code == 201
    body = r.json()
    assert body["username"] == register_payload["username"]
    assert body["email"] == register_payload["email"]
    assert "id" in body
    with Session(engine) as s:
        u = s.scalar(select(User).where(User.email == register_payload["email"]))
        assert u is not None
        assert u.username == register_payload["username"]


@pytest.mark.postgres
def test_register_duplicate_email_returns_400(api_client, register_payload):
    """Criterio: datos ya registrados (email) — se informa y no se duplica."""
    assert api_client.post("/api/users/", json=register_payload).status_code == 201
    dup = {**register_payload, "username": "otro_nombre"}
    r = api_client.post("/api/users/", json=dup)
    assert r.status_code == 400
    assert "email" in r.json()["detail"].lower() or "registrado" in r.json()["detail"].lower()


@pytest.mark.postgres
def test_register_duplicate_username_returns_400(api_client, register_payload):
    """Criterio: username ya en uso — error claro."""
    assert api_client.post("/api/users/", json=register_payload).status_code == 201
    dup = {**register_payload, "email": "otro_correo@example.com"}
    r = api_client.post("/api/users/", json=dup)
    assert r.status_code == 400
    detail = r.json()["detail"].lower()
    assert "usuario" in detail or "username" in detail or "uso" in detail


@pytest.mark.postgres
def test_register_enqueues_verification_email(api_client, register_payload, monkeypatch):
    """Criterio: al registrarse se prepara el envío con enlace de verificación al email."""
    sent: dict = {}

    def capture(to: str, subject: str, body: str) -> None:
        sent["to"] = to
        sent["subject"] = subject
        sent["body"] = body

    monkeypatch.setattr(
        "app.users.services.email_verification_service.send_email",
        capture,
    )
    r = api_client.post("/api/users/", json=register_payload)
    assert r.status_code == 201
    assert sent.get("to") == register_payload["email"]
    assert "verify-email" in sent["body"]
    assert "token=" in sent["body"]

    with Session(engine) as s:
        n = s.scalar(select(func.count()).select_from(EmailVerificationToken))
        assert n == 1
