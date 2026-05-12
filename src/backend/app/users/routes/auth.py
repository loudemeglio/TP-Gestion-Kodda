from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.users.deps.auth import get_current_user
from app.users.models import User
from app.users.repositories.user_repository import UserRepository
from app.users.schemas import (
    ForgotPasswordRequest,
    LogoutRequest,
    MessageResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenPairResponse,
    UserDTO,
    VerifyEmailRequest,
)
from app.users.services.auth_service import AuthService
from app.users.services.email_verification_service import EmailVerificationService
from app.users.services.password_reset_service import PasswordResetService

router = APIRouter(prefix="/api/auth", tags=["auth"])

_FORGOT_NEUTRAL = "Si el correo está registrado, recibirás un enlace con instrucciones."


@router.post("/login", response_model=TokenPairResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = AuthService.authenticate(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    settings = get_settings()
    if settings.require_email_verification_for_login and user.email_verified_at is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debés verificar tu correo antes de iniciar sesión.",
        )
    access_token, refresh_token = AuthService.issue_token_pair(db, user)
    return TokenPairResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenPairResponse)
def refresh_tokens(body: RefreshTokenRequest, db: Session = Depends(get_db)):
    try:
        access_token, refresh_token = AuthService.rotate_refresh(db, body.refresh_token)
        return TokenPairResponse(access_token=access_token, refresh_token=refresh_token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado",
        )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(body: LogoutRequest, db: Session = Depends(get_db)):
    if body.refresh_token:
        AuthService.revoke_refresh(db, body.refresh_token)
    return None


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
def logout_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    AuthService.revoke_all_refresh_for_user(db, current_user.id)
    return None


@router.get("/me", response_model=UserDTO)
def read_me(current_user: User = Depends(get_current_user)):
    return UserDTO.from_orm(current_user)


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    try:
        EmailVerificationService.verify_email(db, body.token)
        return MessageResponse(message="Correo verificado correctamente.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    body: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    PasswordResetService.request_reset(db, body.email, background_tasks)
    return MessageResponse(message=_FORGOT_NEUTRAL)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        PasswordResetService.reset_password(db, body.token, body.new_password)
        return MessageResponse(message="Contraseña actualizada. Podés iniciar sesión con la nueva clave.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.email_verified_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tu correo ya está verificado.",
        )
    db_user = UserRepository.get_by_id(db, current_user.id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    EmailVerificationService.create_token_and_enqueue(db, db_user, background_tasks)
    return MessageResponse(message="Te enviamos un nuevo enlace de verificación a tu correo.")
