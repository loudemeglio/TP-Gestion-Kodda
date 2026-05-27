"""ReputationCalculatorService — Responsabilidad Única (SRP).

Este servicio SOLO contiene la lógica matemática para calcular el puntaje de
reputación consolidado de un vendedor. No accede a la base de datos ni a ningún
otro servicio de dominio.

Diseño Open-Closed (OCP):
- La fórmula base (estrellas) y los bonos (veracidad, envío, interacción) son
  configurables como parámetros del método principal.
- Para agregar nuevos factores (ej. tiempo de respuesta en QnA), basta con
  implementar un módulo que calcule el ratio correspondiente y pasarlo como
  `answered_questions_ratio`, sin modificar esta clase.

Fórmula:
  base_score           = average_stars  (1.0 – 5.0)
  accuracy_bonus       = f(accuracy_rate)    → 0 | +0.10 | +0.25
  shipping_bonus       = f(shipping_rate)    → 0 | +0.10 | +0.20
  interaction_bonus    = f(answered_ratio)   → 0 | +0.10 | +0.20
  reputation_score     = min(5.0, base + bonos)
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class ReputationBreakdown:
    base_score: float
    accuracy_bonus: float
    shipping_bonus: float
    interaction_bonus: float
    final_score: float


class ReputationCalculatorService:
    """Calcula el puntaje de reputación de un vendedor a partir de métricas agregadas."""

    # Umbrales para bonus (80 % y 50 %)
    _HIGH_THRESHOLD = 0.80
    _MID_THRESHOLD = 0.50

    @classmethod
    def calculate(
        cls,
        *,
        average_stars: float,
        accuracy_rate: float | None = None,
        shipping_rate: float | None = None,
        answered_questions_ratio: float = 0.0,
    ) -> ReputationBreakdown:
        """
        Calcula el puntaje consolidado.

        Parámetros
        ----------
        average_stars:
            Promedio puro de estrellas (1.0 – 5.0).
        accuracy_rate:
            Fracción [0-1] de reviews con matches_description=True.
            None si no hay datos suficientes → sin bonus.
        shipping_rate:
            Fracción [0-1] de reviews con delivered_on_time=True.
            None si no hay datos suficientes → sin bonus.
        answered_questions_ratio:
            Fracción [0-1] de consultas respondidas por el vendedor.
            Por defecto 0.0 hasta que se integre el módulo de Q&A.

        Retorna
        -------
        ReputationBreakdown con base, bonos parciales y puntaje final.
        """
        base = float(average_stars)
        accuracy_bonus = cls._bonus_from_rate(accuracy_rate, high=0.25, mid=0.10)
        shipping_bonus = cls._bonus_from_rate(shipping_rate, high=0.20, mid=0.10)
        interaction_bonus = cls._bonus_from_rate(answered_questions_ratio, high=0.20, mid=0.10)
        final = min(5.0, base + accuracy_bonus + shipping_bonus + interaction_bonus)

        return ReputationBreakdown(
            base_score=round(base, 2),
            accuracy_bonus=accuracy_bonus,
            shipping_bonus=shipping_bonus,
            interaction_bonus=interaction_bonus,
            final_score=round(final, 2),
        )

    @classmethod
    def _bonus_from_rate(
        cls,
        rate: float | None,
        *,
        high: float,
        mid: float,
    ) -> float:
        if rate is None:
            return 0.0
        if rate >= cls._HIGH_THRESHOLD:
            return high
        if rate >= cls._MID_THRESHOLD:
            return mid
        return 0.0
