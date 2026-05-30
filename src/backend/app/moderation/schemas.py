from datetime import datetime

from pydantic import BaseModel, Field


class FlaggedUserDTO(BaseModel):
    id: int
    username: str
    email: str
    report_count: int = Field(..., description="Cantidad acumulada de reportes de posible estafa")
    needs_review: bool


class AdminSettingsDTO(BaseModel):
    max_scam_reports: int


class BadFeedbackProductDTO(BaseModel):
    product_id: int
    product_name: str
    seller_id: int
    seller_username: str
    category: str
    price: float
    is_paused: bool
    bad_rating_count: int
    average_stars: float

