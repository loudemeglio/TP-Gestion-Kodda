from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProductCreateDTO(BaseModel):
    """DTO para crear un nuevo producto."""

    name: str = Field(..., min_length=1, max_length=200, description="Nombre del producto")
    description: str = Field(..., min_length=1, max_length=2000, description="Descripción del producto")
    price: float = Field(..., gt=0, description="Precio del producto (debe ser > 0)")
    stock: int = Field(..., ge=0, description="Stock inicial (debe ser >= 0)")
    category: str = Field(..., min_length=1, max_length=100, description="Categoría del producto")
    main_image_url: Optional[str] = Field(None, max_length=2000, description="URL de la imagen principal")


class ProductDTO(BaseModel):
    """DTO para respuestas con datos del producto."""

    id: int
    name: str
    description: str
    price: float
    stock: int
    category: str
    main_image_url: Optional[str]
    is_paused: bool
    seller_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
