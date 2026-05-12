from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import Base, engine
from app.core.schema_bootstrap import apply_schema_patches
from app.users.routes.auth import router as auth_router
from app.users.routes.users import router as users_router

# Los routers importan modelos SQLAlchemy → metadata registrada antes de create_all
Base.metadata.create_all(bind=engine)
apply_schema_patches(engine)

settings = get_settings()

app = FastAPI(
    title="User Management API",
    description="API para gestionar usuarios",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)


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
        },
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
