from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """Roles disponibles"""
    ADMIN = "admin"
    USER = "user"


class UserCreateDTO(BaseModel):
    """DTO para crear un nuevo usuario"""
    username: str = Field(..., min_length=3, max_length=50, description="Nombre de usuario")
    email: EmailStr = Field(..., description="Correo electrónico único")
    password: str = Field(..., min_length=6, description="Contraseña")
    weight: Optional[float] = Field(None, ge=0, description="Peso en kg")
    height: Optional[float] = Field(None, ge=0, description="Altura en cm")
    address: Optional[str] = Field(None, max_length=200, description="Dirección")


class UserUpdateDTO(BaseModel):
    """DTO para actualizar un usuario"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = Field(None)
    password: Optional[str] = Field(None, min_length=6)
    weight: Optional[float] = Field(None, ge=0)
    height: Optional[float] = Field(None, ge=0)
    address: Optional[str] = Field(None, max_length=200)


class UserDTO(BaseModel):
    """DTO para respuestas con datos del usuario"""
    id: int
    username: str
    email: str
    role: UserRole
    weight: Optional[float]
    height: Optional[float]
    address: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
