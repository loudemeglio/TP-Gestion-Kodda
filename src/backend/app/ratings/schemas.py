from datetime import datetime

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
