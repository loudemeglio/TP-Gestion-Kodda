from pydantic import BaseModel
from typing import Optional


class VirtualModelGenerationRequest(BaseModel):
    """Request para generar un modelo virtual."""
    garment_description: str  # Descripción de la prenda
    garment_image_base64: Optional[str] = None  # Imagen de la prenda en base64 (opcional)
    image_mime_type: str = "image/jpeg"  # Tipo MIME de la imagen


class VirtualModelGenerationResponse(BaseModel):
    """Response con la imagen generada del modelo virtual."""
    model_image_url: str  # Data URL de la imagen generada
    prompt_used: str  # El prompt que se usó para generar la imagen
    status: str = "completed"
