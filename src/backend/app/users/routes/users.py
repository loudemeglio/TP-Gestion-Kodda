from fastapi import APIRouter, BackgroundTasks, Body, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.mail_service import send_email
from app.users.deps.auth import get_current_user, get_current_user_optional, require_admin
from app.users.models import User, UserRole as UserRoleModel
from app.users.repositories.user_repository import UserRepository
from app.users.schemas import (
    BillingInfoDTO,
    BillingInfoUpsertDTO,
    UserCreateDTO,
    UserDTO,
    UserProfileDTO,
    UserProfileUpdateDTO,
    UserRole,
    UserUpdateDTO,
)
from app.users.services.auth_service import AuthService
from app.users.services.billing_service import BillingService
from app.users.services.email_verification_service import EmailVerificationService
from app.users.services.profile_service import ProfileService
from app.users.services.user_service import UserService

router = APIRouter(prefix="/api/users", tags=["users"])


def _ensure_self_or_admin(current_user: User, target_user_id: int) -> None:
    if current_user.role == UserRoleModel.ADMIN:
        return
    if current_user.id != target_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenés permiso para esta operación",
        )


@router.post("/", response_model=UserDTO, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreateDTO,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Crear un nuevo usuario.

    Requiere JWT de administrador salvo que `ALLOW_PUBLIC_SIGNUP=true` en el entorno.
    """
    settings = get_settings()
    if not settings.allow_public_signup:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Se requiere autenticación",
            )
        if current_user.role != UserRoleModel.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo administradores pueden crear usuarios",
            )
    try:
        dto = UserService.create_user(db, user_data)
        db_user = UserRepository.get_by_id(db, dto.id)
        if db_user:
            EmailVerificationService.create_token_and_enqueue(db, db_user, background_tasks)
        return dto
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al crear el usuario",
        )


@router.get("/", response_model=list[UserDTO])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    try:
        return UserService.get_all_users(db, skip, limit)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener los usuarios",
        )


@router.get("/me/profile", response_model=UserProfileDTO)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return ProfileService.get_own_profile(db, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch("/me/profile", response_model=UserProfileDTO)
def update_my_profile(
    data: UserProfileUpdateDTO,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return ProfileService.update_own_profile(db, current_user.id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/me/billing", response_model=BillingInfoDTO)
def get_my_billing(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return BillingService.get_own_billing(db, current_user.id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/me/billing", response_model=BillingInfoDTO)
def upsert_my_billing(
    data: BillingInfoUpsertDTO,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return BillingService.upsert_own_billing(db, current_user.id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/me/avatar", response_model=UserProfileDTO)
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return await ProfileService.save_avatar(db, current_user.id, file)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/username/{username}", response_model=UserDTO)
def get_user_by_username(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRoleModel.ADMIN and current_user.username != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenés permiso para ver este usuario",
        )
    try:
        return UserService.get_user_by_username(db, username)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener el usuario",
        )


@router.get("/{user_id}", response_model=UserDTO)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_self_or_admin(current_user, user_id)
    try:
        return UserService.get_user(db, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener el usuario",
        )


@router.put("/{user_id}", response_model=UserDTO)
def update_user(
    user_id: int,
    user_data: UserUpdateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_self_or_admin(current_user, user_id)
    try:
        return UserService.update_user(db, user_id, user_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar el usuario",
        )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_self_or_admin(current_user, user_id)
    try:
        UserService.delete_user(db, user_id)
        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar el usuario",
        )
        
@router.patch("/{user_id}/status", response_model=UserDTO)
def update_user_status(
    user_id: int,
    background_tasks: BackgroundTasks,
    action: str = Body(..., embed=True),
    reason: str | None = Body(None, embed=True),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    db_user = UserRepository.get_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if action == "block" and user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No podés bloquear tu propia cuenta.",
        )

    if action == "block":
        reason_text = (reason or "").strip() or "Incumplimiento de las normas de la comunidad de Kodda."
        db_user.is_active = False
        db_user.status_message = (
            f"Tu cuenta en Kodda fue bloqueada. Motivo: {reason_text} "
            "Si creés que es un error, contactá a soporte."
        )
        subject = "Tu cuenta en Kodda fue bloqueada"
        mail_body = (
            f"Hola {db_user.username},\n\n"
            "Tu cuenta fue bloqueada y no podés iniciar sesión por el momento.\n\n"
            f"Motivo: {reason_text}\n\n"
            "Si creés que esto es un error, contactá al soporte técnico.\n"
        )
        background_tasks.add_task(send_email, db_user.email, subject, mail_body)
        AuthService.revoke_all_refresh_for_user(db, db_user.id)

    elif action == "unblock":
        db_user.is_active = True
        db_user.status_message = None

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acción no válida (usar 'block' o 'unblock')",
        )

    db.commit()
    db.refresh(db_user)
    return db_user


@router.patch("/{user_id}/role", response_model=UserDTO)
def change_user_role(
    user_id: int,
    new_role: UserRole = Body(..., embed=True),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Cambiar el rol de un usuario (solo para administradores)"""
    db_user = UserRepository.get_by_id(db, user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No podés cambiar tu propio rol",
        )

    try:
        updated_user = UserService.change_user_role(db, user_id, new_role)
        return updated_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al cambiar el rol del usuario",
        )
