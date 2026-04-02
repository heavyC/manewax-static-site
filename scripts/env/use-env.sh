#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"

if [[ "$TARGET" != "sandbox" && "$TARGET" != "production" ]]; then
  echo "Usage: $0 sandbox|production"
  exit 1
fi

SOURCE_FILE=".env.${TARGET}"
TARGET_FILE=".env"

if [[ ! -f "$SOURCE_FILE" ]]; then
  echo "Error: $SOURCE_FILE does not exist."
  exit 1
fi

if [[ -f "$TARGET_FILE" ]]; then
  cp "$TARGET_FILE" ".env.backup.$(date +%Y%m%d%H%M%S)"
fi

cp "$SOURCE_FILE" "$TARGET_FILE"
echo "Now using $SOURCE_FILE -> $TARGET_FILE"
