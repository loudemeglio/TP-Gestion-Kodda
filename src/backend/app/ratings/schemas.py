from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class SellerRatingCreateDTO(BaseModel):
    seller_id: int = Field(..., ge=1)
    stars: int = Field(..., ge=1, le=5, description="Calificación de 1 a 5 estrellas")
    description: str = Field(..., min_length=10, max_length=2000, description="Descripción de la venta")
    matches_description: bool = Field(..., description="¿Coincidió con la descripción de la prenda?")
    delivered_on_time: bool = Field(..., description="¿Cumplió con los tiempos acordados?")
    is_scam_report: bool = Field(default=False, description="Reportar posible estafa")

    @field_validator("description", mode="before")
    @classmethod
    def strip_description(cls, value: str) -> str:
        if value is None:
            return value
        return str(value).strip()


class SellerRatingDTO(BaseModel):
    id: int
    order_id: int
    buyer_id: int
    seller_id: int
    stars: int
    description: str
    matches_description: bool | None = None
    delivered_on_time: bool | None = None
    is_scam_report: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Reputación pública del vendedor ──────────────────────────────────────────

class SellerRatingPublicDTO(BaseModel):
    """Vista pública de una calificación individual al vendedor."""

    id: int
    stars: int
    description: str
    matches_description: Optional[bool] = None
    delivered_on_time: Optional[bool] = None
    created_at: datetime
    buyer_username: Optional[str] = None

    class Config:
        from_attributes = True


class SellerReputationDTO(BaseModel):
    """Respuesta del endpoint GET /api/ratings/sellers/{seller_id}/reputation."""

    seller_id: int
    username: str
    reputation_score: Optional[float] = None   # puntaje consolidado 1-5 con bonos
    average_stars: Optional[float] = None       # promedio puro de estrellas
    review_count: int
    accuracy_rate: Optional[float] = None       # % de reviews con matches_description=True
    shipping_rate: Optional[float] = None       # % de reviews con delivered_on_time=True
    reviews: list[SellerRatingPublicDTO] = Field(default_factory=list)
