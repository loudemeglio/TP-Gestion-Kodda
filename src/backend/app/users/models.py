import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class UserRole(str, enum.Enum):
    """Roles de usuario disponibles"""

    ADMIN = "admin"
    USER = "user"


class User(Base):
    """Modelo de Usuario en la base de datos"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)

    weight = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    address = Column(String, nullable=True)

    profile_image_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    shoe_size = Column(String(20), nullable=True)
    top_size = Column(String(20), nullable=True)
    bottom_size = Column(String(20), nullable=True)

    # AI Fit Predictor (US #7): preferencia de calce y contextura corporal
    fit_preference = Column(String(20), nullable=True)  # fallback global (legacy)
    top_fit_preference = Column(String(20), nullable=True)
    bottom_fit_preference = Column(String(20), nullable=True)
    shoe_fit_preference = Column(String(20), nullable=True)
    body_type = Column(String(30), nullable=True)  # delgado | promedio | atletico | robusto

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    status_message = Column(String, nullable=True)

    # Reputación / alertas (extensible para futuras US)
    is_flagged = Column(Boolean, default=False, nullable=False)
    scam_report_count = Column(Integer, default=0, nullable=False)
    needs_review = Column(Boolean, default=False, nullable=False)

    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    email_verification_tokens = relationship(
        "EmailVerificationToken", back_populates="user", cascade="all, delete-orphan"
    )
    password_reset_tokens = relationship(
        "PasswordResetToken", back_populates="user", cascade="all, delete-orphan"
    )
    billing_info = relationship(
        "UserBillingInfo",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, email={self.email}, role={self.role})>"


class RefreshToken(Base):
    """Refresh token opaco persistido como hash (SHA-256)."""

    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="refresh_tokens")


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="email_verification_tokens")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="password_reset_tokens")


class UserBillingInfo(Base):
    """Datos de facturación del usuario (relación 1:1)."""

    __tablename__ = "user_billing_info"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    legal_name = Column(String(200), nullable=False)
    tax_id = Column(String(20), nullable=False)
    tax_condition = Column(String(50), nullable=False)
    billing_address = Column(String(300), nullable=False)
    city = Column(String(100), nullable=True)
    province = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    billing_email = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship("User", back_populates="billing_info")

    def __repr__(self):
        return f"<UserBillingInfo(user_id={self.user_id}, tax_id={self.tax_id})>"
