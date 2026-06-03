from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.ratings.schemas import SellerRatingCreateDTO, SellerRatingDTO, SellerReputationDTO
from app.ratings.services.rating_service import RatingService
from app.ratings.services.seller_reputation_service import SellerReputationService
from app.users.deps.auth import get_current_user
from app.users.models import User

router = APIRouter(prefix="/api/ratings", tags=["ratings"])


@router.post("/orders/{order_id}", response_model=SellerRatingDTO, status_code=status.HTTP_201_CREATED)
def rate_seller_for_order(
    order_id: int,
    body: SellerRatingCreateDTO,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        rating = RatingService.rate_seller_for_order(
            db,
            order_id=order_id,
            buyer_id=current_user.id,
            seller_id=body.seller_id,
            stars=body.stars,
            description=body.description,
            matches_description=body.matches_description,
            delivered_on_time=body.delivered_on_time,
            is_scam_report=body.is_scam_report,
        )
        return SellerRatingDTO.model_validate(rating)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/sellers/{seller_id}/reputation", response_model=SellerReputationDTO)
def get_seller_reputation(
    seller_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Perfil público de reputación de un vendedor.

    Devuelve puntaje consolidado, métricas de veracidad/envío y lista paginada de
    calificaciones (incluye reportes de estafa).
    """
    try:
        return SellerReputationService.get_seller_reputation(db, seller_id, skip=skip, limit=limit)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

