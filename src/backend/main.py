from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routes.user_routes import router as user_router

# Crear las tablas en la base de datos
Base.metadata.create_all(bind=engine)

# Este es el objeto "app" que busca Uvicorn
app = FastAPI(
    title="User Management API",
    description="API para gestionar usuarios",
    version="1.0.0"
)

# Configurar CORS para permitir requests desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar los orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir las rutas de usuarios
app.include_router(user_router)


@app.get("/")
def home():
    return {
        "mensaje": "Bienvenido a User Management API",
        "version": "1.0.0",
        "endpoints": {
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