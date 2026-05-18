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
