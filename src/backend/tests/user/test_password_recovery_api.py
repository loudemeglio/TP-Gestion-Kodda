"""
Recuperación de contraseña: flujo forgot-password + reset-password (API).

El link "Olvidé mi contraseña" en el login es UI; acá se comprueba el contrato
del backend y que con token válido se pueda fijar una nueva clave e iniciar sesión.
"""

import pytest

from tests.conftest import extract_token_from_mail_body, post_login


_FORGOT_NEUTRAL = "Si el correo está registrado, recibirás un enlace con instrucciones."


@pytest.mark.postgres
def test_forgot_password_always_returns_neutral_message(api_client, register_payload):
    """No filtra si el email existe (privacidad); mensaje único para el usuario."""
    r = api_client.post("/api/auth/forgot-password", json={"email": "nadie@example.com"})
    assert r.status_code == 200
    assert r.json()["message"] == _FORGOT_NEUTRAL


@pytest.mark.postgres
def test_forgot_password_creates_reset_token_for_known_user(
    api_client, register_payload, monkeypatch
):
    sent: dict = {}

    def capture(to: str, subject: str, body: str) -> None:
        sent["body"] = body

    monkeypatch.setattr(
        "app.users.services.password_reset_service.send_email",
        capture,
    )
    assert api_client.post("/api/users/", json=register_payload).status_code == 201
    r = api_client.post(
        "/api/auth/forgot-password",
        json={"email": register_payload["email"]},
    )
    assert r.status_code == 200
    assert r.json()["message"] == _FORGOT_NEUTRAL
    token = extract_token_from_mail_body(sent["body"], param="token")
    assert len(token) > 10


@pytest.mark.postgres
def test_reset_password_then_login_with_new_password(
    api_client, register_payload, monkeypatch
):
    sent: dict = {}

    def capture(to: str, subject: str, body: str) -> None:
        sent["body"] = body

    monkeypatch.setattr(
        "app.users.services.password_reset_service.send_email",
        capture,
    )
    assert api_client.post("/api/users/", json=register_payload).status_code == 201
    assert (
        api_client.post(
            "/api/auth/forgot-password",
            json={"email": register_payload["email"]},
        ).status_code
        == 200
    )
    plain = extract_token_from_mail_body(sent["body"], param="token")
    new_pw = "nueva_clave_99"
    rr = api_client.post(
        "/api/auth/reset-password",
        json={"token": plain, "new_password": new_pw},
    )
    assert rr.status_code == 200
    assert api_client.post(
        "/api/auth/login",
        data={"username": register_payload["username"], "password": register_payload["password"]},
    ).status_code == 401
    ok = post_login(api_client, register_payload["username"], new_pw)
    assert ok.status_code == 200
