# TP-Gestion-Kodda

Tienda online de indumentaria (compra/venta). El código vive bajo `src/` (`backend` en FastAPI, `frontend` en React).

## Requisitos

- Docker y Docker Compose (para Postgres y/o contenedores)
- Python 3 y Node.js (para desarrollo local con el `Makefile` en la raíz del repo)

## Comandos principales (raíz del repositorio)

Desde la carpeta donde está el `Makefile` (no hace falta entrar a `src`):

| Comando | Qué hace |
|--------|----------|
| `make install` | Crea el virtualenv en `src/backend`, instala dependencias de Python y `npm install` en el frontend. **Primera vez obligatorio** antes de desarrollar o correr tests. |
| `make test` | **No ejecuta pytest.** Levanta Postgres (Docker), la API en `http://localhost:8000` y el frontend en `http://localhost:3000` para probar la app en el navegador (dos procesos en paralelo). |
| `make pytest` | Ejecuta los **tests automáticos del backend** (`pytest`). Levanta Postgres si hace falta y usa `DATABASE_URL` de `src/backend/.env` (se crea desde `.env.example` con `setup-env` si no existe). |
| `make backend` | Solo la API en el puerto 8000 (necesitás la base ya levantada). |
| `make frontend` | Solo React en el puerto 3000 (la API suele estar en 8000). |
| `make db-up` / `make db-down` | Levanta o detiene solo el contenedor de Postgres del `docker-compose`. |
| `make stop` | Equivale a bajar el compose (`db-down`). |

**Resumen:** para abrir la web en local usá `make install` (una vez) y después `make test`. Para la suite de tests del backend usá `make pytest`.

### Tests a mano (sin Make)

Con Postgres accesible y variables cargadas:

```bash
cd src/backend
source .venv/bin/activate   # Windows: .venv\Scripts\activate
export DATABASE_URL=postgresql://user:password@localhost:5432/mydatabase
pytest -v
```

## Levantar solo con Docker Compose (sin Make)

1. Entrá a `src`:

   ```bash
   cd src
   ```

2. Levantá los contenedores:

   ```bash
   docker compose up -d --build
   ```

3. Abrí el frontend en el navegador:

   ```
   http://localhost:3000
   ```

## Utilización de IA en el TP

Para el desarrollo de este trabajo práctico, se utilizaron distintas herramientas de Inteligencia Artificial con el objetivo de asistir en diversas etapas del proceso. En particular, se emplearon **Gemini, Claude, ChatGPT y Copilot** como apoyo para la **resolución de dudas sobre el código**, la **creación y mejora de prompts**, la **detección y corrección de errores**, y la **exploración de distintas alternativas de implementación**.

Además, se trabajó con los IDEs **Antigravity, Cursor y Visual Studio Code con GitHub Copilot**, los cuales facilitaron un enfoque de desarrollo orientado a **vibe coding**, **low-code / no-code**, y asistencia inteligente durante la programación. Estas herramientas permitieron agilizar tareas repetitivas, mejorar la productividad y acelerar el proceso de desarrollo y depuración.
