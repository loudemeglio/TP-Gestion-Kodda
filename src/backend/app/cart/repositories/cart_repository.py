from sqlalchemy.orm import Session, joinedload

from app.cart.models import CartItem


class CartRepository:
    @staticmethod
    def get_by_user(db: Session, user_id: int) -> list[CartItem]:
        return (
            db.query(CartItem)
            .options(joinedload(CartItem.product))
            .filter(CartItem.user_id == user_id)
            .all()
        )

    @staticmethod
    def get_item(db: Session, user_id: int, product_id: int) -> CartItem | None:
        return (
            db.query(CartItem)
            .filter(CartItem.user_id == user_id, CartItem.product_id == product_id)
            .first()
        )

    @staticmethod
    def add_or_increment(db: Session, user_id: int, product_id: int) -> CartItem:
        item = CartRepository.get_item(db, user_id, product_id)
        if item:
            item.quantity += 1
        else:
            item = CartItem(user_id=user_id, product_id=product_id, quantity=1)
            db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def set_quantity(db: Session, user_id: int, product_id: int, quantity: int) -> CartItem | None:
        item = CartRepository.get_item(db, user_id, product_id)
        if quantity <= 0:
            if item:
                db.delete(item)
                db.commit()
            return None
        if item:
            item.quantity = quantity
        else:
            item = CartItem(user_id=user_id, product_id=product_id, quantity=quantity)
            db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def delete_item(db: Session, user_id: int, product_id: int) -> bool:
        item = CartRepository.get_item(db, user_id, product_id)
        if not item:
            return False
        db.delete(item)
        db.commit()
        return True

    @staticmethod
    def clear(db: Session, user_id: int) -> None:
        db.query(CartItem).filter(CartItem.user_id == user_id).delete()
        db.commit()
