from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class FlaggedUserDTO(BaseModel):
    id: int
    username: str
    email: str
    report_count: int = Field(..., description="Cantidad acumulada de reportes de posible estafa")
    bad_review_count: int = Field(default=0, description="Cantidad acumulada de reseñas negativas")
    needs_review: bool
    flag_reason: str = Field(..., description="Motivo de la revisión: estafa, reseñas_negativas o ambos")


class AdminSettingsDTO(BaseModel):
    max_scam_reports: int = Field(..., ge=1)
    min_bad_ratings: int = Field(..., ge=1)
    max_stars: int = Field(..., ge=1, le=5)


class BadFeedbackProductDTO(BaseModel):
    product_id: int
    product_name: str
    seller_id: int
    seller_username: str
    category: str
    price: float
    is_paused: bool
    needs_review: bool = False
    bad_rating_count: int
    average_stars: float


class AdminPauseProductBody(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500, description="Motivo de la pausa por moderación")


class PausedProductDTO(BaseModel):
    product_id: int
    product_name: str
    seller_id: int
    seller_username: str
    category: str
    price: float
    pause_reason: Optional[str]
    paused_at: Optional[datetime]

