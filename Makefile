# Convenience wrappers around the two Docker tiers (plain `docker compose` works too).
#
#   make up          start the stateful tier (PostgreSQL, MinIO), then the stateless app
#   make down        stop the app; the stateful tier and ALL data stay untouched
#   make redeploy    rebuild and replace the stateless app (zero data risk)
#   make data-down   stop PostgreSQL + MinIO (volumes are kept)
#   make reset-data  DELETE the database and every uploaded image

DATA = docker compose -f docker-compose.data.yml
APP  = docker compose

.PHONY: up down redeploy data-up data-down ps logs reset-data

up: data-up
	$(APP) up -d --build --wait

data-up:
	$(DATA) up -d --build --wait

down:
	$(APP) down --remove-orphans

redeploy:
	$(APP) up -d --build --wait

data-down:
	$(DATA) down

ps:
	$(DATA) ps
	$(APP) ps

logs:
	$(APP) logs -f

reset-data:
	@printf 'This permanently deletes the database and all uploaded images. Type "delete" to continue: ' && read ans && [ "$$ans" = "delete" ]
	$(APP) down --remove-orphans
	$(DATA) down -v
