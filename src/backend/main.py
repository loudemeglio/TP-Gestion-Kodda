from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from app.routes.auth_routes import router as auth_router
from app.routes.user_routes import router as user_router
from app.schema_bootstrap import apply_schema_patches

# Crear tablas nuevas; las ya existentes no se modifican solas.
Base.metadata.create_all(bind=engine)
apply_schema_patches(engine)

settings = get_settings()

# Este es el objeto "app" que busca Uvicorn
app = FastAPI(
    title="User Management API",
    description="API para gestionar usuarios",
    version="1.0.0"
)

# Configurar CORS para permitir requests desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(user_router)


@app.get("/")
def home():
    return {
        "mensaje": "Bienvenido a User Management API",
        "version": "1.0.0",
        "endpoints": {
            "login": "POST /api/auth/login",
            "refresh": "POST /api/auth/refresh",
            "logout": "POST /api/auth/logout",
            "me": "GET /api/auth/me",
            "verify_email": "POST /api/auth/verify-email",
            "forgot_password": "POST /api/auth/forgot-password",
            "reset_password": "POST /api/auth/reset-password",
            "resend_verification": "POST /api/auth/resend-verification",
            "crear_usuario": "POST /api/users/",
            "obtener_usuario": "GET /api/users/{user_id}",
            "obtener_usuario_por_username": "GET /api/users/username/{username}",
            "listar_usuarios": "GET /api/users/",
            "actualizar_usuario": "PUT /api/users/{user_id}",
            "eliminar_usuario": "DELETE /api/users/{user_id}",
            "documentacion": "/docs",
        }
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}