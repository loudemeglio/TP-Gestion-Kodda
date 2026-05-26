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

