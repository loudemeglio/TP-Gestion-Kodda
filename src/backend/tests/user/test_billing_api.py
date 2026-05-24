"""Tests de datos de facturación: GET/PUT /me/billing."""

from tests.conftest import post_login

# CUIT válido de prueba (20-12345678-6)
VALID_TAX_ID = "20123456786"

VALID_BILLING_PAYLOAD = {
    "legal_name": "Juan Pérez",
    "tax_id": VALID_TAX_ID,
    "tax_condition": "consumidor_final",
    "billing_address": "Av. Corrientes 1234, CABA",
    "city": "Buenos Aires",
    "province": "CABA",
    "postal_code": "1043",
}


def _register_and_login(api_client, register_payload):
    assert api_client.post("/api/users/", json=register_payload).status_code == 201
    lr = post_login(api_client, register_payload["username"], register_payload["password"])
    assert lr.status_code == 200
    token = lr.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_get_my_billing_requires_auth(api_client):
    r = api_client.get("/api/users/me/billing")
    assert r.status_code == 401


def test_get_my_billing_not_found(api_client, register_payload):
    headers = _register_and_login(api_client, register_payload)
    r = api_client.get("/api/users/me/billing", headers=headers)
    assert r.status_code == 404
    assert "facturación" in r.json()["detail"].lower()


def test_put_my_billing_incomplete_body(api_client, register_payload):
    headers = _register_and_login(api_client, register_payload)
    r = api_client.put(
        "/api/users/me/billing",
        headers=headers,
        json={"legal_name": "Juan Pérez"},
    )
    assert r.status_code == 422


def test_put_my_billing_invalid_tax_id(api_client, register_payload):
    headers = _register_and_login(api_client, register_payload)
    r = api_client.put(
        "/api/users/me/billing",
        headers=headers,
        json={**VALID_BILLING_PAYLOAD, "tax_id": "123"},
    )
    assert r.status_code == 400
    assert "cuit" in r.json()["detail"].lower()


def test_put_my_billing_creates_record(api_client, register_payload):
    headers = _register_and_login(api_client, register_payload)
    r = api_client.put(
        "/api/users/me/billing",
        headers=headers,
        json=VALID_BILLING_PAYLOAD,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["legal_name"] == VALID_BILLING_PAYLOAD["legal_name"]
    assert data["tax_id"] == VALID_TAX_ID
    assert data["tax_condition"] == "consumidor_final"
    assert data["billing_address"] == VALID_BILLING_PAYLOAD["billing_address"]
    assert data["city"] == "Buenos Aires"
    assert data["billing_email"] == register_payload["email"]


def test_put_my_billing_updates_existing(api_client, register_payload):
    headers = _register_and_login(api_client, register_payload)
    assert (
        api_client.put(
            "/api/users/me/billing",
            headers=headers,
            json=VALID_BILLING_PAYLOAD,
        ).status_code
        == 200
    )

    updated = {
        **VALID_BILLING_PAYLOAD,
        "legal_name": "Juan Carlos Pérez",
        "tax_condition": "monotributo",
        "billing_email": "factura@example.com",
    }
    r = api_client.put("/api/users/me/billing", headers=headers, json=updated)
    assert r.status_code == 200
    data = r.json()
    assert data["legal_name"] == "Juan Carlos Pérez"
    assert data["tax_condition"] == "monotributo"
    assert data["billing_email"] == "factura@example.com"


def test_get_my_billing_after_save(api_client, register_payload):
    headers = _register_and_login(api_client, register_payload)
    assert (
        api_client.put(
            "/api/users/me/billing",
            headers=headers,
            json=VALID_BILLING_PAYLOAD,
        ).status_code
        == 200
    )

    r = api_client.get("/api/users/me/billing", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["legal_name"] == VALID_BILLING_PAYLOAD["legal_name"]
    assert data["tax_id"] == VALID_TAX_ID
