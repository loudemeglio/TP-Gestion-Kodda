from datetime import datetime

from pydantic import BaseModel, Field


class CatalogItemDTO(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CatalogItemCreateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


class CatalogItemUpdateNameDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


class CatalogItemActiveDTO(BaseModel):
    is_active: bool
