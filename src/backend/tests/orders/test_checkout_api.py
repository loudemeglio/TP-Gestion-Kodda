"""Tests de checkout: POST /api/orders/checkout."""

from tests.conftest import build_product_payload, promote_to_admin, register_user_headers


VALID_TAX_ID = "20123456786"

VALID_BILLING = {
    "legal_name": "Juan Pérez",
    "tax_id": VALID_TAX_ID,
    "tax_condition": "consumidor_final",
    "billing_address": "Av. Corrientes 1234",
}


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


def _add_to_cart(client, buyer_headers, product_id: int):
    r = client.post(f"/api/cart/items/{product_id}", headers=buyer_headers)
    assert r.status_code == 200


def _save_billing(client, headers, payload=None):
    r = client.put("/api/users/me/billing", json=payload or VALID_BILLING, headers=headers)
    assert r.status_code == 200
    return r.json()


def _checkout_payload(payment_method="mercado_pago", billing=None):
    payload = {"payment_method": payment_method}
    if billing is not None:
        payload["billing"] = billing
    return payload


def test_checkout_requires_auth(api_client):
    r = api_client.post("/api/orders/checkout", json=_checkout_payload())
    assert r.status_code == 401


def test_checkout_missing_payment_method(api_client):
    seller_h = _register_and_token(api_client, "seller_pm", "seller_pm@example.com")
    buyer_h = _register_and_token(api_client, "buyer_pm", "buyer_pm@example.com")
    _save_billing(api_client, buyer_h)
    product = _create_product(api_client, seller_h)
    _add_to_cart(api_client, buyer_h, product["id"])

    r = api_client.post("/api/orders/checkout", json={}, headers=buyer_h)
    assert r.status_code == 422


def test_checkout_invalid_payment_method(api_client):
    seller_h = _register_and_token(api_client, "seller_ipm", "seller_ipm@example.com")
    buyer_h = _register_and_token(api_client, "buyer_ipm", "buyer_ipm@example.com")
    _save_billing(api_client, buyer_h)
    product = _create_product(api_client, seller_h)
    _add_to_cart(api_client, buyer_h, product["id"])

    r = api_client.post(
        "/api/orders/checkout",
        json=_checkout_payload(payment_method="bitcoin"),
        headers=buyer_h,
    )
    assert r.status_code == 422


def test_checkout_transferencia_not_allowed(api_client):
    seller_h = _register_and_token(api_client, "seller_tr", "seller_tr@example.com")
    buyer_h = _register_and_token(api_client, "buyer_tr", "buyer_tr@example.com")
    _save_billing(api_client, buyer_h)
    product = _create_product(api_client, seller_h)
    _add_to_cart(api_client, buyer_h, product["id"])

    r = api_client.post(
        "/api/orders/checkout",
        json=_checkout_payload(payment_method="transferencia"),
        headers=buyer_h,
    )
    assert r.status_code == 422


def test_checkout_empty_cart(api_client):
    headers = _register_and_token(api_client, "buyer_empty", "buyer_empty@example.com")
    _save_billing(api_client, headers)
    r = api_client.post("/api/orders/checkout", json=_checkout_payload(), headers=headers)
    assert r.status_code == 400
    assert "carrito" in r.json()["detail"].lower()


def test_checkout_without_billing(api_client):
    seller_h = _register_and_token(api_client, "seller_nb", "seller_nb@example.com")
    buyer_h = _register_and_token(api_client, "buyer_nb", "buyer_nb@example.com")
    product = _create_product(api_client, seller_h)
    _add_to_cart(api_client, buyer_h, product["id"])

    r = api_client.post("/api/orders/checkout", json=_checkout_payload(), headers=buyer_h)
    assert r.status_code == 400
    assert "facturación" in r.json()["detail"].lower()


def test_checkout_with_billing_in_body(api_client):
    seller_h = _register_and_token(api_client, "seller_b1", "seller_b1@example.com")
    buyer_h = _register_and_token(api_client, "buyer_b1", "buyer_b1@example.com")
    product = _create_product(api_client, seller_h, price=10000)
    _add_to_cart(api_client, buyer_h, product["id"])

    r = api_client.post(
        "/api/orders/checkout",
        json=_checkout_payload(billing=VALID_BILLING),
        headers=buyer_h,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["total"] == 10000
    assert data["payment_method"] == "mercado_pago"
    assert data["invoice"]["tax_id"] == VALID_TAX_ID
    assert len(data["items"]) == 1

    cart = api_client.get("/api/cart", headers=buyer_h)
    assert cart.json()["items"] == []


def test_checkout_with_saved_billing_and_mercado_pago(api_client):
    seller_h = _register_and_token(api_client, "seller_b2", "seller_b2@example.com")
    buyer_h = _register_and_token(api_client, "buyer_b2", "buyer_b2@example.com")
    _save_billing(api_client, buyer_h)
    product = _create_product(api_client, seller_h)
    _add_to_cart(api_client, buyer_h, product["id"])

    r = api_client.post(
        "/api/orders/checkout",
        json=_checkout_payload(payment_method="mercado_pago"),
        headers=buyer_h,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["payment_method"] == "mercado_pago"
    assert data["invoice"]["legal_name"] == VALID_BILLING["legal_name"]

    detail = api_client.get(f"/api/orders/{data['id']}", headers=buyer_h)
    assert detail.status_code == 200
    assert detail.json()["payment_method"] == "mercado_pago"


def test_checkout_insufficient_stock(api_client):
    seller_h = _register_and_token(api_client, "seller_st", "seller_st@example.com")
    buyer_h = _register_and_token(api_client, "buyer_st", "buyer_st@example.com")
    _save_billing(api_client, buyer_h)
    product = _create_product(api_client, seller_h, stock=1)
    _add_to_cart(api_client, buyer_h, product["id"])
    api_client.patch(
        f"/api/cart/items/{product['id']}",
        json={"cantidad": 3},
        headers=buyer_h,
    )

    r = api_client.post("/api/orders/checkout", json=_checkout_payload(), headers=buyer_h)
    assert r.status_code == 400
    assert "stock" in r.json()["detail"].lower()


def test_checkout_own_product_rejected(api_client):
    seller_h = _register_and_token(api_client, "seller_own", "seller_own@example.com")
    _save_billing(api_client, seller_h)
    product = _create_product(api_client, seller_h)
    _add_to_cart(api_client, seller_h, product["id"])

    r = api_client.post("/api/orders/checkout", json=_checkout_payload(), headers=seller_h)
    assert r.status_code == 400
    assert "propias" in r.json()["detail"].lower()


def test_invoice_snapshot_immutable_after_billing_change(api_client):
    seller_h = _register_and_token(api_client, "seller_sn", "seller_sn@example.com")
    buyer_h = _register_and_token(api_client, "buyer_sn", "buyer_sn@example.com")
    _save_billing(api_client, buyer_h)
    product = _create_product(api_client, seller_h)
    _add_to_cart(api_client, buyer_h, product["id"])

    first = api_client.post("/api/orders/checkout", json=_checkout_payload(), headers=buyer_h)
    assert first.status_code == 201
    order1_id = first.json()["id"]
    assert first.json()["invoice"]["legal_name"] == "Juan Pérez"

    updated_billing = {**VALID_BILLING, "legal_name": "María Actualizada"}
    api_client.put("/api/users/me/billing", json=updated_billing, headers=buyer_h)

    product2 = _create_product(api_client, seller_h, name="Otra prenda")
    _add_to_cart(api_client, buyer_h, product2["id"])
    second = api_client.post("/api/orders/checkout", json=_checkout_payload(), headers=buyer_h)
    assert second.status_code == 201
    assert second.json()["invoice"]["legal_name"] == "María Actualizada"

    old_order = api_client.get(f"/api/orders/{order1_id}", headers=buyer_h)
    assert old_order.status_code == 200
    assert old_order.json()["invoice"]["legal_name"] == "Juan Pérez"


def test_get_order_not_found(api_client):
    headers = _register_and_token(api_client, "buyer_nf", "buyer_nf@example.com")
    r = api_client.get("/api/orders/99999", headers=headers)
    assert r.status_code == 404
