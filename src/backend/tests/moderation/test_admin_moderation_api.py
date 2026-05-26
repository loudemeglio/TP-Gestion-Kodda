from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.users.models import User, UserRole

from tests.conftest import post_login


VALID_BILLING = {
    "legal_name": "Juan Pérez",
    "tax_id": "20123456786",
    "tax_condition": "consumidor_final",
    "billing_address": "Av. Corrientes 1234",
}


def _register_and_token_admin(client, username: str, email: str, password: str = "secret12"):
    payload = {"username": username, "email": email, "password": password}
    assert client.post("/api/users/", json=payload).status_code == 201
    r = post_login(client, username, password)
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _promote_to_admin(username: str) -> None:
    db: Session = SessionLocal()
    try:
        u = db.query(User).filter(User.username == username).first()
        assert u is not None
        u.role = UserRole.ADMIN
        db.commit()
    finally:
        db.close()


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


def _save_billing(client, headers, payload=None):
    r = client.put("/api/users/me/billing", json=payload or VALID_BILLING, headers=headers)
    assert r.status_code == 200
    return r.json()


def _checkout(client, buyer_headers):
    _save_billing(client, buyer_headers)
    r = client.post(
        "/api/orders/checkout",
        json={"payment_method": "mercado_pago"},
        headers=buyer_headers,
    )
    assert r.status_code == 201
    return r.json()


def test_admin_flagged_users_created_at_default_limit(api_client):
    admin_h = _register_and_token_admin(api_client, "admin_a", "admin_a@example.com")
    _promote_to_admin("admin_a")

    admin2_h = _register_and_token_admin(api_client, "admin_b", "admin_b@example.com")
    _promote_to_admin("admin_b")

    seller_h = _register_and_token_admin(api_client, "seller_mod", "seller_mod@example.com")
    buyer_h = _register_and_token_admin(api_client, "buyer_mod", "buyer_mod@example.com")

    product = _create_product(api_client, seller_h)
    _add_to_cart(api_client, buyer_h, product["id"])
    order = _checkout(api_client, buyer_h)

    # Buyer reporta estafa al vendedor (is_scam_report=true)
    r = api_client.post(
        f"/api/ratings/orders/{order['id']}",
        json={
            "seller_id": product["seller_id"],
            "stars": 5,
            "description": "Comprador confiable, pago sin problemas.",
            "matches_description": True,
            "delivered_on_time": True,
            "is_scam_report": True,
        },
        headers=buyer_h,
    )
    assert r.status_code == 201

    flagged = api_client.get("/api/admin/flagged-users", headers=admin_h)
    assert flagged.status_code == 200
    rows = flagged.json()
    assert any(u["username"] == "seller_mod" for u in rows)
    seller_row = next(u for u in rows if u["username"] == "seller_mod")
    assert seller_row["report_count"] >= 1
    assert seller_row["needs_review"] is True

    # Cada admin recibe una notificación interna
    n1 = api_client.get("/api/notifications", headers=admin_h).json()
    assert any("revisión administrativa" in x["title"].lower() for x in n1)
    n2 = api_client.get("/api/notifications", headers=admin2_h).json()
    assert any("revisión administrativa" in x["title"].lower() for x in n2)

    # Resolver el flag
    r2 = api_client.put(f"/api/admin/users/{seller_row['id']}/resolve", headers=admin_h)
    assert r2.status_code == 200
    assert r2.json()["needs_review"] is False


def test_admin_flagged_users_respects_dynamic_limit(api_client):
    admin_h = _register_and_token_admin(api_client, "admin_limit", "admin_limit@example.com")
    _promote_to_admin("admin_limit")

    seller_h = _register_and_token_admin(api_client, "seller_limit", "seller_limit@example.com")
    buyer_h = _register_and_token_admin(api_client, "buyer_limit", "buyer_limit@example.com")

    # Setear max_scam_reports=2
    rset = api_client.put("/api/admin/settings", json={"max_scam_reports": 2}, headers=admin_h)
    assert rset.status_code == 200
    assert rset.json()["max_scam_reports"] == 2

    # Orden 1
    product1 = _create_product(api_client, seller_h)
    _add_to_cart(api_client, buyer_h, product1["id"])
    order1 = _checkout(api_client, buyer_h)
    r1 = api_client.post(
        f"/api/ratings/orders/{order1['id']}",
        json={
            "seller_id": product1["seller_id"],
            "stars": 5,
            "description": "Reporte de estafa número 1, validación OK.",
            "matches_description": True,
            "delivered_on_time": True,
            "is_scam_report": True,
        },
        headers=buyer_h,
    )
    assert r1.status_code == 201

    flagged = api_client.get("/api/admin/flagged-users", headers=admin_h).json()
    assert not any(u["username"] == "seller_limit" for u in flagged)

    # Orden 2
    product2 = _create_product(api_client, seller_h, name="Remera test 2")
    _add_to_cart(api_client, buyer_h, product2["id"])
    order2 = _checkout(api_client, buyer_h)
    r2 = api_client.post(
        f"/api/ratings/orders/{order2['id']}",
        json={
            "seller_id": product2["seller_id"],
            "stars": 5,
            "description": "Reporte de estafa número 2, validación OK.",
            "matches_description": True,
            "delivered_on_time": True,
            "is_scam_report": True,
        },
        headers=buyer_h,
    )
    assert r2.status_code == 201

    flagged2 = api_client.get("/api/admin/flagged-users", headers=admin_h).json()
    assert any(u["username"] == "seller_limit" for u in flagged2)

