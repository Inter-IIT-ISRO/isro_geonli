#!/bin/bash

COMPOSE_FILE="$(dirname "$0")/docker-compose.core.yml"

docker compose -f "$COMPOSE_FILE" logs -f backend
# docker compose -f "$COMPOSE_FILE" logs -f frontend
# docker compose -f "$COMPOSE_FILE" logs mongodb
# docker compose -f "$COMPOSE_FILE" logs minio-init

