from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class FitStatus(str, Enum):
    """Estado de la predicción de calce."""

    OK = "ok"
    MISSING_MEASURES = "missing_measures"  # el comprador no cargó medidas
    INSUFFICIENT_PRODUCT_DATA = "insufficient_product_data"  # no hay datos suficientes de la prenda


class FitVerdict(str, Enum):
    """Veredicto de cómo le quedaría la prenda al comprador."""

    IDEAL = "ideal"
    TIGHT = "tight"  # algo ajustado
    LOOSE = "loose"  # algo holgado
    SMALL = "small"  # le va a quedar chico
    LARGE = "large"  # le va a quedar grande


class FitConfidence(str, Enum):
    ALTA = "alta"
    MEDIA = "media"
    BAJA = "baja"


class FitPredictionDTO(BaseModel):
    """Respuesta del motor de recomendación de talle (AI Fit Predictor)."""

    status: FitStatus

    # Presentes cuando status == ok
    product_size: Optional[str] = None
    recommended_size: Optional[str] = None
    verdict: Optional[FitVerdict] = None
    verdict_label: Optional[str] = None
    headline: Optional[str] = None
    explanation: Optional[str] = None
    confidence: Optional[FitConfidence] = None
    confidence_score: Optional[float] = None
    factors: List[str] = []
    is_match: bool = False

    class Config:
        use_enum_values = True
