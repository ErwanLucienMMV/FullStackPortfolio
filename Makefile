COMPOSE ?= docker compose

COMPOSE_FILES := -f compose.yaml
# This also detects Docker's CLI when it is the Podman compatibility wrapper.
ifneq ($(findstring podman,$(shell $(firstword $(COMPOSE)) --version 2>/dev/null)),)
COMPOSE_FILES += -f compose.podman.yaml
endif

.DEFAULT_GOAL := build
.PHONY: build up down

build:
	$(COMPOSE) $(COMPOSE_FILES) build

up:
	$(COMPOSE) $(COMPOSE_FILES) up -d

down:
	$(COMPOSE) $(COMPOSE_FILES) down
