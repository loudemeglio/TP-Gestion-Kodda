"""Tests de notificaciones y calificación de compradores."""

from tests.conftest import build_product_payload, promote_to_admin, register_user_headers

VALID_BILLING = {
    "legal_name": "Juan Pérez",
    "tax_id": "20123456786",
    "tax_condition": "consumidor_final",
    "billing_address": "Av. Corrientes 1234",
}


from tests.conftest import build_product_payload, promote_to_admin, register_user_headers


def _register_and_token(client, username: str, email: str, password: str = "secret12"):
    return register_user_headers(client, username, email, password)


def _create_product(client, seller_headers, **overrides):
    suffix = __import__("uuid").uuid4().hex[:8]
    admin_h = register_user_headers(client, f"adm_{suffix}", f"adm_{suffix}@example.com")
    promote_to_admin(f"adm_{suffix}")
    body = build_product_payload(client, seller_headers, admin_h, **overrides)
    r = client.post("/api/catalog/products", json=body, headers=seller_headers)
    assert r.status_code == 201, r.text
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


def test_checkout_creates_seller_and_buyer_notifications(api_client):
    seller_h = _register_and_token(api_client, "notif_seller", "notif_seller@example.com")
    buyer_h = _register_and_token(api_client, "notif_buyer", "notif_buyer@example.com")
    product = _create_product(api_client, seller_h)
    api_client.post(f"/api/cart/items/{product['id']}", headers=buyer_h)
    order = _checkout(api_client, buyer_h)

    # Vendedor recibe notificación de venta confirmada
    r = api_client.get("/api/notifications", headers=seller_h)
    assert r.status_code == 200
    seller_notifs = r.json()
    seller_match = [n for n in seller_notifs if n["order_id"] == order["id"]]
    assert seller_match
    assert seller_match[0]["is_read"] is False
    assert "confirmada" in seller_match[0]["title"].lower() or "confirmada" in seller_match[0]["message"].lower()

    # Comprador también recibe notificación para calificar al vendedor
    r2 = api_client.get("/api/notifications", headers=buyer_h)
    assert r2.status_code == 200
    buyer_notifs = r2.json()
    buyer_match = [n for n in buyer_notifs if n["order_id"] == order["id"]]
    assert buyer_match
    assert buyer_match[0]["is_read"] is False
    assert "compra" in buyer_match[0]["title"].lower()


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
