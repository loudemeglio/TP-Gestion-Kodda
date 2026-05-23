from typing import Optional

from pydantic import BaseModel, Field


class CartItemDTO(BaseModel):
    """Producto en el carrito con cantidad."""

    id: int
    name: str
    description: str
    price: float
    stock: int
    category: str
    size: str
    main_image_url: Optional[str]
    is_paused: bool
    seller_id: int
    cantidad: int


class CartDTO(BaseModel):
    items: list[CartItemDTO]


class CartItemQuantityDTO(BaseModel):
    cantidad: int = Field(..., ge=0, description="Cantidad deseada (0 elimina el ítem)")
