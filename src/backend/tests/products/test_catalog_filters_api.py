"""Filtros del catálogo público GET /api/catalog/products."""

import pytest

from tests.conftest import build_product_payload, promote_to_admin, register_user_headers


def _admin_headers(client, username: str, email: str):
    headers = register_user_headers(client, username, email)
    promote_to_admin(username)
    return headers


def _create_product(client, seller_headers, admin_headers, **overrides):
    if "category" in overrides and "category_name" not in overrides:
        overrides["category_name"] = overrides.pop("category")
    body = build_product_payload(client, seller_headers, admin_headers, **overrides)
    r = client.post(
        "/api/catalog/products",
        json=body,
        headers=seller_headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


@pytest.mark.postgres
def test_catalog_filter_by_name(api_client):
    admin_h = _admin_headers(api_client, "admin_filter_a", "admin_filter_a@example.com")
    seller_h = register_user_headers(api_client, "seller_a", "seller_a@example.com")
    buyer_h = register_user_headers(api_client, "buyer_a", "buyer_a@example.com")

    _create_product(api_client, seller_h, admin_h, name="Remera básica blanca", category_name="Remeras", price=5000)
    _create_product(api_client, seller_h, admin_h, name="Campera de cuero", category_name="Camperas", price=45000)

    r = api_client.get(
        "/api/catalog/products",
        params={"name": "cuero"},
        headers=buyer_h,
    )
    assert r.status_code == 200
    names = [p["name"] for p in r.json()]
    assert names == ["Campera de cuero"]


@pytest.mark.postgres
def test_catalog_filter_by_description(api_client):
    admin_h = _admin_headers(api_client, "admin_filter_b", "admin_filter_b@example.com")
    seller_h = register_user_headers(api_client, "seller_b", "seller_b@example.com")
    buyer_h = register_user_headers(api_client, "buyer_b", "buyer_b@example.com")

    _create_product(
        api_client,
        seller_h,
        admin_h,
        name="Vestido floral",
        description="Perfecto para boda de día en primavera",
        category_name="Vestidos",
        price=22000,
    )
    _create_product(
        api_client,
        seller_h,
        admin_h,
        name="Pantalón cargo",
        description="Uso urbano y cómodo",
        category_name="Pantalones",
        price=12000,
    )

    r = api_client.get(
        "/api/catalog/products",
        params={"description": "boda"},
        headers=buyer_h,
    )
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["name"] == "Vestido floral"


@pytest.mark.postgres
def test_catalog_filter_by_size(api_client):
    admin_h = _admin_headers(api_client, "admin_filter_sz", "admin_filter_sz@example.com")
    seller_h = register_user_headers(api_client, "seller_sz", "seller_sz@example.com")
    buyer_h = register_user_headers(api_client, "buyer_sz", "buyer_sz@example.com")

    _create_product(api_client, seller_h, admin_h, name="Remera básica", size="M", category_name="Remeras")
    _create_product(api_client, seller_h, admin_h, name="Remera oversize", size="XL", category_name="Remeras")

    r = api_client.get(
        "/api/catalog/products",
        params={"size": "XL"},
        headers=buyer_h,
    )
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["name"] == "Remera oversize"
    assert r.json()[0]["size"] == "XL"


@pytest.mark.postgres
def test_catalog_filter_by_price_range_and_category(api_client):
    admin_h = _admin_headers(api_client, "admin_filter_c", "admin_filter_c@example.com")
    seller_h = register_user_headers(api_client, "seller_c", "seller_c@example.com")
    buyer_h = register_user_headers(api_client, "buyer_c", "buyer_c@example.com")

    _create_product(api_client, seller_h, admin_h, name="Zapatillas running", category_name="Calzado", price=35000)
    _create_product(api_client, seller_h, admin_h, name="Sandalias", category_name="Calzado", price=8000)
    _create_product(api_client, seller_h, admin_h, name="Remera dry-fit", category_name="Remeras", price=9000)

    r = api_client.get(
        "/api/catalog/products",
        params={"category": "Calzado", "price_min": 10000, "price_max": 40000},
        headers=buyer_h,
    )
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["name"] == "Zapatillas running"


@pytest.mark.postgres
def test_catalog_excludes_own_products_with_filters(api_client):
    admin_h = _admin_headers(api_client, "admin_filter_solo", "admin_filter_solo@example.com")
    user_h = register_user_headers(api_client, "solo_user", "solo_user@example.com")
    _create_product(api_client, user_h, admin_h, name="Mi prenda exclusiva", category_name="Otros", price=1000)

    r = api_client.get(
        "/api/catalog/products",
        params={"name": "exclusiva"},
        headers=user_h,
    )
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.postgres
def test_catalog_invalid_price_range_returns_422(api_client):
    buyer_h = register_user_headers(api_client, "buyer_d", "buyer_d@example.com")
    r = api_client.get(
        "/api/catalog/products",
        params={"price_min": 50000, "price_max": 1000},
        headers=buyer_h,
    )
    assert r.status_code == 422
