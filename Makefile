COMPOSE ?= docker compose

.DEFAULT_GOAL := build
.PHONY: build up down

build:
	$(COMPOSE) build

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down
