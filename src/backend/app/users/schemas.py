import re
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRole(str, Enum):
    """Roles disponibles (DTO / API)."""

    ADMIN = "admin"
    USER = "user"


class FitPreference(str, Enum):
    """Preferencia de calce del comprador (AI Fit Predictor)."""

    AJUSTADO = "ajustado"
    REGULAR = "regular"
    HOLGADO = "holgado"


def _normalize_fit_preference(value):
    if value is None:
        return None
    text = str(value).strip().lower()
    if text == "":
        return None
    aliases = {
        "ajustado": "ajustado",
        "ceñido": "ajustado",
        "cenido": "ajustado",
        "slim": "ajustado",
        "tight": "ajustado",
        "regular": "regular",
        "normal": "regular",
        "standard": "regular",
        "estandar": "regular",
        "holgado": "holgado",
        "oversize": "holgado",
        "suelto": "holgado",
        "loose": "holgado",
    }
    if text not in aliases:
        raise ValueError("Preferencia de calce inválida (usá: ajustado, regular u holgado)")
    return aliases[text]


class UserCreateDTO(BaseModel):
    """DTO para crear un nuevo usuario"""

    username: str = Field(..., min_length=3, max_length=50, description="Nombre de usuario")
    email: EmailStr = Field(..., description="Correo electrónico único")
    password: str = Field(..., min_length=6, description="Contraseña")
    weight: Optional[float] = Field(None, ge=0, description="Peso en kg")
    height: Optional[float] = Field(None, ge=0, description="Altura en cm")
    address: Optional[str] = Field(None, max_length=200, description="Dirección")
    shoe_size: Optional[str] = Field(None, max_length=20, description="Talle de calzado")
    top_size: Optional[str] = Field(None, max_length=20, description="Talle parte superior")
    bottom_size: Optional[str] = Field(None, max_length=20, description="Talle parte inferior")
    fit_preference: Optional[str] = Field(
        None, max_length=20, description="Preferencia de calce global (fallback)"
    )
    top_fit_preference: Optional[str] = Field(None, max_length=20, description="Calce parte superior")
    bottom_fit_preference: Optional[str] = Field(None, max_length=20, description="Calce parte inferior")
    shoe_fit_preference: Optional[str] = Field(None, max_length=20, description="Calce calzado")
    body_type: Optional[str] = Field(None, max_length=30, description="Contextura corporal")

    @field_validator(
        "fit_preference",
        "top_fit_preference",
        "bottom_fit_preference",
        "shoe_fit_preference",
        mode="before",
    )
    @classmethod
    def validate_fit_preference(cls, value):
        return _normalize_fit_preference(value)


class UserUpdateDTO(BaseModel):
    """DTO para actualizar un usuario"""

    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = Field(None)
    password: Optional[str] = Field(None, min_length=6)
    weight: Optional[float] = Field(None, ge=0)
    height: Optional[float] = Field(None, ge=0)
    address: Optional[str] = Field(None, max_length=200)


class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=10)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=6)


class MessageResponse(BaseModel):
    message: str


class UserDTO(BaseModel):
    """DTO para respuestas con datos del usuario"""

    id: int
    username: str
    email: str
    role: UserRole
    weight: Optional[float]
    height: Optional[float]
    address: Optional[str]
    profile_image_url: Optional[str] = None
    bio: Optional[str] = None
    shoe_size: Optional[str] = None
    top_size: Optional[str] = None
    bottom_size: Optional[str] = None
    fit_preference: Optional[str] = None
    top_fit_preference: Optional[str] = None
    bottom_fit_preference: Optional[str] = None
    shoe_fit_preference: Optional[str] = None
    body_type: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    email_verified_at: Optional[datetime] = None
    is_active: bool = True
    status_message: Optional[str] = None

    class Config:
        from_attributes = True


class UserProfileDTO(BaseModel):
    """Perfil propio del usuario (lectura)."""

    id: int
    username: str
    email: str
    profile_image_url: Optional[str] = None
    bio: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    address: Optional[str] = None
    shoe_size: Optional[str] = None
    top_size: Optional[str] = None
    bottom_size: Optional[str] = None
    fit_preference: Optional[str] = None
    top_fit_preference: Optional[str] = None
    bottom_fit_preference: Optional[str] = None
    shoe_fit_preference: Optional[str] = None
    body_type: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserProfileUpdateDTO(BaseModel):
    """Actualización parcial del perfil propio."""

    username: Optional[str] = Field(None, min_length=3, max_length=50)
    bio: Optional[str] = Field(None, max_length=2000)
    weight: Optional[float] = Field(None, ge=0)
    height: Optional[float] = Field(None, ge=0)
    address: Optional[str] = Field(None, max_length=200)
    shoe_size: Optional[str] = Field(None, max_length=20)
    top_size: Optional[str] = Field(None, max_length=20)
    bottom_size: Optional[str] = Field(None, max_length=20)
    fit_preference: Optional[str] = Field(None, max_length=20)
    top_fit_preference: Optional[str] = Field(None, max_length=20)
    bottom_fit_preference: Optional[str] = Field(None, max_length=20)
    shoe_fit_preference: Optional[str] = Field(None, max_length=20)
    body_type: Optional[str] = Field(None, max_length=30)

    @field_validator(
        "fit_preference",
        "top_fit_preference",
        "bottom_fit_preference",
        "shoe_fit_preference",
        mode="before",
    )
    @classmethod
    def validate_fit_preference(cls, value):
        return _normalize_fit_preference(value)


class TaxCondition(str, Enum):
    """Condición ante IVA para facturación."""

    CONSUMIDOR_FINAL = "consumidor_final"
    MONOTRIBUTO = "monotributo"
    RESPONSABLE_INSCRIPTO = "responsable_inscripto"
    EXENTO = "exento"


class BillingInfoDTO(BaseModel):
    """Datos de facturación del usuario (lectura)."""

    user_id: int
    legal_name: str
    tax_id: str
    tax_condition: TaxCondition
    billing_address: str
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    billing_email: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BillingInfoUpsertDTO(BaseModel):
    """Creación o reemplazo completo de datos de facturación."""

    legal_name: str = Field(..., min_length=1, max_length=200)
    tax_id: str = Field(..., min_length=1, max_length=20)
    tax_condition: TaxCondition
    billing_address: str = Field(..., min_length=1, max_length=300)
    city: Optional[str] = Field(None, max_length=100)
    province: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    billing_email: Optional[EmailStr] = None

    @field_validator("tax_id", mode="before")
    @classmethod
    def normalize_tax_id(cls, value: str) -> str:
        if value is None:
            return value
        return re.sub(r"[\s\-]", "", str(value))

    @field_validator("legal_name", "billing_address", mode="before")
    @classmethod
    def strip_required_strings(cls, value: str) -> str:
        if value is None:
            return value
        return str(value).strip()

    @field_validator("city", "province", "postal_code", mode="before")
    @classmethod
    def strip_optional_strings(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = str(value).strip()
        return stripped or None
