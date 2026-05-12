"""
Verificación de correo tras el registro (token por mail + POST /verify-email).
"""

import pytest
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import engine
from app.users.models import User

from tests.conftest import extract_token_from_mail_body, post_login


@pytest.mark.postgres
def test_verify_email_marks_user_verified(api_client, register_payload, monkeypatch):
    sent: dict = {}

    def capture(to: str, subject: str, body: str) -> None:
        sent["body"] = body

    monkeypatch.setattr(
        "app.users.services.email_verification_service.send_email",
        capture,
    )
    assert api_client.post("/api/users/", json=register_payload).status_code == 201
    plain = extract_token_from_mail_body(sent["body"], param="token")
    vr = api_client.post("/api/auth/verify-email", json={"token": plain})
    assert vr.status_code == 200
    assert "verificado" in vr.json()["message"].lower()

    with Session(engine) as s:
        u = s.query(User).filter_by(email=register_payload["email"]).one()
        assert u.email_verified_at is not None


@pytest.mark.postgres
def test_verify_email_invalid_token_returns_400(api_client):
    r = api_client.post("/api/auth/verify-email", json={"token": "token_invalido_xxxx"})
    assert r.status_code == 400


@pytest.mark.postgres
def test_after_verification_login_allowed_when_verification_required(
    api_client, register_payload, monkeypatch
):
    """Con REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN, tras verify-email el login debe funcionar."""
    monkeypatch.setenv("REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN", "true")
    get_settings.cache_clear()
    try:
        sent: dict = {}

        def capture(to: str, subject: str, body: str) -> None:
            sent["body"] = body

        monkeypatch.setattr(
            "app.users.services.email_verification_service.send_email",
            capture,
        )
        assert api_client.post("/api/users/", json=register_payload).status_code == 201
        plain = extract_token_from_mail_body(sent["body"], param="token")
        assert api_client.post("/api/auth/verify-email", json={"token": plain}).status_code == 200

        r = post_login(api_client, register_payload["username"], register_payload["password"])
        assert r.status_code == 200
    finally:
        monkeypatch.delenv("REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN", raising=False)
        get_settings.cache_clear()
