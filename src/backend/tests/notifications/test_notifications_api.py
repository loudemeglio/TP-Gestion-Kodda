"""Tests de notificaciones y calificación de compradores."""

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


def _checkout(client, buyer_headers):
    r = client.put("/api/users/me/billing", json=VALID_BILLING, headers=buyer_headers)
    assert r.status_code == 200
    r = client.post(
        "/api/orders/checkout",
        json={"payment_method": "mercado_pago"},
        headers=buyer_headers,
    )
    assert r.status_code == 201
    return r.json()


def test_checkout_creates_seller_notification(api_client):
    seller_h = _register_and_token(api_client, "notif_seller", "notif_seller@example.com")
    buyer_h = _register_and_token(api_client, "notif_buyer", "notif_buyer@example.com")
    product = _create_product(api_client, seller_h)
    api_client.post(f"/api/cart/items/{product['id']}", headers=buyer_h)
    order = _checkout(api_client, buyer_h)

    r = api_client.get("/api/notifications", headers=seller_h)
    assert r.status_code == 200
    notifs = r.json()
    assert len(notifs) >= 1
    match = [n for n in notifs if n["order_id"] == order["id"]]
    assert match
    assert match[0]["is_read"] is False
    assert "confirmada" in match[0]["title"].lower() or "confirmada" in match[0]["message"].lower()


def test_mark_notification_read_and_rate_buyer(api_client):
    seller_h = _register_and_token(api_client, "rate_seller", "rate_seller@example.com")
    buyer_h = _register_and_token(api_client, "rate_buyer", "rate_buyer@example.com")
    product = _create_product(api_client, seller_h)
    api_client.post(f"/api/cart/items/{product['id']}", headers=buyer_h)
    order = _checkout(api_client, buyer_h)

    notifs = api_client.get("/api/notifications", headers=seller_h).json()
    notif_id = notifs[0]["id"]
    r = api_client.put(f"/api/notifications/{notif_id}/read", headers=seller_h)
    assert r.status_code == 200
    assert r.json()["is_read"] is True

    sale = api_client.get(f"/api/orders/sales/{order['id']}", headers=seller_h)
    assert sale.status_code == 200
    assert sale.json()["buyer_rated"] is False

    r = api_client.post(
        f"/api/buyer-reviews/orders/{order['id']}",
        json={"stars": 5, "comment": "Comprador confiable, pago sin problemas."},
        headers=seller_h,
    )
    assert r.status_code == 201

    sale2 = api_client.get(f"/api/orders/sales/{order['id']}", headers=seller_h)
    assert sale2.json()["buyer_rated"] is True

    dup = api_client.post(
        f"/api/buyer-reviews/orders/{order['id']}",
        json={"stars": 4, "comment": "Otro comentario duplicado."},
        headers=seller_h,
    )
    assert dup.status_code == 400

    rep = api_client.get(f"/api/buyer-reviews/buyers/{order['user_id']}", headers=seller_h)
    assert rep.status_code == 200
    data = rep.json()
    assert data["review_count"] == 1
    assert data["average_stars"] == 5.0
