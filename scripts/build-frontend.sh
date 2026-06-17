#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR/frontend"
npm run build

rm -rf "$ROOT_DIR/backend/static"
mkdir -p "$ROOT_DIR/backend/static"
cp -R out/. "$ROOT_DIR/backend/static/"

echo "Frontend built and copied to backend/static"
