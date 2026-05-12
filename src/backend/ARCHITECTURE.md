# Arquitectura del backend

## Organización por dominio

El código se agrupa para que nuevos módulos (p. ej. catálogo de productos) no mezclen responsabilidades con usuarios.

```
app/
├── core/                    # Infraestructura compartida (no es dominio de negocio)
│   ├── config.py            # Variables de entorno / settings
│   ├── database.py          # Engine, Session, Base, get_db
│   ├── schema_bootstrap.py  # Parches DDL al arranque (PostgreSQL)
│   ├── tokens.py            # JWT acceso
│   └── mail_service.py      # Envío SMTP (suprimible en dev)
│
└── users/                   # Dominio: cuentas, auth, verificación y reset de email
    ├── models.py            # User, tokens ORM
    ├── schemas.py           # DTOs Pydantic (usuario + auth)
    ├── permissions.py       # Helpers de rol (decoradores / Depends)
    ├── deps/
    │   └── auth.py          # JWT → usuario actual
    ├── repositories/
    ├── services/
    └── routes/
        ├── auth.py          # /api/auth/*
        └── users.py         # /api/users/*

main.py                      # FastAPI, CORS, include_router, create_all
```

## Flujo de capas (dentro de `users`)

```
routes → services → repositories → models (SQLAlchemy) + core.database
```

- **Routes**: HTTP, validación de entrada con schemas, códigos de error.
- **Services**: reglas de negocio, hashing, orquestación.
- **Repositories**: consultas y commits sobre la sesión.
- **Models**: tablas y relaciones.
- **Schemas**: contratos de API (request/response).

## Próximos dominios

Para productos u órdenes, añadir paquetes paralelos (`app/catalog/`, …) con la misma idea: `models`, `schemas`, `repositories`, `services`, `routes`, e importar routers desde `main.py`.
