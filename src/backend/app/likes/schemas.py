from pydantic import BaseModel


class ProductLikeDTO(BaseModel):
    """Información de un like."""

    id: int
    user_id: int
    product_id: int

    class Config:
        from_attributes = True


class LikeProductResponse(BaseModel):
    """Respuesta de agregar/quitar like."""

    product_id: int
    liked: bool  # True si se agregó, False si se quitó


class MyLikesResponse(BaseModel):
    """Respuesta con listado de productos que el usuario tiene like."""

    total_likes: int
    products: list[dict]  # Incluye toda la info del producto
