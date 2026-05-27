from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class BuyerReviewCreateDTO(BaseModel):
    stars: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=10, max_length=2000)

    @field_validator("comment", mode="before")
    @classmethod
    def strip_comment(cls, value: str) -> str:
        if value is None:
            return value
        return str(value).strip()


class BuyerReviewDTO(BaseModel):
    id: int
    order_id: int
    seller_id: int
    buyer_id: int
    stars: int
    comment: str
    created_at: datetime

    class Config:
        from_attributes = True


class BuyerReviewPublicDTO(BaseModel):
    id: int
    stars: int
    comment: str
    created_at: datetime
    seller_username: str | None = None

    class Config:
        from_attributes = True


class BuyerReputationDTO(BaseModel):
    buyer_id: int
    username: str
    average_stars: float | None = None
    review_count: int
    reviews: list[BuyerReviewPublicDTO] = Field(default_factory=list)
