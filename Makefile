.DEFAULT_GOAL := help
SHELL := /bin/bash

.PHONY: help install up down dev dev-api dev-web build test test-unit test-int test-e2e lint typecheck seed clean prod prod-migrate

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	bun install

up: ## Start Postgres via Docker (dev mode — API and Web run locally)
	docker-compose up -d postgres
	@echo "Waiting for Postgres to be healthy..."
	@n=0; until [ "$$(docker inspect --format='{{.State.Health.Status}}' windows-explorer-db 2>/dev/null)" = "healthy" ]; do \
	  n=$$((n+1)); [ $$n -ge 40 ] && { echo "Postgres failed to become healthy after 40s"; exit 1; }; sleep 1; done
	@echo "Postgres is ready"

down: ## Stop Docker services
	docker-compose down

db-migrate: up ## Run database migrations
	bun run --cwd apps/api db:migrate

seed: db-migrate ## Seed the database with demo data
	bun run --cwd apps/api db:seed

dev: up db-migrate ## Start full dev stack (DB + API + Web)
	@echo "Starting development servers..."
	bun run dev

dev-api: up ## Start API dev server only
	bun run dev:api

dev-web: ## Start Web dev server only
	bun run dev:web

build: ## Build all apps
	bun run build

test: ## Run all tests
	bun run test

test-unit: ## Run unit tests only
	bun run test:unit

test-int: up db-migrate ## Run integration tests (requires DB)
	bun run test:int

test-e2e: ## Run E2E tests (requires running stack: make dev in another terminal)
	bun run --cwd apps/web test:e2e

lint: ## Lint all packages
	bun run lint

typecheck: ## Type-check all packages
	bun run typecheck

prod: ## Build and start full stack via Docker (production mode, web on :8080)
	docker-compose build
	docker-compose up

prod-migrate: ## Run DB migrations inside the running production API container
	docker-compose exec api bun run db:migrate

clean: ## Remove build artifacts and dependencies
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	rm -rf apps/*/dist packages/*/dist
	docker-compose down -v
