from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.core.database import get_db
from app.moderation.schemas import AdminSettingsDTO, FlaggedUserDTO, BadFeedbackProductDTO
from app.products.models import Product
from app.orders.models import OrderItem
from app.ratings.models import SellerRating
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


@router.get("/products/bad-feedback", response_model=list[BadFeedbackProductDTO])
def list_bad_feedback_products(
    min_bad_ratings: int = 1,
    max_stars: int = 2,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        bad_rating_case = case(
            (SellerRating.stars <= max_stars, 1),
            else_=0
        )

        query = (
            db.query(
                Product.id.label("product_id"),
                Product.name.label("product_name"),
                Product.seller_id.label("seller_id"),
                User.username.label("seller_username"),
                Product.category.label("category"),
                Product.price.label("price"),
                Product.is_paused.label("is_paused"),
                func.sum(bad_rating_case).label("bad_rating_count"),
                func.avg(SellerRating.stars).label("average_stars")
            )
            .join(User, Product.seller_id == User.id)
            .join(OrderItem, Product.id == OrderItem.product_id)
            .join(SellerRating, (OrderItem.order_id == SellerRating.order_id) & (OrderItem.seller_id == SellerRating.seller_id))
            .group_by(
                Product.id,
                Product.name,
                Product.seller_id,
                User.username,
                Product.category,
                Product.price,
                Product.is_paused
            )
            .having(func.sum(bad_rating_case) >= min_bad_ratings)
            .order_by(func.sum(bad_rating_case).desc())
        )

        results = query.all()

        return [
            BadFeedbackProductDTO(
                product_id=r.product_id,
                product_name=r.product_name,
                seller_id=r.seller_id,
                seller_username=r.seller_username,
                category=r.category,
                price=r.price,
                is_paused=r.is_paused,
                bad_rating_count=int(r.bad_rating_count) if r.bad_rating_count else 0,
                average_stars=float(r.average_stars) if r.average_stars else 0.0,
            )
            for r in results
        ]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

