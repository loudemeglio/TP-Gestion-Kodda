from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.core.database import Base, engine
from app.core.schema_bootstrap import apply_schema_patches
from app.users.routes.auth import router as auth_router
from app.users.routes.users import router as users_router
from app.products.routes.products import router as catalog_router
from app.cart.routes.cart import router as cart_router
from app.orders.routes.orders import router as orders_router
from app.payments.routes.payments import router as payments_router
from app.ratings.routes.ratings import router as ratings_router
from app.buyer_reviews.routes.buyer_reviews import router as buyer_reviews_router
from app.notifications.routes.notifications import router as notifications_router
from app.moderation.routes.admin_moderation import router as admin_moderation_router
from app.metrics.routes import router as metrics_router
import app.products.models  # noqa: F401 — registra metadata antes de create_all
import app.cart.models  # noqa: F401 — registra metadata antes de create_all
import app.users.models  # noqa: F401 — registra metadata antes de create_all
import app.orders.models  # noqa: F401 — registra metadata antes de create_all
import app.payments.models  # noqa: F401 — registra metadata antes de create_all
import app.ratings.models  # noqa: F401 — registra metadata antes de create_all
import app.buyer_reviews.models  # noqa: F401 — registra metadata antes de create_all
import app.notifications.models  # noqa: F401 — registra metadata antes de create_all
import app.system_settings.models  # noqa: F401 — registra metadata antes de create_all

# Los routers importan modelos SQLAlchemy → metadata registrada antes de create_all
Base.metadata.create_all(bind=engine)
apply_schema_patches(engine)

settings = get_settings()

upload_path = Path(settings.upload_dir)
upload_path.mkdir(parents=True, exist_ok=True)
(upload_path / "avatars").mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Kodda API",
    description=(
        "Backend de usuarios y autenticación. **Probar registro:** abrí `/docs`, "
        "**POST /api/users/** (cuerpo JSON: username, email, password) con "
        "`ALLOW_PUBLIC_SIGNUP=true` en `.env`. Para exigir correo verificado antes del login: "
        "`REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN=true`. Con `MAIL_SUPPRESS=true` el enlace de "
        "verificación solo se imprime en la consola del servidor, no llega a la bandeja."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(catalog_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(payments_router)
app.include_router(ratings_router)
app.include_router(buyer_reviews_router)
app.include_router(notifications_router)
app.include_router(admin_moderation_router)
app.include_router(metrics_router)


@app.get("/")
def home():
    return {
        "mensaje": "Bienvenido a User Management API",
        "version": "1.0.0",
        "endpoints": {
            "register": "POST /api/users/ (con ALLOW_PUBLIC_SIGNUP=true)",
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
            "mi_perfil": "GET /api/users/me/profile",
            "editar_mi_perfil": "PATCH /api/users/me/profile",
            "subir_avatar": "POST /api/users/me/avatar",
            "mis_datos_facturacion": "GET /api/users/me/billing",
            "guardar_datos_facturacion": "PUT /api/users/me/billing",
            "checkout": "POST /api/orders/checkout",
            "mis_ordenes": "GET /api/orders/me",
            "detalle_orden": "GET /api/orders/{order_id}",
            "eliminar_usuario": "DELETE /api/users/{user_id}",
            "documentacion": "/docs",
        },
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}

