.PHONY: dev build stop logs reset install

## Start the full stack (DB + API + admin dashboard)
dev:
	docker compose up --build

## Build images without starting
build:
	docker compose build

## Stop all containers
stop:
	docker compose down

## Tail logs from all services
logs:
	docker compose logs -f

## Wipe all data volumes and rebuild from scratch
reset:
	docker compose down -v
	docker compose up --build

## Install deps locally (without Docker) for IDE support
install:
	cd backend && npm install
	cd admin && npm install
