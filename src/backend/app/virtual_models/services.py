import asyncio
import json
import os
import re

import urllib.parse
import httpx

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_TEXT_MODEL = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.5-flash-lite")


GEMINI_API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_TEXT_MODEL}:generateContent"
)

VALID_CATEGORIES = {"upper_body", "lower_body", "dresses"}


async def _analyze_garment_with_gemini(
    garment_description: str,
    garment_image_base64: str,
    image_mime_type: str,
) -> dict:
    """Analiza la prenda con Gemini (texto/visión) para obtener descripción y categoría."""
    prompt = f"""Analizá minuciosamente esta prenda de ropa para un generador de imágenes.

Descripción del vendedor: {garment_description}

Respondé SOLO un JSON válido (sin markdown) con:
- garment_des: Una descripción visual EXTREMADAMENTE DETALLADA en INGLÉS. Incluí colores exactos, patrones, textos escritos, escudos, logos de marcas (ej. Adidas, Nike), posición de las estrellas, tipo de cuello y texturas. Mientras más detallado, mejor la IA podrá recrearlo. Ej: "light blue and white vertically striped football jersey, black collar, golden AFA crest with 3 stars on the left chest, gold Adidas logo on the right, number 10 on the front".
- category: una de upper_body, lower_body, dresses
  - upper_body: remeras, camisas, camperas, sweaters, tops
  - lower_body: pantalones, jeans, shorts, faldas
  - dresses: vestidos y monos de una pieza"""

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": image_mime_type,
                            "data": garment_image_base64,
                        }
                    },
                ]
            }
        ]
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            GEMINI_API_URL,
            params={"key": GEMINI_API_KEY},
            json=payload,
        )

    if response.status_code != 200:
        detail = response.text
        try:
            detail = response.json().get("error", {}).get("message", detail)
        except Exception:
            pass
        raise Exception(f"Gemini API error ({response.status_code}): {detail}")

    data = response.json()
    text = ""
    for part in (data.get("candidates") or [{}])[0].get("content", {}).get("parts") or []:
        if part.get("text"):
            text = part["text"]
            break

    if not text:
        return {
            "garment_des": garment_description,
            "category": "upper_body",
        }

    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return {
            "garment_des": garment_description,
            "category": "upper_body",
        }

    category = str(parsed.get("category", "upper_body")).lower()
    if category not in VALID_CATEGORIES:
        category = "upper_body"

    garment_des = str(parsed.get("garment_des") or garment_description).strip()
    return {"garment_des": garment_des, "category": category}


async def _run_huggingface_image(
    garment_des: str,
    category: str,
) -> str:
    """Ejecuta Hugging Face Inference API para generar la imagen y la devuelve en base64."""
    hf_token = os.getenv("HF_API_TOKEN", "")
    if not hf_token:
        raise Exception("HF_API_TOKEN no está configurado. Creá tu token en huggingface.co.")
        
    headers = {"Authorization": f"Bearer {hf_token}"}
    models_to_try = [
        "black-forest-labs/FLUX.1-schnell",
        "black-forest-labs/FLUX.1-dev",
        "stabilityai/sdxl-turbo",
        "stable-diffusion-v1-5/stable-diffusion-v1-5",
    ]
    
    prompt = (
        f"A real human model wearing an EXACT 1:1 REPLICA of this garment: {garment_des}. "
        f"The clothing item is a {category}. "
        f"CRITICAL: You must perfectly reproduce the exact colors, logos, crests, text, and patterns described. "
        f"The garment is the absolute focus of the image. Photorealistic fashion photography. "
        f"(NO anime, NO 3d render). Plain studio background."
    )
    
    last_error = ""
    async with httpx.AsyncClient(timeout=120.0) as client:
        for model_id in models_to_try:
            api_url = f"https://router.huggingface.co/hf-inference/models/{model_id}"
            
            response = await client.post(
                api_url,
                headers=headers,
                json={"inputs": prompt},
            )
            
            if response.status_code == 200:
                import base64
                encoded = base64.b64encode(response.content).decode("utf-8")
                return f"data:image/jpeg;base64,{encoded}"
            
            detail = response.text
            try:
                detail = response.json().get("error", detail)
            except Exception:
                pass
            
            last_error = f"Model {model_id} failed: {detail}"
            # Si el error es de autenticación o de otra cosa crítica, paramos. Si es 410 o 503, seguimos.
            if response.status_code in (401, 403):
                raise Exception(f"Hugging Face API error ({response.status_code}): {detail}")
            
    raise Exception(f"Hugging Face API error: Todos los modelos fallaron. Último error: {last_error}")


async def generate_virtual_model_image(
    garment_description: str,
    garment_image_base64: str | None = None,
    image_mime_type: str = "image/jpeg",
) -> dict:
    """
    Genera una imagen de un modelo vistiendo la prenda del usuario (virtual try-on).

    Flujo:
    1. Gemini analiza la foto de la prenda (tipo y descripción)
    2. Hugging Face Inference API genera la imagen y la devuelve al frontend
    """
    if not garment_image_base64:
        raise Exception("Tenés que subir una foto de la prenda para generar el modelo.")

    if not GEMINI_API_KEY:
        raise Exception(
            "GEMINI_API_KEY no está configurado. "
            "Agregá tu API key en src/backend/.env y reiniciá el backend."
        )

    try:
        analysis = await _analyze_garment_with_gemini(
            garment_description=garment_description,
            garment_image_base64=garment_image_base64,
            image_mime_type=image_mime_type,
        )

        image_url = await _run_huggingface_image(
            garment_des=analysis["garment_des"],
            category=analysis["category"],
        )

        prompt_used = (
            f"Hugging Face | prenda: {analysis['garment_des']} | "
            f"categoría: {analysis['category']}"
        )

        return {
            "model_image_url": image_url,
            "prompt_used": prompt_used,
            "status": "completed",
        }
    except Exception as e:
        message = str(e)
        if any(
            marker in message
            for marker in (
                "Gemini API error",
                "Hugging Face",
                "HF_API_TOKEN",
                "GEMINI_API_KEY",
                "Tenés que subir",
            )
        ):
            raise
        raise Exception(f"Error generando modelo virtual: {message}")
