"""Tests de payment intents: QR / billetera virtual."""

from datetime import datetime, timedelta, timezone

from tests.conftest import post_login

VALID_BILLING = {
    "legal_name": "Juan Pérez",
    "tax_id": "20123456786",
    "tax_condition": "consumidor_final",
    "billing_address": "Av. Corrientes 1234",
}


def _register_and_token(client, username: str, email: str, password: str = "secret12"):
    payload = {"username": username, "email": email, "password": password}
    assert client.post("/api/users/", json=payload).status_code == 201
    r = post_login(client, username, password)
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _create_product(client, seller_headers, **overrides):
    body = {
        "name": "Remera test",
        "description": "Descripción",
        "price": 5000,
        "stock": 5,
        "category": "Remeras",
        "size": "M",
        "main_image_url": None,
    }
    body.update(overrides)
    r = client.post("/api/catalog/products", json=body, headers=seller_headers)
    assert r.status_code == 201
    return r.json()


def _add_to_cart(client, buyer_headers, product_id: int):
    r = client.post(f"/api/cart/items/{product_id}", headers=buyer_headers)
    assert r.status_code == 200


def test_create_intent_requires_auth(api_client):
    r = api_client.post("/api/payments/intents")
    assert r.status_code == 401


def test_create_intent_empty_cart(api_client):
    headers = _register_and_token(api_client, "pi_empty", "pi_empty@example.com")
    r = api_client.post("/api/payments/intents", headers=headers)
    assert r.status_code == 400
    assert "carrito" in r.json()["detail"].lower()


def test_create_approve_and_status(api_client):
    seller_h = _register_and_token(api_client, "pi_seller", "pi_seller@example.com")
    buyer_h = _register_and_token(api_client, "pi_buyer", "pi_buyer@example.com")
    product = _create_product(api_client, seller_h, price=12000)
    _add_to_cart(api_client, buyer_h, product["id"])

    created = api_client.post("/api/payments/intents", headers=buyer_h)
    assert created.status_code == 201
    data = created.json()
    assert data["amount"] == 12000
    assert data["status"] == "pending"
    assert data["token"]
    assert data["payment_url"].endswith(f"/pagar/{data['token']}")

    token = data["token"]
    pending = api_client.get(f"/api/payments/intents/{token}/status")
    assert pending.status_code == 200
    assert pending.json()["status"] == "pending"

    approved = api_client.post(f"/api/payments/intents/{token}/approve")
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"

    status = api_client.get(f"/api/payments/intents/{token}/status")
    assert status.status_code == 200
    assert status.json()["status"] == "approved"

    again = api_client.post(f"/api/payments/intents/{token}/approve")
    assert again.status_code == 200
    assert again.json()["status"] == "approved"


def test_status_not_found(api_client):
    r = api_client.get("/api/payments/intents/00000000-0000-0000-0000-000000000099/status")
    assert r.status_code == 404


def test_approve_expired_intent(api_client):
    from app.core.database import SessionLocal
    from app.payments.repositories.payment_intent_repository import PaymentIntentRepository

    seller_h = _register_and_token(api_client, "pi_exp_s", "pi_exp_s@example.com")
    buyer_h = _register_and_token(api_client, "pi_exp_b", "pi_exp_b@example.com")
    product = _create_product(api_client, seller_h)
    _add_to_cart(api_client, buyer_h, product["id"])

    created = api_client.post("/api/payments/intents", headers=buyer_h)
    token = created.json()["token"]

    db = SessionLocal()
    try:
        intent = PaymentIntentRepository.get_by_token(db, token)
        intent.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
    finally:
        db.close()

    r = api_client.post(f"/api/payments/intents/{token}/approve")
    assert r.status_code == 410
