from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.fit.schemas import FitPredictionDTO
from app.fit.services.fit_service import FitService
from app.users.deps.auth import get_current_user
from app.users.models import User

router = APIRouter(prefix="/api/catalog", tags=["fit"])


@router.get("/products/{product_id}/fit", response_model=FitPredictionDTO)
def get_fit_prediction(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recomendación inteligente de talle (AI Fit Predictor — US #7).

    Cruza las medidas y preferencia de calce del comprador con los metadatos de la
    prenda (categoría, marca y talle) y devuelve una sugerencia con justificación.

    Estados posibles:
    - ok: recomendación disponible.
    - missing_measures: el comprador no cargó medidas; el front invita a completarlas.
    - insufficient_product_data: no hay datos suficientes de la prenda; se ofrece la guía genérica.
    """
    try:
        return FitService.predict_for_product(db, product_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al calcular la recomendación de talle",
        )
