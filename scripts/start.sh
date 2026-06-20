#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
IMAGE="pm-app"
CONTAINER="pm-app"
PORT="${PORT:-8000}"

docker build -t "$IMAGE" "$ROOT_DIR"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
# -e OPENAI_API_KEY forwards the host value (if set) for the AI features.
# Override the host port with PORT=8080 ./scripts/start.sh if 8000 is taken.
docker run -d --name "$CONTAINER" -e OPENAI_API_KEY -p "${PORT}:8000" "$IMAGE"

echo "Running at http://localhost:${PORT}"
