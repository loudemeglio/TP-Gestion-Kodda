# Arquitectura User Management API

## Capas de la Aplicación

```
ROUTES (user_routes.py) → SERVICES (user_service.py) → REPOSITORIES (user_repository.py) → DATABASE
```

## Estructura de Archivos

```
app/
├── __init__.py
├── models.py              # Modelos SQLAlchemy (User)
├── schemas.py             # DTOs Pydantic (UserCreateDTO, UserUpdateDTO, UserDTO)
├── database.py            # Configuración SQLAlchemy
├── repositories/
│   ├── __init__.py
│   └── user_repository.py # Acceso a datos
├── services/
│   ├── __init__.py
│   └── user_service.py    # Lógica de negocio
└── routes/
    ├── __init__.py
    └── user_routes.py     # Endpoints

main.py                   # Punto de entrada FastAPI
requirements.txt          # Dependencias
```

## Capas

- **Routes**: Endpoints de la API, manejo de requests/responses
- **Services**: Lógica de negocio, validaciones, encriptación
- **Repositories**: Acceso a datos, operaciones CRUD
- **Models**: Entidades SQLAlchemy
- **Schemas**: DTOs y validaciones Pydantic
- **Database**: Configuración de conexión y sesiones
