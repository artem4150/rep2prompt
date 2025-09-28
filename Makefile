SHELL := /bin/bash

export $(shell sed -ne 's/^\s*export\s\+//p' .env 2>/dev/null)
include .env 2>/dev/null || true

.PHONY: up db-up db-down migrate-up migrate-down api

up: db-up

db-up:
	docker compose -f docker-compose.dev.yml up -d db

db-down:
	docker compose -f docker-compose.dev.yml down -v

migrate-up:
	docker run --rm --network host -v $$PWD/backend/migrations:/migrations migrate/migrate:4 \
		-path=/migrations -database "$${DATABASE_URL}" up

migrate-down:
	docker run --rm --network host -v $$PWD/backend/migrations:/migrations migrate/migrate:4 \
		-path=/migrations -database "$${DATABASE_URL}" down 1

api:
	cd backend && go run ./cmd/api
