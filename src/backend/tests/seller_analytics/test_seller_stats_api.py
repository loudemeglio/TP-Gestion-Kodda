"""Tests de estadísticas de ventas del vendedor."""

from datetime import datetime, timedelta, timezone


def _utc_today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()

from tests.conftest import build_product_payload, promote_to_admin, register_user_headers

VALID_BILLING = {
    "legal_name": "Juan Pérez",
    "tax_id": "20123456786",
    "tax_condition": "consumidor_final",
    "billing_address": "Av. Corrientes 1234",
}


def _register(client, username: str, email: str) -> dict:
    return register_user_headers(client, username, email)


def _save_billing(client, headers):
    r = client.put("/api/users/me/billing", json=VALID_BILLING, headers=headers)
    assert r.status_code == 200


def _create_product(client, seller_h, **overrides):
    suffix = __import__("uuid").uuid4().hex[:8]
    admin_h = register_user_headers(client, f"adm_{suffix}", f"adm_{suffix}@example.com")
    promote_to_admin(f"adm_{suffix}")
    body = build_product_payload(client, seller_h, admin_h, **overrides)
    r = client.post("/api/catalog/products", json=body, headers=seller_h)
    assert r.status_code == 201, r.text
    return r.json()


def _checkout(client, buyer_h, seller_h, **product_kw):
    _save_billing(client, buyer_h)
    product = _create_product(client, seller_h, **product_kw)
    r = client.post(f"/api/cart/items/{product['id']}", headers=buyer_h)
    assert r.status_code == 200
    r = client.post(
        "/api/orders/checkout",
        json={"payment_method": "mercado_pago"},
        headers=buyer_h,
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_seller_stats_requires_auth(api_client):
    r = api_client.get("/api/seller/stats/summary")
    assert r.status_code == 401


def test_seller_stats_summary_after_sale(api_client):
    seller_h = _register(api_client, "stats_seller", "stats_seller@example.com")
    buyer_h = _register(api_client, "stats_buyer", "stats_buyer@example.com")
    _checkout(api_client, buyer_h, seller_h, price=10000, name="Remera Azul")

    today = _utc_today_iso()
    r = api_client.get(
        "/api/seller/stats/summary",
        params={"from": today, "to": today},
        headers=seller_h,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["total_revenue"] == 10000
    assert data["order_count"] == 1
    assert data["units_sold"] == 1
    assert len(data["top_products"]) == 1
    assert data["top_products"][0]["product_name"] == "Remera Azul"


def test_seller_stats_isolation_between_sellers(api_client):
    seller_a = _register(api_client, "stats_sa", "stats_sa@example.com")
    seller_b = _register(api_client, "stats_sb", "stats_sb@example.com")
    buyer_h = _register(api_client, "stats_buyer2", "stats_buyer2@example.com")
    _checkout(api_client, buyer_h, seller_a, price=5000)

    today = _utc_today_iso()
    r = api_client.get(
        "/api/seller/stats/summary",
        params={"from": today, "to": today},
        headers=seller_b,
    )
    assert r.status_code == 200
    assert r.json()["total_revenue"] == 0
    assert r.json()["order_count"] == 0


def test_seller_stats_multi_seller_order_only_counts_own_lines(api_client):
    seller_a = _register(api_client, "stats_ma", "stats_ma@example.com")
    seller_b = _register(api_client, "stats_mb", "stats_mb@example.com")
    buyer_h = _register(api_client, "stats_mb_buyer", "stats_mb_buyer@example.com")
    _save_billing(api_client, buyer_h)

    p_a = _create_product(api_client, seller_a, price=3000, name="Prod A")
    p_b = _create_product(api_client, seller_b, price=7000, name="Prod B")
    api_client.post(f"/api/cart/items/{p_a['id']}", headers=buyer_h)
    api_client.post(f"/api/cart/items/{p_b['id']}", headers=buyer_h)
    r = api_client.post(
        "/api/orders/checkout",
        json={"payment_method": "mercado_pago"},
        headers=buyer_h,
    )
    assert r.status_code == 201

    today = _utc_today_iso()
    summary_a = api_client.get(
        "/api/seller/stats/summary",
        params={"from": today, "to": today},
        headers=seller_a,
    ).json()
    summary_b = api_client.get(
        "/api/seller/stats/summary",
        params={"from": today, "to": today},
        headers=seller_b,
    ).json()

    assert summary_a["total_revenue"] == 3000
    assert summary_a["units_sold"] == 1
    assert summary_b["total_revenue"] == 7000
    assert summary_b["units_sold"] == 1


def test_seller_stats_date_range_excludes_old_orders(api_client):
    seller_h = _register(api_client, "stats_date", "stats_date@example.com")
    buyer_h = _register(api_client, "stats_date_b", "stats_date_b@example.com")
    _checkout(api_client, buyer_h, seller_h, price=12000)

    utc_today = datetime.now(timezone.utc).date()
    past_start = (utc_today - timedelta(days=10)).isoformat()
    past_end = (utc_today - timedelta(days=5)).isoformat()
    r = api_client.get(
        "/api/seller/stats/summary",
        params={"from": past_start, "to": past_end},
        headers=seller_h,
    )
    assert r.status_code == 200
    assert r.json()["total_revenue"] == 0


def test_seller_stats_empty_range_returns_zeros(api_client):
    seller_h = _register(api_client, "stats_empty", "stats_empty@example.com")
    today = _utc_today_iso()
    r = api_client.get(
        "/api/seller/stats/summary",
        params={"from": today, "to": today},
        headers=seller_h,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["total_revenue"] == 0
    assert data["order_count"] == 0
    assert data["top_products"] == []


def test_seller_stats_line_items(api_client):
    seller_h = _register(api_client, "stats_li", "stats_li@example.com")
    buyer_h = _register(api_client, "stats_li_b", "stats_li_b@example.com")
    _checkout(api_client, buyer_h, seller_h, price=9000, name="Jean")

    today = _utc_today_iso()
    r = api_client.get(
        "/api/seller/stats/line-items",
        params={"from": today, "to": today},
        headers=seller_h,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["product_name"] == "Jean"
    assert data["items"][0]["line_total"] == 9000


def test_seller_stats_export_csv(api_client):
    seller_h = _register(api_client, "stats_csv", "stats_csv@example.com")
    buyer_h = _register(api_client, "stats_csv_b", "stats_csv_b@example.com")
    _checkout(api_client, buyer_h, seller_h, price=11000, name="Buzo")

    today = _utc_today_iso()
    r = api_client.get(
        "/api/seller/stats/export",
        params={"from": today, "to": today},
        headers=seller_h,
    )
    assert r.status_code == 200
    assert "text/csv" in r.headers.get("content-type", "")
    body = r.content.decode("utf-8-sig")
    assert "fecha,orden_id,producto,categoria,talle,cantidad" in body
    assert "Buzo" in body


def test_seller_stats_invalid_date_range(api_client):
    seller_h = _register(api_client, "stats_bad", "stats_bad@example.com")
    r = api_client.get(
        "/api/seller/stats/summary",
        params={"from": "2026-06-01", "to": "2026-05-01"},
        headers=seller_h,
    )
    assert r.status_code == 400
