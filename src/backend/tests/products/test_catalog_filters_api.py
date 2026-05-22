"""Filtros del catálogo público GET /api/catalog/products."""

import pytest

from tests.conftest import post_login


def _register_and_token(client, username: str, email: str, password: str = "secret12"):
    payload = {"username": username, "email": email, "password": password}
    assert client.post("/api/users/", json=payload).status_code == 201
    r = post_login(client, username, password)
    assert r.status_code == 200
    return r.json()["access_token"]


def _create_product(client, token: str, **overrides):
    body = {
        "name": "Campera denim",
        "description": "Abrigo liviano ideal para otoño",
        "price": 15000,
        "stock": 2,
        "category": "Camperas",
        "main_image_url": None,
    }
    body.update(overrides)
    r = client.post(
        "/api/catalog/products",
        json=body,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201
    return r.json()


@pytest.mark.postgres
def test_catalog_filter_by_name(api_client):
    seller_token = _register_and_token(api_client, "seller_a", "seller_a@example.com")
    buyer_token = _register_and_token(api_client, "buyer_a", "buyer_a@example.com")

    _create_product(api_client, seller_token, name="Remera básica blanca", category="Remeras", price=5000)
    _create_product(api_client, seller_token, name="Campera de cuero", category="Camperas", price=45000)

    r = api_client.get(
        "/api/catalog/products",
        params={"name": "cuero"},
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert r.status_code == 200
    names = [p["name"] for p in r.json()]
    assert names == ["Campera de cuero"]


@pytest.mark.postgres
def test_catalog_filter_by_description(api_client):
    seller_token = _register_and_token(api_client, "seller_b", "seller_b@example.com")
    buyer_token = _register_and_token(api_client, "buyer_b", "buyer_b@example.com")

    _create_product(
        api_client,
        seller_token,
        name="Vestido floral",
        description="Perfecto para boda de día en primavera",
        category="Vestidos",
        price=22000,
    )
    _create_product(
        api_client,
        seller_token,
        name="Pantalón cargo",
        description="Uso urbano y cómodo",
        category="Pantalones",
        price=12000,
    )

    r = api_client.get(
        "/api/catalog/products",
        params={"description": "boda"},
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["name"] == "Vestido floral"


@pytest.mark.postgres
def test_catalog_filter_by_price_range_and_category(api_client):
    seller_token = _register_and_token(api_client, "seller_c", "seller_c@example.com")
    buyer_token = _register_and_token(api_client, "buyer_c", "buyer_c@example.com")

    _create_product(api_client, seller_token, name="Zapatillas running", category="Calzado", price=35000)
    _create_product(api_client, seller_token, name="Sandalias", category="Calzado", price=8000)
    _create_product(api_client, seller_token, name="Remera dry-fit", category="Remeras", price=9000)

    r = api_client.get(
        "/api/catalog/products",
        params={"category": "Calzado", "price_min": 10000, "price_max": 40000},
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["name"] == "Zapatillas running"


@pytest.mark.postgres
def test_catalog_excludes_own_products_with_filters(api_client):
    token = _register_and_token(api_client, "solo_user", "solo_user@example.com")
    _create_product(api_client, token, name="Mi prenda exclusiva", category="Otros", price=1000)

    r = api_client.get(
        "/api/catalog/products",
        params={"name": "exclusiva"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.postgres
def test_catalog_invalid_price_range_returns_422(api_client):
    token = _register_and_token(api_client, "buyer_d", "buyer_d@example.com")
    r = api_client.get(
        "/api/catalog/products",
        params={"price_min": 50000, "price_max": 1000},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422
