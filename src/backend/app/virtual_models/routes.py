from fastapi import APIRouter, HTTPException, Depends
from app.users.deps.auth import get_current_user
from app.virtual_models.schemas import VirtualModelGenerationRequest, VirtualModelGenerationResponse
from app.virtual_models.services import generate_virtual_model_image

router = APIRouter(prefix="/api/virtual-models", tags=["virtual-models"])


@router.post("/generate", response_model=VirtualModelGenerationResponse)
async def generate_model(
    request: VirtualModelGenerationRequest,
    current_user = Depends(get_current_user)
):
    """
    Genera una imagen de un modelo vistiendo la prenda del usuario (virtual try-on con IA).

    Usa Gemini para analizar la prenda y Replicate IDM-VTON para generar la imagen.
    
    Solo usuarios autenticados pueden usar esta función.
    
    Args:
        request: Contiene descripción de la prenda
        current_user: Usuario autenticado (inyectado)
        
    Returns:
        VirtualModelGenerationResponse con imagen generada
        
    Raises:
        HTTPException: Si falla la generación
    """
    try:
        result = await generate_virtual_model_image(
            garment_description=request.garment_description,
            garment_image_base64=request.garment_image_base64,
            image_mime_type=request.image_mime_type,
        )
        return VirtualModelGenerationResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generando modelo virtual: {str(e)}"
        )
