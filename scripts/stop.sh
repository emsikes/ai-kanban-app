#!/usr/bin/env bash
set -euo pipefail

CONTAINER="pm-app"

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
echo "Stopped $CONTAINER"
