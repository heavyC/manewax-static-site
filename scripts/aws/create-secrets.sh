#!/usr/bin/env bash
# scripts/aws/create-secrets.sh
# Creates AWS Secrets Manager entries for all Manewax runtime secrets.
# Run once before first deployment. Defaults to .env if no file is provided.
#
# Usage:
#   export AWS_REGION=us-east-1
#   export AWS_ACCOUNT_ID=123456789012
#   ./scripts/aws/create-secrets.sh [env-file] [secret-namespace]
#
# Example:
#   ./scripts/aws/create-secrets.sh .env.sandbox manewax-sandbox
#   ./scripts/aws/create-secrets.sh .env.production manewax
#
# To update an existing secret, use:
#   aws secretsmanager put-secret-value --secret-id manewax/SECRET_NAME --secret-string "new-value"

set -euo pipefail

: "${AWS_REGION:?Set AWS_REGION before running}"
: "${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID before running}"

ENV_FILE="${1:-.env}"
SECRET_NAMESPACE="${2:-manewax}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file '$ENV_FILE' not found."
  echo "Usage: $0 [path/to/env-file]"
  exit 1
fi

# Load env file, ignoring comments and blank lines
declare -A SECRETS
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  SECRETS["$key"]="${value//\"/}"
done < <(grep -v '^#' "$ENV_FILE" | grep '=')

SECRET_NAMES=(
  "DATABASE_URL"
  "CLERK_SECRET_KEY"
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  "STRIPE_SECRET_KEY"
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "STRIPE_PROMO_EARLYBIRD_ID"
)

for name in "${SECRET_NAMES[@]}"; do
  secret_id="${SECRET_NAMESPACE}/${name}"
  value="${SECRETS[$name]:-}"

  if [[ -z "$value" ]]; then
    echo "⚠  Skipping $name — not found in $ENV_FILE"
    continue
  fi

  # Check if secret already exists
  if aws secretsmanager describe-secret --secret-id "$secret_id" --region "$AWS_REGION" &>/dev/null; then
    echo "✓  $secret_id already exists — skipping (use put-secret-value to update)"
  else
    aws secretsmanager create-secret \
      --name "$secret_id" \
      --secret-string "$value" \
      --region "$AWS_REGION" \
      --description "Manewax runtime secret: $name" \
      --output text --query 'ARN'
    echo "✓  Created $secret_id"
  fi
done

echo ""
echo "Done. If needed, update infra/ecs-task-definition.json secret ARNs to match namespace: ${SECRET_NAMESPACE}"
