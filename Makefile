# Raíz del repo (donde está este Makefile). El código vive bajo src/: src/backend, src/frontend.
ROOT       := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
SRC        := $(ROOT)/src
BACKEND    := $(SRC)/backend
FRONTEND   := $(SRC)/frontend
COMPOSE    := $(SRC)/docker-compose.yml
UVICORN    := $(BACKEND)/.venv/bin/uvicorn
PIP        := $(BACKEND)/.venv/bin/pip

.PHONY: help install setup-env db-up db-down wait-db backend frontend test pytest stop

help:
	@echo "Estructura: $(ROOT) -> src/ -> backend/ | frontend/"
	@echo ""
	@echo "Objetivos principales:"
	@echo "  make install    - Crea venv en $(BACKEND), pip install y npm install en $(FRONTEND)"
	@echo "  make setup-env  - Copia .env.example -> .env si no existen"
	@echo "  make test       - Entorno local: Postgres + API (:8000) + React (:3000). No ejecuta pytest."
	@echo "  make pytest     - Tests automáticos del backend (pytest); levanta Postgres si hace falta."
	@echo "  make db-up      - Solo Postgres (docker compose, puerto 5432)"
	@echo "  make db-down    - Detiene contenedores del compose"
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

wait-db:
	@echo "Esperando a Postgres (user@localhost:5432/mydatabase)..."
	@until docker compose -f $(COMPOSE) exec -T db pg_isready -U user -d mydatabase >/dev/null 2>&1; do sleep 1; done
	@echo "Postgres listo."

backend: $(UVICORN)
	@cd $(BACKEND) && \
	if [ -f .env ]; then set -a && . ./.env && set +a; fi && \
	$(UVICORN) main:app --reload --host 0.0.0.0 --port 8000

$(FRONTEND)/node_modules: $(FRONTEND)/package.json
	cd $(FRONTEND) && npm install

frontend: $(FRONTEND)/node_modules
	cd $(FRONTEND) && npm start

# Levanta BD + API + frontend en paralelo (dos procesos en primer plano).
test: setup-env db-up wait-db
	@$(MAKE) -j2 backend frontend

# Tests de integración del backend (requieren PostgreSQL; usa DATABASE_URL del .env del backend).
pytest: $(UVICORN) setup-env db-up wait-db
	@cd $(BACKEND) && \
	if [ -f .env ]; then set -a && . ./.env && set +a; fi && \
	.venv/bin/pytest -v

stop: db-down
