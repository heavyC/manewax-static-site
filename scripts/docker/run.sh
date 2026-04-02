#!/usr/bin/env bash
# scripts/docker/run.sh
# Runs the manewax Docker image with env vars from the active .env file.
# Docker --env-file does not strip surrounding quotes, so we preprocess here.

set -euo pipefail

ENV_FILE="${1:-.env}"
IMAGE="${2:-manewax:latest}"
PORT="${PORT:-3000}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found. Run 'npm run env:use:sandbox' first."
  exit 1
fi

# Strip surrounding single or double quotes from values, skip comments/blanks
TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT

grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$' | \
  sed "s/^\([A-Za-z_][A-Za-z0-9_]*\)=['\"]\\(.*\\)['\"]$/\1=\2/" > "$TMPFILE"

docker run --rm -p "${PORT}:3000" --env-file "$TMPFILE" "$IMAGE"
