"""Filtros del catálogo público. Centralizados para extender sin tocar el repositorio."""

from typing import Optional

from fastapi import HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Query as SqlQuery

from app.products.models import Product


class ProductCatalogFilters(BaseModel):
    """
    Parámetros de consulta opcionales para GET /api/catalog/products.
    Agregar campos acá y en `apply_catalog_filters` para nuevos criterios.
    """

    name: Optional[str] = Field(None, max_length=200, description="Coincidencia parcial en el nombre")
    description: Optional[str] = Field(
        None, max_length=500, description="Coincidencia parcial en la descripción"
    )
    price_min: Optional[float] = Field(None, ge=0, description="Precio mínimo (inclusive)")
    price_max: Optional[float] = Field(None, ge=0, description="Precio máximo (inclusive)")
    category: Optional[str] = Field(None, max_length=100, description="Categoría exacta")
    brand: Optional[str] = Field(None, max_length=120, description="Marca exacta")
    size: Optional[str] = Field(None, max_length=20, description="Coincidencia parcial en el talle")

    def is_active(self) -> bool:
        """True si al menos un filtro tiene valor."""
        return any(
            v is not None and (v != "" if isinstance(v, str) else True)
            for v in (
                self.name,
                self.description,
                self.price_min,
                self.price_max,
                self.category,
                self.brand,
                self.size,
            )
        )


def get_product_catalog_filters(
    name: Optional[str] = Query(None, max_length=200),
    description: Optional[str] = Query(None, max_length=500),
    price_min: Optional[float] = Query(None, ge=0),
    price_max: Optional[float] = Query(None, ge=0),
    category: Optional[str] = Query(None, max_length=100),
    brand: Optional[str] = Query(None, max_length=120),
    size: Optional[str] = Query(None, max_length=20),
) -> ProductCatalogFilters:
    """Parsea query params planos y valida el rango de precios (422 si es inválido)."""
    if price_min is not None and price_max is not None and price_min > price_max:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="price_min no puede ser mayor que price_max",
        )
    return ProductCatalogFilters(
        name=name,
        description=description,
        price_min=price_min,
        price_max=price_max,
        category=category,
        brand=brand,
        size=size,
    )


def apply_catalog_filters(query: SqlQuery, filters: ProductCatalogFilters) -> SqlQuery:
    """Aplica filtros opcionales sobre una query de Product."""
    if filters.name and filters.name.strip():
        query = query.filter(Product.name.ilike(f"%{filters.name.strip()}%"))
    if filters.description and filters.description.strip():
        query = query.filter(Product.description.ilike(f"%{filters.description.strip()}%"))
    if filters.price_min is not None:
        query = query.filter(Product.price >= filters.price_min)
    if filters.price_max is not None:
        query = query.filter(Product.price <= filters.price_max)
    if filters.category and filters.category.strip():
        query = query.filter(Product.category == filters.category.strip())
    if filters.brand and filters.brand.strip():
        query = query.filter(Product.brand == filters.brand.strip())
    if filters.size and filters.size.strip():
        query = query.filter(Product.size.ilike(f"%{filters.size.strip()}%"))
    return query
