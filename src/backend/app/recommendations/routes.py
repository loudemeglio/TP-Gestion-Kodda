from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.users.deps.auth import get_current_user
from app.users.models import User
from app.recommendations.services import RecommendationService
from app.recommendations.schemas import PersonalRecommendationsResponse

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get(
    "/personalized",
    response_model=PersonalRecommendationsResponse,
    status_code=status.HTTP_200_OK,
)
def get_personalized_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 12,
):
    """
    Obtiene recomendaciones personalizadas para el usuario autenticado.

    Basadas en:
    - Historial de compras previas
    - Talla y preferencias personales registradas
    - Categorías y marcas favoritas

    Query params:
    - limit: Cantidad máxima de recomendaciones (default: 12)
    """
    try:
        return RecommendationService.get_personal_recommendations(
            db, current_user.id, limit=limit
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener recomendaciones personalizadas",
        )
