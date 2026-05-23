"""Filtros del catálogo público. Centralizados para extender sin tocar el repositorio."""

from typing import Optional

from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Query

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
    size: Optional[str] = Field(None, max_length=20, description="Coincidencia parcial en el talle")

    @model_validator(mode="after")
    def validate_price_range(self) -> "ProductCatalogFilters":
        if self.price_min is not None and self.price_max is not None and self.price_min > self.price_max:
            raise ValueError("price_min no puede ser mayor que price_max")
        return self

    def is_active(self) -> bool:
        """True si al menos un filtro tiene valor."""
        return any(
            v is not None and (v != "" if isinstance(v, str) else True)
            for v in (self.name, self.description, self.price_min, self.price_max, self.category, self.size)
        )


def apply_catalog_filters(query: Query, filters: ProductCatalogFilters) -> Query:
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
    if filters.size and filters.size.strip():
        query = query.filter(Product.size.ilike(f"%{filters.size.strip()}%"))
    return query
