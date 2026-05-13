"""Bloqueo (admin): email + mensaje en login; sesión invalidada en /me y refresh."""

from unittest.mock import patch

import pytest

from app.core.database import SessionLocal
from app.users.models import User, UserRole

from tests.conftest import post_login


def _promote_to_admin(username: str) -> None:
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.username == username).first()
        assert u is not None
        u.role = UserRole.ADMIN
        db.commit()
    finally:
        db.close()


def _set_user_inactive(username: str, status_message: str) -> None:
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.username == username).first()
        assert u is not None
        u.is_active = False
        u.status_message = status_message
        db.commit()
    finally:
        db.close()


@pytest.mark.postgres
def test_login_inactive_user_shows_status_message(api_client, register_payload):
    assert api_client.post("/api/users/", json=register_payload).status_code == 201
    msg = "Reporte del equipo: incumplimiento de normas de publicación."
    _set_user_inactive(register_payload["username"], msg)
    r = post_login(api_client, register_payload["username"], register_payload["password"])
    assert r.status_code == 403
    assert r.json()["detail"] == msg


@pytest.mark.postgres
def test_block_schedules_send_email(api_client):
    admin_payload = {
        "username": "status_admin",
        "email": "status_admin@example.com",
        "password": "secret12",
    }
    victim_payload = {
        "username": "status_victim",
        "email": "status_victim@example.com",
        "password": "secret12",
    }
    assert api_client.post("/api/users/", json=admin_payload).status_code == 201
    _promote_to_admin(admin_payload["username"])
    assert api_client.post("/api/users/", json=victim_payload).status_code == 201

    lr = post_login(api_client, admin_payload["username"], admin_payload["password"])
    assert lr.status_code == 200
    token = lr.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        victim = db.query(User).filter(User.username == victim_payload["username"]).first()
        victim_id = victim.id
    finally:
        db.close()

    with patch("app.users.routes.users.send_email") as mock_send:
        r = api_client.patch(
            f"/api/users/{victim_id}/status",
            json={"action": "block", "reason": "Contenido no permitido"},
            headers=headers,
        )
        assert r.status_code == 200

    mock_send.assert_called_once()
    args, _kwargs = mock_send.call_args
    assert args[0] == victim_payload["email"]
    assert "bloquead" in args[1].lower()
    assert "Contenido no permitido" in args[2]
    assert victim_payload["username"] in args[2]


@pytest.mark.postgres
def test_admin_cannot_block_self(api_client):
    admin_payload = {
        "username": "self_block_admin",
        "email": "self_block_admin@example.com",
        "password": "secret12",
    }
    assert api_client.post("/api/users/", json=admin_payload).status_code == 201
    _promote_to_admin(admin_payload["username"])
    lr = post_login(api_client, admin_payload["username"], admin_payload["password"])
    token = lr.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        uid = db.query(User).filter(User.username == admin_payload["username"]).first().id
    finally:
        db.close()

    r = api_client.patch(
        f"/api/users/{uid}/status",
        json={"action": "block", "reason": "test"},
        headers=headers,
    )
    assert r.status_code == 400
    assert "propia" in r.json()["detail"].lower()


@pytest.mark.postgres
def test_unblock_allows_login_again(api_client):
    admin_payload = {
        "username": "unblock_admin",
        "email": "unblock_admin@example.com",
        "password": "secret12",
    }
    victim_payload = {
        "username": "unblock_victim",
        "email": "unblock_victim@example.com",
        "password": "secret12",
    }
    assert api_client.post("/api/users/", json=admin_payload).status_code == 201
    _promote_to_admin(admin_payload["username"])
    assert api_client.post("/api/users/", json=victim_payload).status_code == 201

    lr = post_login(api_client, admin_payload["username"], admin_payload["password"])
    headers = {"Authorization": f"Bearer {lr.json()['access_token']}"}

    db = SessionLocal()
    try:
        vid = db.query(User).filter(User.username == victim_payload["username"]).first().id
    finally:
        db.close()

    assert (
        api_client.patch(
            f"/api/users/{vid}/status",
            json={"action": "block", "reason": "x"},
            headers=headers,
        ).status_code
        == 200
    )
    assert post_login(api_client, victim_payload["username"], victim_payload["password"]).status_code == 403

    assert (
        api_client.patch(
            f"/api/users/{vid}/status",
            json={"action": "unblock"},
            headers=headers,
        ).status_code
        == 200
    )
    ok = post_login(api_client, victim_payload["username"], victim_payload["password"])
    assert ok.status_code == 200
    assert ok.json().get("access_token")


@pytest.mark.postgres
def test_me_returns_401_when_user_blocked_while_session_valid(api_client):
    admin_payload = {
        "username": "kick_admin",
        "email": "kick_admin@example.com",
        "password": "secret12",
    }
    victim_payload = {
        "username": "kick_victim",
        "email": "kick_victim@example.com",
        "password": "secret12",
    }
    assert api_client.post("/api/users/", json=admin_payload).status_code == 201
    _promote_to_admin(admin_payload["username"])
    assert api_client.post("/api/users/", json=victim_payload).status_code == 201

    vr = post_login(api_client, victim_payload["username"], victim_payload["password"])
    assert vr.status_code == 200
    victim_headers = {"Authorization": f"Bearer {vr.json()['access_token']}"}
    assert api_client.get("/api/auth/me", headers=victim_headers).status_code == 200

    ar = post_login(api_client, admin_payload["username"], admin_payload["password"])
    admin_headers = {"Authorization": f"Bearer {ar.json()['access_token']}"}
    db = SessionLocal()
    try:
        vid = db.query(User).filter(User.username == victim_payload["username"]).first().id
    finally:
        db.close()

    assert (
        api_client.patch(
            f"/api/users/{vid}/status",
            json={"action": "block", "reason": "Prueba de sesión"},
            headers=admin_headers,
        ).status_code
        == 200
    )
    me = api_client.get("/api/auth/me", headers=victim_headers)
    assert me.status_code == 401
    assert "bloqueada" in me.json()["detail"].lower()
