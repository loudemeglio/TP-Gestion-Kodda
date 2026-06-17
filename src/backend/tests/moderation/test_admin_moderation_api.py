from tests.conftest import build_product_payload, promote_to_admin, register_user_headers

VALID_BILLING = {
    "legal_name": "Juan Pérez",
    "tax_id": "20123456786",
    "tax_condition": "consumidor_final",
    "billing_address": "Av. Corrientes 1234",
}


def _register_and_token_admin(client, username: str, email: str, password: str = "secret12"):
    return register_user_headers(client, username, email, password)


def _promote_to_admin(username: str) -> None:
    promote_to_admin(username)


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
    assert seller_row["flag_reason"] == "estafa"

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
    rset = api_client.put(
        "/api/admin/settings",
        json={"max_scam_reports": 2, "min_bad_ratings": 2, "max_stars": 2},
        headers=admin_h,
    )
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


def _rate_seller(client, buyer_headers, order, seller_id, *, stars=2):
    return client.post(
        f"/api/ratings/orders/{order['id']}",
        json={
            "seller_id": seller_id,
            "stars": stars,
            "description": "Experiencia negativa con el producto recibido.",
            "matches_description": False,
            "delivered_on_time": False,
            "is_scam_report": False,
        },
        headers=buyer_headers,
    )


def _rate_buyer(client, seller_headers, order_id, *, stars=1):
    return client.post(
        f"/api/buyer-reviews/orders/{order_id}",
        json={
            "stars": stars,
            "comment": "Comprador problemático en esta transacción.",
        },
        headers=seller_headers,
    )


def test_admin_settings_include_bad_rating_thresholds(api_client):
    admin_h = _register_and_token_admin(api_client, "admin_settings", "admin_settings@example.com")
    _promote_to_admin("admin_settings")

    settings = api_client.get("/api/admin/settings", headers=admin_h)
    assert settings.status_code == 200
    data = settings.json()
    assert data["min_bad_ratings"] == 2
    assert data["max_stars"] == 2


def test_product_bad_feedback_notifies_admins_at_threshold(api_client):
    admin_h = _register_and_token_admin(api_client, "admin_prod", "admin_prod@example.com")
    _promote_to_admin("admin_prod")

    seller_h = _register_and_token_admin(api_client, "seller_prod", "seller_prod@example.com")
    buyer1_h = _register_and_token_admin(api_client, "buyer1_prod", "buyer1_prod@example.com")
    buyer2_h = _register_and_token_admin(api_client, "buyer2_prod", "buyer2_prod@example.com")
    buyer3_h = _register_and_token_admin(api_client, "buyer3_prod", "buyer3_prod@example.com")

    product = _create_product(api_client, seller_h, stock=5)

    _add_to_cart(api_client, buyer1_h, product["id"])
    order1 = _checkout(api_client, buyer1_h)
    r1 = _rate_seller(api_client, buyer1_h, order1, product["seller_id"])
    assert r1.status_code == 201

    notifs_after_one = api_client.get("/api/notifications", headers=admin_h).json()
    assert not any("publicación" in n["title"].lower() for n in notifs_after_one)

    _add_to_cart(api_client, buyer2_h, product["id"])
    order2 = _checkout(api_client, buyer2_h)
    r2 = _rate_seller(api_client, buyer2_h, order2, product["seller_id"])
    assert r2.status_code == 201

    notifs_after_two = api_client.get("/api/notifications", headers=admin_h).json()
    product_alerts = [n for n in notifs_after_two if "publicación" in n["title"].lower()]
    assert len(product_alerts) == 1
    assert product["id"] == product_alerts[0]["product_id"]

    bad_feedback = api_client.get(
        "/api/admin/products/bad-feedback?min_bad_ratings=2&max_stars=2",
        headers=admin_h,
    )
    assert bad_feedback.status_code == 200
    rows = bad_feedback.json()
    assert any(p["product_id"] == product["id"] and p["needs_review"] is True for p in rows)

    _add_to_cart(api_client, buyer3_h, product["id"])
    order3 = _checkout(api_client, buyer3_h)
    r3 = _rate_seller(api_client, buyer3_h, order3, product["seller_id"])
    assert r3.status_code == 201

    notifs_after_three = api_client.get("/api/notifications", headers=admin_h).json()
    product_alerts_after_three = [n for n in notifs_after_three if "publicación" in n["title"].lower()]
    assert len(product_alerts_after_three) == 1


def test_buyer_bad_reviews_notify_admins_at_threshold(api_client):
    admin_h = _register_and_token_admin(api_client, "admin_buyer", "admin_buyer@example.com")
    _promote_to_admin("admin_buyer")

    seller1_h = _register_and_token_admin(api_client, "seller1_buyer", "seller1_buyer@example.com")
    seller2_h = _register_and_token_admin(api_client, "seller2_buyer", "seller2_buyer@example.com")
    buyer_h = _register_and_token_admin(api_client, "buyer_flag", "buyer_flag@example.com")

    product1 = _create_product(api_client, seller1_h, name="Producto seller 1")
    product2 = _create_product(api_client, seller2_h, name="Producto seller 2")

    _add_to_cart(api_client, buyer_h, product1["id"])
    order1 = _checkout(api_client, buyer_h)
    r1 = _rate_buyer(api_client, seller1_h, order1["id"])
    assert r1.status_code == 201

    notifs_after_one = api_client.get("/api/notifications", headers=admin_h).json()
    assert not any("comprador" in n["title"].lower() for n in notifs_after_one)

    _add_to_cart(api_client, buyer_h, product2["id"])
    order2 = _checkout(api_client, buyer_h)
    r2 = _rate_buyer(api_client, seller2_h, order2["id"])
    assert r2.status_code == 201

    notifs_after_two = api_client.get("/api/notifications", headers=admin_h).json()
    buyer_alerts = [n for n in notifs_after_two if "comprador" in n["title"].lower()]
    assert len(buyer_alerts) == 1

    flagged = api_client.get("/api/admin/flagged-users", headers=admin_h).json()
    buyer_row = next(u for u in flagged if u["username"] == "buyer_flag")
    assert buyer_row["bad_review_count"] >= 2
    assert buyer_row["flag_reason"] == "reseñas_negativas"
    assert buyer_row["needs_review"] is True

