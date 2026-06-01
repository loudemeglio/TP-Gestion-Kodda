"""Catálogo maestro: marcas y categorías (admin + lectura activa)."""

import pytest

from tests.conftest import (
    build_product_payload,
    create_test_brand,
    get_active_category_id,
    promote_to_admin,
    register_user_headers,
)


def _admin_setup(client, username: str = "catalog_admin", email: str = "catalog_admin@example.com"):
    headers = register_user_headers(client, username, email)
    promote_to_admin(username)
    return headers


@pytest.mark.postgres
def test_admin_create_brand_and_category(api_client):
    admin_h = _admin_setup(api_client)

    brand = api_client.post(
        "/api/admin/catalog/brands",
        json={"name": "Nike"},
        headers=admin_h,
    )
    assert brand.status_code == 201
    assert brand.json()["name"] == "Nike"
    assert brand.json()["is_active"] is True

    dup = api_client.post(
        "/api/admin/catalog/brands",
        json={"name": "nike"},
        headers=admin_h,
    )
    assert dup.status_code == 400

    category = api_client.post(
        "/api/admin/catalog/categories",
        json={"name": "Bolsos"},
        headers=admin_h,
    )
    assert category.status_code == 201


@pytest.mark.postgres
def test_admin_toggle_brand_soft_delete(api_client):
    admin_h = _admin_setup(api_client, "catalog_admin2", "catalog_admin2@example.com")
    seller_h = register_user_headers(api_client, "seller_cat", "seller_cat@example.com")

    brand_id = create_test_brand(api_client, admin_h, "Adidas")
    category_id = get_active_category_id(api_client, seller_h, "Remeras")

    payload = {
        "name": "Producto test",
        "description": "Descripción",
        "price": 15000,
        "stock": 1,
        "brand_id": brand_id,
        "category_id": category_id,
        "size": "M",
    }
    create = api_client.post("/api/catalog/products", json=payload, headers=seller_h)
    assert create.status_code == 201
    assert create.json()["brand"] == "Adidas"

    deactivate = api_client.patch(
        f"/api/admin/catalog/brands/{brand_id}/active",
        json={"is_active": False},
        headers=admin_h,
    )
    assert deactivate.status_code == 200
    assert deactivate.json()["is_active"] is False

    active = api_client.get("/api/catalog/brands/active", headers=seller_h)
    assert active.status_code == 200
    assert all(b["id"] != brand_id for b in active.json())

    blocked = api_client.post("/api/catalog/products", json=payload, headers=seller_h)
    assert blocked.status_code == 400


@pytest.mark.postgres
def test_admin_rename_category(api_client):
    admin_h = _admin_setup(api_client, "catalog_admin3", "catalog_admin3@example.com")

    cats = api_client.get("/api/admin/catalog/categories", headers=admin_h)
    assert cats.status_code == 200
    remeras = next(c for c in cats.json() if c["name"] == "Remeras")

    updated = api_client.patch(
        f"/api/admin/catalog/categories/{remeras['id']}",
        json={"name": "Remeras y tops"},
        headers=admin_h,
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Remeras y tops"


@pytest.mark.postgres
def test_non_admin_cannot_manage_catalog(api_client):
    user_h = register_user_headers(api_client, "plain_user", "plain_user@example.com")
    r = api_client.post("/api/admin/catalog/brands", json={"name": "Zara"}, headers=user_h)
    assert r.status_code == 403
