from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.ratings.schemas import SellerRatingCreateDTO, SellerRatingDTO
from app.ratings.services.rating_service import RatingService
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
            kind=body.kind,
            score=body.score,
            comment=body.comment,
        )
        return SellerRatingDTO.model_validate(rating)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

