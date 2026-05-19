from sqlalchemy.orm import Session

from app.products.repositories.product_repository import ProductRepository
from app.products.schemas import ProductCreateDTO, ProductDTO


class ProductService:
    """Service para la lógica de negocio de productos."""

    @staticmethod
    def create_product(db: Session, product_data: ProductCreateDTO, seller_id: int) -> ProductDTO:
        """Crear un nuevo producto con validaciones de negocio."""
        if product_data.price <= 0:
            raise ValueError("El precio debe ser mayor a 0")

        if product_data.stock < 0:
            raise ValueError("El stock no puede ser negativo")

        db_product = ProductRepository.create(db, product_data, seller_id)
        return ProductDTO.from_orm(db_product)

    @staticmethod
    def get_user_products(db: Session, seller_id: int, skip: int = 0, limit: int = 100) -> list[ProductDTO]:
        """Obtener todos los productos del usuario actual."""
        products = ProductRepository.get_by_seller(db, seller_id, skip, limit)
        return [ProductDTO.from_orm(product) for product in products]

    @staticmethod
    def update_product(db: Session, product_id: int, product_data: ProductCreateDTO, seller_id: int) -> ProductDTO:
        """Actualizar un producto. Solo el dueño puede actualizar."""
        if product_data.price <= 0:
            raise ValueError("El precio debe ser mayor a 0")

        if product_data.stock < 0:
            raise ValueError("El stock no puede ser negativo")

        db_product = ProductRepository.update(db, product_id, product_data, seller_id)
        if not db_product:
            raise ValueError("Producto no encontrado o no tienes permisos para editarlo")
        
        return ProductDTO.from_orm(db_product)

    @staticmethod
    def delete_product(db: Session, product_id: int, seller_id: int) -> bool:
        """Eliminar un producto. Solo el dueño puede eliminar."""
        success = ProductRepository.delete(db, product_id, seller_id)
        if not success:
            raise ValueError("Producto no encontrado o no tienes permisos para eliminarlo")
        return success

    @staticmethod
    def pause_product(db: Session, product_id: int, seller_id: int) -> ProductDTO:
        """Pausar un producto. Solo el dueño puede pausar."""
        db_product = ProductRepository.pause(db, product_id, seller_id)
        if not db_product:
            raise ValueError("Producto no encontrado o no tienes permisos para pausarlo")
        return ProductDTO.from_orm(db_product)

    @staticmethod
    def resume_product(db: Session, product_id: int, seller_id: int) -> ProductDTO:
        """Reanudar un producto. Solo el dueño puede reanudar."""
        db_product = ProductRepository.resume(db, product_id, seller_id)
        if not db_product:
            raise ValueError("Producto no encontrado o no tienes permisos para reanudarlo")
        return ProductDTO.from_orm(db_product)
