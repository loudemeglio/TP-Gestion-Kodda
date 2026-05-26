from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SellerRatingCreateDTO(BaseModel):
    seller_id: int = Field(..., ge=1)
    kind: Literal["positive", "negative"]
    score: int | None = Field(None, ge=1, le=5)
    comment: str | None = Field(None, max_length=500)


class SellerRatingDTO(BaseModel):
    id: int
    order_id: int
    buyer_id: int
    seller_id: int
    kind: str
    score: int | None = None
    comment: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True

