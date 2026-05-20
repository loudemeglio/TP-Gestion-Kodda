from sqlalchemy.orm import Session

from app.cart.repositories.cart_repository import CartRepository
from app.cart.schemas import CartDTO, CartItemDTO
from app.cart.models import CartItem
from app.products.repositories.product_repository import ProductRepository


class CartService:
    @staticmethod
    def _to_item_dto(cart_item: CartItem) -> CartItemDTO | None:
        product = cart_item.product
        if not product:
            return None
        return CartItemDTO(
            id=product.id,
            name=product.name,
            description=product.description,
            price=product.price,
            stock=product.stock,
            category=product.category,
            main_image_url=product.main_image_url,
            is_paused=product.is_paused,
            seller_id=product.seller_id,
            cantidad=cart_item.quantity,
        )

    @staticmethod
    def get_cart(db: Session, user_id: int) -> CartDTO:
        items = CartRepository.get_by_user(db, user_id)
        dtos = []
        for item in items:
            dto = CartService._to_item_dto(item)
            if dto:
                dtos.append(dto)
        return CartDTO(items=dtos)

    @staticmethod
    def add_item(db: Session, user_id: int, product_id: int) -> CartDTO:
        product = ProductRepository.get_by_id(db, product_id)
        if not product:
            raise ValueError("Producto no encontrado")
        CartRepository.add_or_increment(db, user_id, product_id)
        return CartService.get_cart(db, user_id)

    @staticmethod
    def set_quantity(db: Session, user_id: int, product_id: int, quantity: int) -> CartDTO:
        product = ProductRepository.get_by_id(db, product_id)
        if not product:
            raise ValueError("Producto no encontrado")
        CartRepository.set_quantity(db, user_id, product_id, quantity)
        return CartService.get_cart(db, user_id)

    @staticmethod
    def remove_item(db: Session, user_id: int, product_id: int) -> CartDTO:
        CartRepository.delete_item(db, user_id, product_id)
        return CartService.get_cart(db, user_id)

    @staticmethod
    def clear_cart(db: Session, user_id: int) -> CartDTO:
        CartRepository.clear(db, user_id)
        return CartDTO(items=[])
