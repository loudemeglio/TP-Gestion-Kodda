from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.orders.models import PaymentMethod as PaymentMethodModel
from app.orders.schemas import (
    CheckoutRequestDTO,
    OrderDetailDTO,
    OrderSummaryDTO,
    SellerSaleDetailDTO,
    SellerSaleSummaryDTO,
)
from app.orders.services.checkout_service import CheckoutService
from app.users.deps.auth import get_current_user
from app.users.models import User

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("/checkout", response_model=OrderDetailDTO, status_code=status.HTTP_201_CREATED)
def checkout(
    body: CheckoutRequestDTO,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return CheckoutService.checkout(
            db,
            current_user.id,
            PaymentMethodModel(body.payment_method.value),
            body.billing,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/me", response_model=list[OrderSummaryDTO])
def list_my_orders(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CheckoutService.list_my_orders(db, current_user.id, skip, limit)


@router.get("/sales/me", response_model=list[SellerSaleSummaryDTO])
def list_my_sales(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CheckoutService.list_my_sales(db, current_user.id, skip, limit)


@router.get("/sales/{order_id}", response_model=SellerSaleDetailDTO)
def get_sale(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return CheckoutService.get_sale(db, current_user.id, order_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{order_id}", response_model=OrderDetailDTO)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return CheckoutService.get_order(db, current_user.id, order_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
