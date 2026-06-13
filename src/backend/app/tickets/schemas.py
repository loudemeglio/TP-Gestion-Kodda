from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.tickets.models import TicketStatus


class TicketCreateDTO(BaseModel):
    """DTO para crear un ticket de soporte. Enviado por el usuario autenticado."""

    subject: str = Field(..., min_length=5, max_length=200, description="Motivo del reclamo")
    description: str = Field(..., min_length=10, max_length=5000, description="Descripción detallada")

    @field_validator("subject", "description", mode="before")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        if value is None:
            return value
        return str(value).strip()


class TicketStatusUpdateDTO(BaseModel):
    """DTO para que un agente/admin cambie el estado de un ticket."""

    status: TicketStatus


class TicketDTO(BaseModel):
    """Respuesta completa de un ticket, incluye datos del usuario creador."""

    id: int
    user_id: int
    username: str
    subject: str
    description: str
    status: TicketStatus
    created_at: datetime

    class Config:
        from_attributes = True
