.DEFAULT_GOAL := help
SHELL := /bin/bash

.PHONY: help install up down dev dev-api dev-web build test test-unit test-int test-e2e lint typecheck seed clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	bun install

up: ## Start Docker services (Postgres)
	docker compose up -d
	@echo "Waiting for Postgres to be ready..."
	@until docker compose exec postgres pg_isready -U explorer -d explorer 2>/dev/null; do sleep 1; done
	@echo "Postgres is ready"

down: ## Stop Docker services
	docker compose down

db-migrate: up ## Run database migrations
	bun run --cwd apps/api db:migrate

seed: db-migrate ## Seed the database with demo data
	bun run --cwd apps/api db:seed

dev: install up db-migrate ## Start full dev stack (DB + API + Web)
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

test-e2e: dev ## Run E2E tests (requires full stack)
	bun run --cwd apps/web test:e2e

lint: ## Lint all packages
	bun run lint

typecheck: ## Type-check all packages
	bun run typecheck

clean: ## Remove build artifacts and dependencies
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	rm -rf apps/*/dist packages/*/dist
	docker compose down -v
