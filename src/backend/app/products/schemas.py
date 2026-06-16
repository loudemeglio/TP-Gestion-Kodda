from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProductCreateDTO(BaseModel):
    """DTO para crear un nuevo producto."""

    name: str = Field(..., min_length=1, max_length=200, description="Nombre del producto")
    description: str = Field(..., min_length=1, max_length=2000, description="Descripción del producto")
    price: float = Field(..., gt=0, description="Precio del producto (debe ser > 0)")
    stock: int = Field(..., ge=0, description="Stock inicial (debe ser >= 0)")
    brand_id: int = Field(..., gt=0, description="ID de marca activa del catálogo maestro")
    category_id: int = Field(..., gt=0, description="ID de categoría activa del catálogo maestro")
    size: str = Field(..., min_length=1, max_length=20, description="Talle de la prenda")
    main_image_url: Optional[str] = Field(None, description="URL de la imagen principal o string base64")


class ProductDTO(BaseModel):
    """DTO para respuestas con datos del producto."""

    id: int
    name: str
    description: str
    price: float
    stock: int
    brand: Optional[str] = None
    brand_id: Optional[int] = None
    category: str
    category_id: Optional[int] = None
    size: str
    main_image_url: Optional[str]
    is_paused: bool
    pause_reason: Optional[str] = None
    seller_id: int
    seller_username: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
