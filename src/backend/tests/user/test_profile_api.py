"""Tests de perfil propio: GET/PATCH /me/profile y POST /me/avatar."""

import io

from tests.conftest import post_login


def _register_and_login(api_client, register_payload):
    assert api_client.post("/api/users/", json=register_payload).status_code == 201
    lr = post_login(api_client, register_payload["username"], register_payload["password"])
    assert lr.status_code == 200
    token = lr.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_get_my_profile_requires_auth(api_client):
    r = api_client.get("/api/users/me/profile")
    assert r.status_code == 401


def test_get_my_profile_returns_fields(api_client, register_payload):
    headers = _register_and_login(api_client, register_payload)
    r = api_client.get("/api/users/me/profile", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["username"] == register_payload["username"]
    assert data["email"] == register_payload["email"]
    assert "bio" in data
    assert "profile_image_url" in data
    assert "shoe_size" in data
    assert "top_size" in data
    assert "bottom_size" in data


def test_patch_my_profile_updates_fields(api_client, register_payload):
    headers = _register_and_login(api_client, register_payload)
    r = api_client.patch(
        "/api/users/me/profile",
        headers=headers,
        json={
            "bio": "Amante de la moda circular",
            "weight": 70.5,
            "height": 175,
            "shoe_size": "42",
            "top_size": "L",
            "bottom_size": "32",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["bio"] == "Amante de la moda circular"
    assert data["weight"] == 70.5
    assert data["height"] == 175
    assert data["shoe_size"] == "42"
    assert data["top_size"] == "L"
    assert data["bottom_size"] == "32"


def test_patch_my_profile_duplicate_username(api_client, register_payload):
    other = {
        "username": "other_user",
        "email": "other@example.com",
        "password": "secret12",
    }
    assert api_client.post("/api/users/", json=other).status_code == 201
    headers = _register_and_login(api_client, register_payload)
    r = api_client.patch(
        "/api/users/me/profile",
        headers=headers,
        json={"username": "other_user"},
    )
    assert r.status_code == 400
    assert "usuario" in r.json()["detail"].lower()


def test_upload_avatar_valid_image(api_client, register_payload):
    headers = _register_and_login(api_client, register_payload)
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    r = api_client.post(
        "/api/users/me/avatar",
        headers=headers,
        files={"file": ("avatar.png", io.BytesIO(png_bytes), "image/png")},
    )
    assert r.status_code == 200
    assert r.json()["profile_image_url"] == "/uploads/avatars/1.png"


def test_upload_avatar_rejects_non_image(api_client, register_payload):
    headers = _register_and_login(api_client, register_payload)
    r = api_client.post(
        "/api/users/me/avatar",
        headers=headers,
        files={"file": ("doc.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert r.status_code == 400
    assert "formato" in r.json()["detail"].lower() or "permitido" in r.json()["detail"].lower()


def test_upload_avatar_rejects_oversized(api_client, register_payload, monkeypatch):
    from app.core.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("AVATAR_MAX_BYTES", "10")
    get_settings.cache_clear()

    headers = _register_and_login(api_client, register_payload)
    r = api_client.post(
        "/api/users/me/avatar",
        headers=headers,
        files={"file": ("big.png", io.BytesIO(b"x" * 20), "image/png")},
    )
    assert r.status_code == 400
    assert "tamaño" in r.json()["detail"].lower() or "máximo" in r.json()["detail"].lower()

    get_settings.cache_clear()
