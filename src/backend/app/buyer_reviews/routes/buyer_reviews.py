from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.buyer_reviews.schemas import BuyerReputationDTO, BuyerReviewCreateDTO, BuyerReviewDTO
from app.buyer_reviews.services.buyer_review_service import BuyerReviewService
from app.core.database import get_db
from app.users.deps.auth import get_current_user
from app.users.models import User

router = APIRouter(prefix="/api/buyer-reviews", tags=["buyer-reviews"])


@router.post("/orders/{order_id}", response_model=BuyerReviewDTO, status_code=status.HTTP_201_CREATED)
def rate_buyer_for_order(
    order_id: int,
    body: BuyerReviewCreateDTO,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        review = BuyerReviewService.rate_buyer_for_order(
            db,
            order_id=order_id,
            seller_id=current_user.id,
            stars=body.stars,
            comment=body.comment,
        )
        return BuyerReviewDTO.model_validate(review)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/buyers/{buyer_id}", response_model=BuyerReputationDTO)
def get_buyer_reputation(
    buyer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return BuyerReviewService.get_buyer_reputation(db, buyer_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
