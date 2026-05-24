from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.payments.schemas import (
    PaymentIntentApproveResponse,
    PaymentIntentCreateResponse,
    PaymentIntentStatusDTO,
)
from app.payments.services.payment_intent_service import PaymentIntentService
from app.users.deps.auth import get_current_user
from app.users.models import User

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/intents", response_model=PaymentIntentCreateResponse, status_code=status.HTTP_201_CREATED)
def create_payment_intent(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return PaymentIntentService.create_intent(db, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/intents/{token}/status", response_model=PaymentIntentStatusDTO)
def get_payment_intent_status(token: str, db: Session = Depends(get_db)):
    try:
        return PaymentIntentService.get_status(db, token)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/intents/{token}/approve", response_model=PaymentIntentApproveResponse)
def approve_payment_intent(token: str, db: Session = Depends(get_db)):
    try:
        return PaymentIntentService.approve(db, token)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=str(e))
