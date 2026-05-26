from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.moderation.schemas import AdminSettingsDTO, FlaggedUserDTO
from app.system_settings.repositories.system_setting_repository import SystemSettingRepository
from app.users.deps.auth import require_admin
from app.users.models import User
from app.users.repositories.user_repository import UserRepository

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/flagged-users", response_model=list[FlaggedUserDTO])
def list_flagged_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        users = (
            db.query(User)
            .filter(User.needs_review.is_(True))
            .order_by(User.scam_report_count.desc(), User.created_at.desc())
            .all()
        )

        return [
            FlaggedUserDTO(
                id=u.id,
                username=u.username,
                email=u.email,
                report_count=u.scam_report_count or 0,
                needs_review=bool(u.needs_review),
            )
            for u in users
        ]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/settings", response_model=AdminSettingsDTO)
def get_settings(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    limit = SystemSettingRepository.get_int(db, "max_scam_reports", default=1) or 1
    return AdminSettingsDTO(max_scam_reports=limit)


@router.put("/settings", response_model=AdminSettingsDTO)
def update_settings(
    data: AdminSettingsDTO,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        row = SystemSettingRepository.upsert_int(db, "max_scam_reports", data.max_scam_reports)
        return AdminSettingsDTO(max_scam_reports=row.value)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.put("/users/{user_id}/resolve", response_model=FlaggedUserDTO)
def resolve_flag(
    user_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        user = UserRepository.get_by_id(db, user_id)
        if not user:
            raise LookupError("Usuario no encontrado.")

        user.needs_review = False
        user.is_flagged = False
        db.commit()
        db.refresh(user)

        return FlaggedUserDTO(
            id=user.id,
            username=user.username,
            email=user.email,
            report_count=user.scam_report_count or 0,
            needs_review=bool(user.needs_review),
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

