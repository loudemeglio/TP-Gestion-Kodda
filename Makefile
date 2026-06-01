# Raíz del repo (donde está este Makefile). El código vive bajo src/: src/backend, src/frontend.
ROOT       := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
SRC        := $(ROOT)/src
BACKEND    := $(SRC)/backend
FRONTEND   := $(SRC)/frontend
COMPOSE    := $(SRC)/docker-compose.yml
UVICORN    := $(BACKEND)/.venv/bin/uvicorn
PIP        := $(BACKEND)/.venv/bin/pip

.PHONY: help install setup-env db-up db-down db-purge db-test-create wait-db backend frontend test pytest stop

help:
	@echo "Estructura: $(ROOT) -> src/ -> backend/ | frontend/"
	@echo ""
	@echo "Objetivos principales:"
	@echo "  make install    - Crea venv en $(BACKEND), pip install y npm install en $(FRONTEND)"
	@echo "  make setup-env  - Copia .env.example -> .env si no existen"
	@echo "  make test       - Entorno local: Postgres + API (:8000) + React (:3000). No ejecuta pytest."
	@echo "  make pytest     - Pytest en BD kodda_test (no vacía mydatabase). make db-purge solo si querés borrar todo."
	@echo "  make db-up      - Solo Postgres (docker compose, puerto host 5433 -> contenedor 5432)"
	@echo "  make db-down    - Detiene contenedores (los datos en volumen persisten)"
	@echo "  make db-purge   - Para Postgres y ELIMINA el volumen (BD vacía la próxima vez; usalo solo a propósito)"
	@echo "  make db-test-create - Crea la base kodda_test si no existe (para pytest)"
	@echo "  Tip: export COMPOSE_PROJECT_NAME=kodda antes de docker compose si movés el repo y querés el mismo volumen."
	@echo "  make backend    - Solo API (http://localhost:8000) — requiere BD y .env"
	@echo "  make frontend   - Solo React (http://localhost:3000); la API debe estar en :8000 para login"
	@echo ""
	@echo "Primer uso: make install && make test"
	@echo "Si no hay ningún admin: en $(BACKEND)/.env poné ALLOW_PUBLIC_SIGNUP=true, creá un usuario y volvé a false."

install:
	cd $(BACKEND) && python3 -m venv .venv && $(PIP) install -r requirements.txt
	cd $(FRONTEND) && npm install

setup-env:
	@test -f $(BACKEND)/.env || cp $(BACKEND)/.env.example $(BACKEND)/.env
	@test -f $(FRONTEND)/.env || cp $(FRONTEND)/.env.example $(FRONTEND)/.env

$(UVICORN): $(BACKEND)/requirements.txt
	cd $(BACKEND) && python3 -m venv .venv && $(PIP) install -r requirements.txt

db-up:
	docker compose -f $(COMPOSE) up -d db

db-down:
	docker compose -f $(COMPOSE) down

# Borra el volumen nombrado de Postgres (pérdida total de datos). Usalo solo cuando quieras empezar de cero.
db-purge:
	docker compose -f $(COMPOSE) down -v
	@echo "Volumen de Postgres eliminado. La próxima vez que corras make db-up la base arrancará vacía."

# Base separada para pytest (TRUNCATE en tests no afecta mydatabase de desarrollo).
db-test-create: db-up wait-db
	@if docker compose -f $(COMPOSE) exec -T db psql -U user -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='kodda_test'" | grep -q 1; then \
		echo "Base kodda_test ya existe."; \
	else \
		docker compose -f $(COMPOSE) exec -T db psql -U user -d postgres -c "CREATE DATABASE kodda_test;"; \
		echo "Creada base kodda_test (pytest). Opcional en .env: PYTEST_DATABASE_URL=postgresql://user:password@localhost:5433/kodda_test"; \
	fi

wait-db:
	@echo "Esperando a Postgres (user@localhost:5433/mydatabase)..."
	@until docker compose -f $(COMPOSE) exec -T db pg_isready -U user -d mydatabase >/dev/null 2>&1; do sleep 1; done
	@echo "Postgres listo."

backend: $(UVICORN)
	@cd $(BACKEND) && \
	if [ -f .env ]; then set -a && . ./.env && set +a; fi && \
	$(UVICORN) main:app --reload --host 0.0.0.0 --port 8000

$(FRONTEND)/node_modules: $(FRONTEND)/package.json
	cd $(FRONTEND) && npm install

frontend: $(FRONTEND)/node_modules
	cd $(FRONTEND) && HOST=0.0.0.0 npm start

# Levanta BD + API + frontend en paralelo (dos procesos en primer plano).
test: setup-env db-up wait-db
	@$(MAKE) -j2 backend frontend

# Tests de integración del backend (requieren PostgreSQL; usa DATABASE_URL del .env del backend).
pytest: $(UVICORN) setup-env db-up wait-db db-test-create
	@cd $(BACKEND) && \
	if [ -f .env ]; then set -a && . ./.env && set +a; fi && \
	DEFAULT_PYTEST_DB_URL="postgresql://user:password@localhost:5433/kodda_test" && \
	export DATABASE_URL="$${PYTEST_DATABASE_URL:-$$DEFAULT_PYTEST_DB_URL}" && \
	export MAIL_SUPPRESS=true && \
	.venv/bin/pytest -v

stop: db-down
