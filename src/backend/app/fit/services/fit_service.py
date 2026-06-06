"""Orquestación del AI Fit Predictor: carga datos de DB y delega en el motor."""

from sqlalchemy.orm import Session

from app.fit.schemas import FitPredictionDTO
from app.fit.services.fit_engine import FitPredictor, FitProductInput, FitUserInput
from app.products.models import Product
from app.users.models import User


class FitService:
    @staticmethod
    def predict_for_product(db: Session, product_id: int, user_id: int) -> FitPredictionDTO:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError("Producto no encontrado")

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("Usuario no encontrado")

        user_input = FitUserInput(
            weight=user.weight,
            height=user.height,
            top_size=user.top_size,
            bottom_size=user.bottom_size,
            shoe_size=user.shoe_size,
            fit_preference=user.fit_preference,
            top_fit_preference=user.top_fit_preference,
            bottom_fit_preference=user.bottom_fit_preference,
            shoe_fit_preference=user.shoe_fit_preference,
            body_type=user.body_type,
        )
        product_input = FitProductInput(
            size=product.size,
            category=product.category,
            brand=product.brand,
        )

        return FitPredictor.predict(user_input, product_input)
