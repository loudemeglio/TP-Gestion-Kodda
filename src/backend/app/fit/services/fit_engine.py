"""Motor de recomendación de talle (AI Fit Predictor — US #7).

Reglas deterministas que cruzan las medidas/preferencias del comprador con los
metadatos de la prenda (categoría, marca, talle). El objetivo es estimar qué
talle le quedaría bien al usuario y comparar con el talle real de la publicación,
generando una recomendación con justificación y nivel de confianza.

Se mantiene como lógica pura (sin DB ni FastAPI) para poder testearla aislada.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional

from app.fit.schemas import (
    FitConfidence,
    FitPredictionDTO,
    FitStatus,
    FitVerdict,
)

# Escala de talles por letra (ordenada de menor a mayor).
LETTER_SCALE = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"]

# Sinónimos -> letra canónica.
_LETTER_ALIASES = {
    "xxs": "XXS",
    "xs": "XS",
    "extra small": "XS",
    "s": "S",
    "small": "S",
    "ch": "S",
    "chico": "S",
    "p": "S",
    "m": "M",
    "medium": "M",
    "mediano": "M",
    "med": "M",
    "l": "L",
    "large": "L",
    "g": "L",
    "grande": "L",
    "xl": "XL",
    "extra large": "XL",
    "xg": "XL",
    "xxl": "XXL",
    "2xl": "XXL",
    "xxxl": "XXXL",
    "3xl": "XXXL",
}

# Dominio según categoría de la prenda.
_TOP_CATEGORIES = {
    "remeras", "remera", "camperas", "campera", "vestidos", "vestido",
    "camisas", "camisa", "buzos", "buzo", "sweaters", "sweater", "abrigos",
    "abrigo", "tops", "top", "camperas y abrigos",
}
_BOTTOM_CATEGORIES = {
    "pantalones", "pantalon", "jeans", "jean", "shorts", "short",
    "polleras", "pollera", "faldas", "falda", "bermudas",
}
_SHOE_CATEGORIES = {
    "calzado", "zapatillas", "zapatos", "botas", "botinetas", "sandalias",
}

# Tallaje conocido por marca: +N => la marca talla CHICO (conviene subir N talles),
# -N => la marca talla GRANDE (conviene bajar). 0 => estándar.
_BRAND_BIAS = {
    "zara": 1,
    "bershka": 1,
    "pull&bear": 1,
    "pull and bear": 1,
    "stradivarius": 1,
    "h&m": 1,
    "hm": 1,
    "uniqlo": 0,
    "nike": 0,
    "adidas": 0,
    "puma": 0,
    "levis": -1,
    "levi's": -1,
    "gap": -1,
    "tommy hilfiger": -1,
    "tommy": -1,
}


@dataclass
class FitUserInput:
    weight: Optional[float] = None
    height: Optional[float] = None
    top_size: Optional[str] = None
    bottom_size: Optional[str] = None
    shoe_size: Optional[str] = None
    fit_preference: Optional[str] = None  # fallback global
    top_fit_preference: Optional[str] = None
    bottom_fit_preference: Optional[str] = None
    shoe_fit_preference: Optional[str] = None
    body_type: Optional[str] = None


@dataclass
class FitProductInput:
    size: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None


@dataclass
class _Engine:
    factors: List[str] = field(default_factory=list)
    estimated: bool = False
    brand_known: bool = False
    pref_known: bool = False


def _clean(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def _letter_index(size: Optional[str]) -> Optional[int]:
    """Índice en LETTER_SCALE para un talle por letra, o None si no aplica."""
    token = _clean(size)
    if not token:
        return None
    canonical = _LETTER_ALIASES.get(token)
    if canonical is None:
        return None
    return LETTER_SCALE.index(canonical)


def _numeric_size(size: Optional[str]) -> Optional[int]:
    """Extrae el primer número de un talle numérico (calzado, cintura)."""
    token = _clean(size)
    if not token:
        return None
    match = re.search(r"\d+", token)
    return int(match.group()) if match else None


def _category_domain(category: Optional[str]) -> Optional[str]:
    cat = _clean(category)
    if not cat:
        return None
    if cat in _TOP_CATEGORIES:
        return "top"
    if cat in _BOTTOM_CATEGORIES:
        return "bottom"
    if cat in _SHOE_CATEGORIES:
        return "shoe"
    return None


def _brand_bias(brand: Optional[str]) -> Optional[int]:
    b = _clean(brand)
    if not b:
        return None
    return _BRAND_BIAS.get(b)


def _fit_adjustment(fit_preference: Optional[str]) -> int:
    pref = _clean(fit_preference)
    return {"ajustado": -1, "regular": 0, "holgado": 1}.get(pref, 0)


def _resolve_fit_preference(user: FitUserInput, domain: str) -> Optional[str]:
    """Preferencia por zona; si falta, usa la global (legacy)."""
    if domain == "top":
        return user.top_fit_preference or user.fit_preference
    if domain == "bottom":
        return user.bottom_fit_preference or user.fit_preference
    if domain == "shoe":
        return user.shoe_fit_preference or user.fit_preference
    return user.fit_preference


_PART_LABELS = {
    "top": "parte superior",
    "bottom": "parte inferior",
    "shoe": "calzado",
}


def _append_fit_factor(eng: _Engine, pref: str, part_label: str) -> None:
    eng.pref_known = True
    if pref == "holgado":
        eng.factors.append(f"Preferís un calce holgado en {part_label}, así que sumamos un talle.")
    elif pref == "ajustado":
        eng.factors.append(f"Preferís un calce ajustado en {part_label}, así que bajamos un talle.")
    else:
        eng.factors.append(f"Preferís un calce regular en {part_label} (al cuerpo).")


def _estimate_letter_index_from_body(weight: Optional[float], height: Optional[float]) -> Optional[int]:
    """Estima un talle por letra a partir de IMC (peso/altura)."""
    if not weight or not height or height <= 0:
        return None
    bmi = weight / ((height / 100) ** 2)
    if bmi < 18.5:
        return LETTER_SCALE.index("XS")
    if bmi < 21:
        return LETTER_SCALE.index("S")
    if bmi < 24.5:
        return LETTER_SCALE.index("M")
    if bmi < 28:
        return LETTER_SCALE.index("L")
    if bmi < 32:
        return LETTER_SCALE.index("XL")
    return LETTER_SCALE.index("XXL")


def _clamp_index(index: int) -> int:
    return max(0, min(len(LETTER_SCALE) - 1, index))


def _confidence_from_score(score: float) -> FitConfidence:
    if score >= 0.75:
        return FitConfidence.ALTA
    if score >= 0.5:
        return FitConfidence.MEDIA
    return FitConfidence.BAJA


def _verdict_from_diff(diff: int) -> FitVerdict:
    """diff = talle_prenda - talle_recomendado (en pasos)."""
    if diff == 0:
        return FitVerdict.IDEAL
    if diff == 1:
        return FitVerdict.LOOSE
    if diff >= 2:
        return FitVerdict.LARGE
    if diff == -1:
        return FitVerdict.TIGHT
    return FitVerdict.SMALL


_VERDICT_LABELS = {
    FitVerdict.IDEAL: "Te va a quedar bien",
    FitVerdict.TIGHT: "Te puede quedar algo ajustado",
    FitVerdict.LOOSE: "Te puede quedar algo holgado",
    FitVerdict.SMALL: "Probablemente te quede chico",
    FitVerdict.LARGE: "Probablemente te quede grande",
}


class FitPredictor:
    """Punto de entrada del motor de recomendación de talle."""

    @staticmethod
    def predict(user: FitUserInput, product: FitProductInput) -> FitPredictionDTO:
        domain = _category_domain(product.category)
        product_letter = _letter_index(product.size)
        product_number = _numeric_size(product.size)

        # --- Graceful degradation: datos insuficientes de la prenda ---
        size_token = _clean(product.size)
        size_is_unknown = size_token in {"", "único", "unico", "desconocido", "u", "-"}
        if domain is None or size_is_unknown or (product_letter is None and product_number is None):
            return FitPredictionDTO(status=FitStatus.INSUFFICIENT_PRODUCT_DATA)

        if domain == "shoe":
            return FitPredictor._predict_shoe(user, product, product_number)

        # top / bottom: intentamos por letra; si la prenda es numérica (cintura), por número.
        if product_letter is not None:
            return FitPredictor._predict_letter(user, product, domain, product_letter)
        return FitPredictor._predict_numeric_bottom(user, product, product_number)

    # ------------------------------------------------------------------ letras
    @staticmethod
    def _predict_letter(
        user: FitUserInput,
        product: FitProductInput,
        domain: str,
        product_index: int,
    ) -> FitPredictionDTO:
        eng = _Engine()

        user_size = user.top_size if domain == "top" else user.bottom_size
        base_index = _letter_index(user_size)
        part = "parte superior" if domain == "top" else "parte inferior"

        if base_index is not None:
            eng.factors.append(f"Partimos de tu talle de {part} ({LETTER_SCALE[base_index]}).")
        else:
            base_index = _estimate_letter_index_from_body(user.weight, user.height)
            if base_index is not None:
                eng.estimated = True
                eng.factors.append(
                    f"Estimamos tu talle ({LETTER_SCALE[base_index]}) a partir de tu altura y peso."
                )

        # Sin talle ni datos corporales -> invitamos a cargar medidas.
        if base_index is None:
            return FitPredictionDTO(status=FitStatus.MISSING_MEASURES)

        fit_pref = _resolve_fit_preference(user, domain)
        fit_adj = _fit_adjustment(fit_pref)
        pref = _clean(fit_pref)
        if pref in {"ajustado", "regular", "holgado"}:
            _append_fit_factor(eng, pref, part)

        brand_bias = _brand_bias(product.brand)
        if brand_bias is None:
            brand_bias = 0
            eng.factors.append("No tenemos datos de tallaje de la marca; usamos un calce estándar.")
        else:
            eng.brand_known = True
            if brand_bias > 0:
                eng.factors.append(
                    f"La marca {product.brand} suele tener un tallaje chico, conviene subir un talle."
                )
            elif brand_bias < 0:
                eng.factors.append(
                    f"La marca {product.brand} suele tener un tallaje grande, conviene bajar un talle."
                )
            else:
                eng.factors.append(f"La marca {product.brand} tiene un tallaje estándar.")

        # Talle que el usuario debería buscar (etiqueta) para lograr su calce ideal.
        recommended_index = _clamp_index(base_index + fit_adj + brand_bias)
        recommended_size = LETTER_SCALE[recommended_index]

        diff = product_index - recommended_index
        verdict = _verdict_from_diff(diff)

        return FitPredictor._build_ok(
            eng,
            product_size=LETTER_SCALE[product_index],
            recommended_size=recommended_size,
            verdict=verdict,
        )

    # --------------------------------------------------------------- calzado
    @staticmethod
    def _predict_shoe(
        user: FitUserInput,
        product: FitProductInput,
        product_number: Optional[int],
    ) -> FitPredictionDTO:
        if product_number is None:
            return FitPredictionDTO(status=FitStatus.INSUFFICIENT_PRODUCT_DATA)

        user_number = _numeric_size(user.shoe_size)
        if user_number is None:
            # El calzado no se puede estimar de forma confiable desde peso/altura.
            return FitPredictionDTO(status=FitStatus.MISSING_MEASURES)

        eng = _Engine()
        eng.factors.append(f"Tu talle de calzado es {user_number}.")

        shoe_pref = _resolve_fit_preference(user, "shoe")
        shoe_adj = _fit_adjustment(shoe_pref)
        pref = _clean(shoe_pref)
        if pref in {"ajustado", "regular", "holgado"}:
            _append_fit_factor(eng, pref, _PART_LABELS["shoe"])

        brand_bias = _brand_bias(product.brand) or 0
        if _brand_bias(product.brand) is not None:
            eng.brand_known = True
            if brand_bias > 0:
                eng.factors.append(f"La marca {product.brand} suele calzar chico.")
            elif brand_bias < 0:
                eng.factors.append(f"La marca {product.brand} suele calzar grande.")

        recommended_number = user_number + brand_bias + shoe_adj
        diff = product_number - recommended_number
        verdict = _verdict_from_diff(diff)

        return FitPredictor._build_ok(
            eng,
            product_size=str(product_number),
            recommended_size=str(recommended_number),
            verdict=verdict,
        )

    # ------------------------------------------------------- pantalón numérico
    @staticmethod
    def _predict_numeric_bottom(
        user: FitUserInput,
        product: FitProductInput,
        product_number: Optional[int],
    ) -> FitPredictionDTO:
        if product_number is None:
            return FitPredictionDTO(status=FitStatus.INSUFFICIENT_PRODUCT_DATA)

        user_number = _numeric_size(user.bottom_size)
        if user_number is None:
            return FitPredictionDTO(status=FitStatus.MISSING_MEASURES)

        eng = _Engine()
        eng.factors.append(f"Partimos de tu talle de pantalón ({user_number}).")

        bottom_pref = _resolve_fit_preference(user, "bottom")
        fit_adj = _fit_adjustment(bottom_pref) * 2
        pref = _clean(bottom_pref)
        if pref in {"ajustado", "regular", "holgado"}:
            _append_fit_factor(eng, pref, _PART_LABELS["bottom"])

        recommended_number = user_number + fit_adj
        diff_units = product_number - recommended_number
        # Convertimos unidades de cintura a pasos (~2 unidades = 1 paso).
        diff = int(round(diff_units / 2))
        verdict = _verdict_from_diff(diff)

        return FitPredictor._build_ok(
            eng,
            product_size=str(product_number),
            recommended_size=str(recommended_number),
            verdict=verdict,
        )

    # --------------------------------------------------------------- helpers
    @staticmethod
    def _build_ok(
        eng: _Engine,
        product_size: str,
        recommended_size: str,
        verdict: FitVerdict,
    ) -> FitPredictionDTO:
        score = 1.0
        if eng.estimated:
            score -= 0.3
        if not eng.brand_known:
            score -= 0.15
        if not eng.pref_known:
            score -= 0.1
        score = max(0.2, round(score, 2))

        verdict_label = _VERDICT_LABELS[verdict]
        is_match = verdict in {FitVerdict.IDEAL, FitVerdict.TIGHT, FitVerdict.LOOSE}

        if verdict == FitVerdict.IDEAL:
            headline = f"Este talle {product_size} es ideal para vos"
        elif verdict in {FitVerdict.TIGHT, FitVerdict.LOOSE}:
            headline = f"Tu talle ideal es {recommended_size} · este {product_size} {verdict_label.lower()}"
        else:
            headline = f"Te recomendamos talle {recommended_size} · este es {product_size}"

        explanation = " ".join(eng.factors)

        return FitPredictionDTO(
            status=FitStatus.OK,
            product_size=product_size,
            recommended_size=recommended_size,
            verdict=verdict,
            verdict_label=verdict_label,
            headline=headline,
            explanation=explanation,
            confidence=_confidence_from_score(score),
            confidence_score=score,
            factors=eng.factors,
            is_match=is_match,
        )
