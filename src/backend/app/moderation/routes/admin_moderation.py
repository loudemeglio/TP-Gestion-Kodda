from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.moderation.repositories.moderation_metrics_repository import ModerationMetricsRepository
from app.moderation.schemas import (
    AdminPauseProductBody,
    AdminSettingsDTO,
    BadFeedbackProductDTO,
    FlaggedUserDTO,
    PausedProductDTO,
)
from app.notifications.models import Notification
from app.notifications.repositories.notification_repository import NotificationRepository
from app.products.repositories.product_repository import ProductRepository
from app.products.models import Product
from app.system_settings.repositories.system_setting_repository import SystemSettingRepository
from app.users.deps.auth import require_admin
from app.users.models import User
from app.users.repositories.user_repository import UserRepository

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _derive_flag_reason(user: User) -> str:
    has_scam = (user.scam_report_count or 0) > 0
    has_bad_reviews = (user.bad_review_count or 0) > 0
    if has_scam and has_bad_reviews:
        return "ambos"
    if has_scam:
        return "estafa"
    if has_bad_reviews:
        return "reseñas_negativas"
    return "revisión"


def _flagged_user_dto(user: User) -> FlaggedUserDTO:
    return FlaggedUserDTO(
        id=user.id,
        username=user.username,
        email=user.email,
        report_count=user.scam_report_count or 0,
        bad_review_count=user.bad_review_count or 0,
        needs_review=bool(user.needs_review),
        flag_reason=_derive_flag_reason(user),
    )


def _load_admin_settings(db: Session) -> AdminSettingsDTO:
    return AdminSettingsDTO(
        max_scam_reports=SystemSettingRepository.get_int(db, "max_scam_reports", default=1) or 1,
        min_bad_ratings=SystemSettingRepository.get_int(db, "min_bad_ratings", default=2) or 2,
        max_stars=SystemSettingRepository.get_int(db, "max_stars", default=2) or 2,
    )


@router.get("/flagged-users", response_model=list[FlaggedUserDTO])
def list_flagged_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        users = (
            db.query(User)
            .filter(User.needs_review.is_(True))
            .order_by(User.scam_report_count.desc(), User.bad_review_count.desc(), User.created_at.desc())
            .all()
        )
        return [_flagged_user_dto(u) for u in users]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/settings", response_model=AdminSettingsDTO)
def get_settings(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return _load_admin_settings(db)


@router.put("/settings", response_model=AdminSettingsDTO)
def update_settings(
    data: AdminSettingsDTO,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        SystemSettingRepository.upsert_int(db, "max_scam_reports", data.max_scam_reports)
        SystemSettingRepository.upsert_int(db, "min_bad_ratings", data.min_bad_ratings)
        SystemSettingRepository.upsert_int(db, "max_stars", data.max_stars)
        return _load_admin_settings(db)
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

        return _flagged_user_dto(user)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/products/paused", response_model=list[PausedProductDTO])
def list_paused_products(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        products = ProductRepository.get_all_paused(db)
        return [
            PausedProductDTO(
                product_id=p.id,
                product_name=p.name,
                seller_id=p.seller_id,
                seller_username=p.seller.username if p.seller else "",
                category=p.category,
                price=p.price,
                pause_reason=p.pause_reason,
                paused_at=p.updated_at,
            )
            for p in products
        ]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/products/{product_id}/pause", response_model=PausedProductDTO)
def admin_pause_product(
    product_id: int,
    body: AdminPauseProductBody,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        product = ProductRepository.admin_pause(db, product_id, body.reason)
        if not product:
            raise LookupError("Publicación no encontrada.")

        NotificationRepository.create(
            db,
            Notification(
                user_id=product.seller_id,
                title="Tu publicación fue pausada por moderación",
                message=(
                    f"La publicación \"{product.name}\" fue pausada por un moderador. "
                    f"Motivo: {body.reason}. "
                    "Si considerás que esto es un error, podés crear un ticket de soporte desde Mis reclamos."
                ),
                is_read=False,
            ),
        )
        db.commit()

        return PausedProductDTO(
            product_id=product.id,
            product_name=product.name,
            seller_id=product.seller_id,
            seller_username=product.seller.username if product.seller else "",
            category=product.category,
            price=product.price,
            pause_reason=product.pause_reason,
            paused_at=product.updated_at,
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/products/{product_id}/resume", response_model=PausedProductDTO)
def admin_resume_product(
    product_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        product = ProductRepository.admin_resume(db, product_id)
        if not product:
            raise LookupError("Publicación no encontrada.")
        return PausedProductDTO(
            product_id=product.id,
            product_name=product.name,
            seller_id=product.seller_id,
            seller_username=product.seller.username if product.seller else "",
            category=product.category,
            price=product.price,
            pause_reason=product.pause_reason,
            paused_at=product.updated_at,
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.put("/products/{product_id}/resolve", response_model=BadFeedbackProductDTO)
def resolve_product_review(
    product_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        product = ProductRepository.get_by_id(db, product_id)
        if not product:
            raise LookupError("Publicación no encontrada.")

        product.needs_review = False
        db.commit()
        db.refresh(product)

        max_stars = SystemSettingRepository.get_int(db, "max_stars", default=2) or 2
        bad_count = ModerationMetricsRepository.count_bad_ratings_for_product(
            db, product_id, max_stars
        )
        avg_query = ModerationMetricsRepository.list_bad_feedback_products(
            db, min_bad_ratings=1, max_stars=max_stars
        )
        avg_stars = 0.0
        for row in avg_query:
            if row.product_id == product_id:
                avg_stars = float(row.average_stars) if row.average_stars else 0.0
                break

        return BadFeedbackProductDTO(
            product_id=product.id,
            product_name=product.name,
            seller_id=product.seller_id,
            seller_username=product.seller.username if product.seller else "",
            category=product.category,
            price=product.price,
            is_paused=product.is_paused,
            needs_review=bool(product.needs_review),
            bad_rating_count=bad_count,
            average_stars=avg_stars,
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/products/bad-feedback", response_model=list[BadFeedbackProductDTO])
def list_bad_feedback_products(
    min_bad_ratings: int = 1,
    max_stars: int = 2,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        results = ModerationMetricsRepository.list_bad_feedback_products(
            db,
            min_bad_ratings=min_bad_ratings,
            max_stars=max_stars,
        )

        return [
            BadFeedbackProductDTO(
                product_id=r.product_id,
                product_name=r.product_name,
                seller_id=r.seller_id,
                seller_username=r.seller_username,
                category=r.category,
                price=r.price,
                is_paused=r.is_paused,
                needs_review=bool(r.needs_review),
                bad_rating_count=int(r.bad_rating_count) if r.bad_rating_count else 0,
                average_stars=float(r.average_stars) if r.average_stars else 0.0,
            )
            for r in results
        ]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
