from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.likes.models import ProductLike
from app.products.models import Product
from app.products.schemas import ProductDTO
from app.users.models import User


class LikeService:
    """Servicio para gestionar likes de productos."""

    @staticmethod
    def toggle_like(db: Session, user_id: int, product_id: int) -> bool:
        """
        Agrega o quita un like.
        Retorna True si se agregó, False si se quitó.
        """
        # Verificar que el producto existe
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError("Producto no encontrado")

        # Buscar si ya existe el like
        existing_like = (
            db.query(ProductLike)
            .filter(
                and_(
                    ProductLike.user_id == user_id,
                    ProductLike.product_id == product_id,
                )
            )
            .first()
        )

        if existing_like:
            # Quitar like
            db.delete(existing_like)
            db.commit()
            return False
        else:
            # Agregar like
            new_like = ProductLike(user_id=user_id, product_id=product_id)
            db.add(new_like)
            db.commit()
            return True

    @staticmethod
    def is_liked(db: Session, user_id: int, product_id: int) -> bool:
        """Verifica si un usuario tiene like en un producto."""
        like = (
            db.query(ProductLike)
            .filter(
                and_(
                    ProductLike.user_id == user_id,
                    ProductLike.product_id == product_id,
                )
            )
            .first()
        )
        return like is not None

    @staticmethod
    def get_user_likes(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> tuple[int, list]:
        """
        Obtiene todos los productos que el usuario tiene like.
        Retorna: (total_count, lista de productos)
        """
        # Contar total
        total = db.query(ProductLike).filter(ProductLike.user_id == user_id).count()

        # Obtener likes con info del producto
        likes = (
            db.query(ProductLike, Product)
            .join(Product, ProductLike.product_id == Product.id)
            .filter(ProductLike.user_id == user_id)
            .order_by(ProductLike.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        # Convertir a DTOs
        products = []
        for like, product in likes:
            seller_username = product.seller.username if product.seller else None
            product_dict = {
                "id": product.id,
                "name": product.name,
                "price": product.price,
                "category": product.category,
                "brand": product.brand,
                "size": product.size,
                "stock": product.stock,
                "main_image_url": product.main_image_url,
                "seller_id": product.seller_id,
                "seller_username": seller_username,
            }
            products.append(product_dict)

        return total, products
