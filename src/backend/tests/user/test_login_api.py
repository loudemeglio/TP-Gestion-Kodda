"""
Inicio de sesión: credenciales correctas/incorrectas y bloqueo si falta verificar email.

El cartel de error en el cliente y la redirección al inicio son UI; la API debe
devolver 401/403 y mensajes en `detail` para que el frontend los muestre.
"""

import pytest

from tests.conftest import post_login


@pytest.mark.postgres
def test_login_with_username_returns_tokens(api_client, register_payload):
    """Criterio: datos correctos (usuario + contraseña) → tokens JWT."""
    assert api_client.post("/api/users/", json=register_payload).status_code == 201
    r = post_login(api_client, register_payload["username"], register_payload["password"])
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data and "refresh_token" in data
    assert data.get("token_type") == "bearer"


@pytest.mark.postgres
def test_login_with_email_as_identifier_returns_tokens(api_client, register_payload):
    """Mismo flujo usando el email en el campo OAuth2 `username`."""
    assert api_client.post("/api/users/", json=register_payload).status_code == 201
    r = post_login(api_client, register_payload["email"], register_payload["password"])
    assert r.status_code == 200
    assert r.json()["access_token"]


@pytest.mark.postgres
def test_login_wrong_password_returns_401(api_client, register_payload):
    """Criterio: datos incorrectos → error que el frontend puede mostrar."""
    assert api_client.post("/api/users/", json=register_payload).status_code == 201
    r = post_login(api_client, register_payload["username"], "mala_clave_xxx")
    assert r.status_code == 401
    assert r.json()["detail"] == "Credenciales incorrectas"


@pytest.mark.postgres
def test_login_unknown_user_returns_401(api_client):
    r = post_login(api_client, "no_existe", "secret12")
    assert r.status_code == 401
    assert r.json()["detail"] == "Credenciales incorrectas"


@pytest.mark.postgres
def test_me_requires_valid_access_token(api_client, register_payload):
    assert api_client.post("/api/users/", json=register_payload).status_code == 201
    lr = post_login(api_client, register_payload["username"], register_payload["password"])
    token = lr.json()["access_token"]
    me = api_client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == register_payload["email"]


@pytest.mark.postgres
def test_login_blocked_until_email_verified_when_config_enabled(
    api_client, register_payload, monkeypatch
):
    """Criterio extendido: si la política exige email verificado, 403 hasta verificar."""
    from app.core.config import get_settings

    monkeypatch.setenv("REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN", "true")
    get_settings.cache_clear()
    try:
        assert api_client.post("/api/users/", json=register_payload).status_code == 201
        r = post_login(api_client, register_payload["username"], register_payload["password"])
        assert r.status_code == 403
        assert "verificar" in r.json()["detail"].lower()
    finally:
        monkeypatch.delenv("REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN", raising=False)
        get_settings.cache_clear()


@pytest.mark.postgres
def test_refresh_blocked_when_verification_required_after_login_without_verify(
    api_client, register_payload, monkeypatch
):
    """Si después se exige email verificado, el refresh no debe renovar sesión sin verificar."""
    from app.core.config import get_settings

    assert api_client.post("/api/users/", json=register_payload).status_code == 201
    lr = post_login(api_client, register_payload["username"], register_payload["password"])
    assert lr.status_code == 200
    refresh = lr.json()["refresh_token"]

    monkeypatch.setenv("REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN", "true")
    get_settings.cache_clear()
    try:
        rr = api_client.post("/api/auth/refresh", json={"refresh_token": refresh})
        assert rr.status_code == 403
        assert "verificar" in rr.json()["detail"].lower()
    finally:
        monkeypatch.delenv("REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN", raising=False)
        get_settings.cache_clear()
