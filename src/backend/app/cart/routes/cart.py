from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.cart.schemas import CartDTO, CartItemQuantityDTO
from app.cart.services.cart_service import CartService
from app.core.database import get_db
from app.users.deps.auth import get_current_user
from app.users.models import User

router = APIRouter(prefix="/api/cart", tags=["cart"])


@router.get("", response_model=CartDTO)
def get_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return CartService.get_cart(db, current_user.id)


@router.post("/items/{product_id}", response_model=CartDTO)
def add_cart_item(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return CartService.add_item(db, current_user.id, product_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch("/items/{product_id}", response_model=CartDTO)
def update_cart_item_quantity(
    product_id: int,
    body: CartItemQuantityDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return CartService.set_quantity(db, current_user.id, product_id, body.cantidad)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/items/{product_id}", response_model=CartDTO)
def remove_cart_item(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return CartService.remove_item(db, current_user.id, product_id)


@router.delete("", response_model=CartDTO)
def clear_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return CartService.clear_cart(db, current_user.id)
