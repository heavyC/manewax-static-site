#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:?AWS_REGION is required}"
: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID is required}"

LAMBDA_FUNCTION_NAME="${LAMBDA_FUNCTION_NAME:-manewax-api}"
LAMBDA_ROLE_NAME="${LAMBDA_ROLE_NAME:-manewax-lambda-api-role}"
API_NAME="${API_NAME:-manewax-http-api}"
ENV_FILE="${ENV_FILE:-.env.production}"
ZIP_FILE="dist-lambda/function.zip"

wait_for_lambda_ready() {
  local function_name="$1"
  local max_attempts="${2:-60}"
  local attempt=1

  echo "Waiting for Lambda to become ready: ${function_name}"

  while (( attempt <= max_attempts )); do
    local state
    local last_update_status
    local last_update_reason

    state=$(aws lambda get-function-configuration \
      --function-name "$function_name" \
      --region "$AWS_REGION" \
      --query 'State' \
      --output text 2>/dev/null || echo "Unknown")

    last_update_status=$(aws lambda get-function-configuration \
      --function-name "$function_name" \
      --region "$AWS_REGION" \
      --query 'LastUpdateStatus' \
      --output text 2>/dev/null || echo "Unknown")

    last_update_reason=$(aws lambda get-function-configuration \
      --function-name "$function_name" \
      --region "$AWS_REGION" \
      --query 'LastUpdateStatusReason' \
      --output text 2>/dev/null || true)

    if [[ "$state" == "Active" && "$last_update_status" == "Successful" ]]; then
      echo "Lambda is ready."
      return 0
    fi

    if [[ "$last_update_status" == "Failed" ]]; then
      echo "Lambda update failed: ${last_update_reason:-unknown reason}" >&2
      return 1
    fi

    echo "  still updating... state=${state}, last_update_status=${last_update_status}"
    sleep 5
    ((attempt++))
  done

  echo "Timed out waiting for Lambda to become ready: ${function_name}" >&2
  return 1
}

echo " LAMBDA_FUNCTION_NAME: $LAMBDA_FUNCTION_NAME"
echo " LAMBDA_ROLE_NAME: $LAMBDA_ROLE_NAME"
echo " API_NAME: $API_NAME"
echo " ENV_FILE: $ENV_FILE"


if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

for required_var in DATABASE_URL STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET NEXT_PUBLIC_APP_URL; do
  if [[ -z "${!required_var:-}" ]]; then
    echo "Missing required environment variable: $required_var"
    echo "Set it in your shell or in $ENV_FILE before deploying."
    exit 1
  fi
done

if [[ -z "${ALLOWED_ORIGIN:-}" ]]; then
  export ALLOWED_ORIGIN="$NEXT_PUBLIC_APP_URL"
fi

API_CORS_ORIGINS="$ALLOWED_ORIGIN"
API_CORS_CONFIGURATION="AllowOrigins=${API_CORS_ORIGINS},AllowMethods=GET,POST,PATCH,DELETE,OPTIONS,AllowHeaders=content-type,authorization,stripe-signature,x-cart-session-id,x-user-id,x-clerk-user-id,AllowCredentials=true"

npm run package:lambda

ROLE_ARN="${LAMBDA_ROLE_ARN:-arn:aws:iam::${AWS_ACCOUNT_ID}:role/${LAMBDA_ROLE_NAME}}"
if ! aws iam get-role --role-name "$LAMBDA_ROLE_NAME" >/dev/null 2>&1 && [[ -z "${LAMBDA_ROLE_ARN:-}" ]]; then
  echo "Lambda role not found: $ROLE_ARN"
  echo "Run: npm run aws:create-lambda-role"
  exit 1
fi

ENVIRONMENT_JSON=$(python3 - <<'PY'
import json, os
keys = [
    "DATABASE_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PROMO_EARLYBIRD_ID",
    "NEXT_PUBLIC_APP_URL",
    "ALLOWED_ORIGIN",
]
values = {k: os.environ[k] for k in keys if os.environ.get(k)}
print(json.dumps({"Variables": values}))
PY
)

if aws lambda get-function --function-name "$LAMBDA_FUNCTION_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  wait_for_lambda_ready "$LAMBDA_FUNCTION_NAME"

  aws lambda update-function-code \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --zip-file "fileb://${ZIP_FILE}" \
    --region "$AWS_REGION" >/dev/null

  wait_for_lambda_ready "$LAMBDA_FUNCTION_NAME"

  aws lambda update-function-configuration \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --runtime nodejs20.x \
    --handler handler.handler \
    --role "$ROLE_ARN" \
    --timeout 30 \
    --memory-size 512 \
    --environment "$ENVIRONMENT_JSON" \
    --region "$AWS_REGION" >/dev/null

  wait_for_lambda_ready "$LAMBDA_FUNCTION_NAME"
  echo "Updated Lambda function: $LAMBDA_FUNCTION_NAME"
else
  aws lambda create-function \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --runtime nodejs20.x \
    --handler handler.handler \
    --role "$ROLE_ARN" \
    --timeout 30 \
    --memory-size 512 \
    --environment "$ENVIRONMENT_JSON" \
    --zip-file "fileb://${ZIP_FILE}" \
    --region "$AWS_REGION" >/dev/null

  wait_for_lambda_ready "$LAMBDA_FUNCTION_NAME"
  echo "Created Lambda function: $LAMBDA_FUNCTION_NAME"
fi

API_ID=$(aws apigatewayv2 get-apis \
  --region "$AWS_REGION" \
  --query "Items[?Name=='${API_NAME}'].ApiId | [0]" \
  --output text)

if [[ -z "$API_ID" || "$API_ID" == "None" ]]; then
  API_ID=$(aws apigatewayv2 create-api \
    --name "$API_NAME" \
    --protocol-type HTTP \
    --cors-configuration "$API_CORS_CONFIGURATION" \
    --region "$AWS_REGION" \
    --query 'ApiId' \
    --output text)

  aws apigatewayv2 create-stage \
    --api-id "$API_ID" \
    --stage-name '$default' \
    --auto-deploy \
    --region "$AWS_REGION" >/dev/null

  echo "Created HTTP API: $API_NAME ($API_ID)"
else
  echo "Using existing HTTP API: $API_NAME ($API_ID)"
fi

aws apigatewayv2 update-api \
  --api-id "$API_ID" \
  --cors-configuration "$API_CORS_CONFIGURATION" \
  --region "$AWS_REGION" >/dev/null

echo "Synced HTTP API CORS origins: $API_CORS_ORIGINS"

LAMBDA_URI="arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${LAMBDA_FUNCTION_NAME}/invocations"
INTEGRATION_ID=$(aws apigatewayv2 get-integrations \
  --api-id "$API_ID" \
  --region "$AWS_REGION" \
  --query "Items[?IntegrationUri=='${LAMBDA_URI}'].IntegrationId | [0]" \
  --output text)

if [[ -z "$INTEGRATION_ID" || "$INTEGRATION_ID" == "None" ]]; then
  INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --integration-type AWS_PROXY \
    --integration-uri "$LAMBDA_URI" \
    --payload-format-version 2.0 \
    --region "$AWS_REGION" \
    --query 'IntegrationId' \
    --output text)
fi

for route_key in "ANY /api" "ANY /api/{proxy+}"; do
  ROUTE_ID=$(aws apigatewayv2 get-routes \
    --api-id "$API_ID" \
    --region "$AWS_REGION" \
    --query "Items[?RouteKey=='${route_key}'].RouteId | [0]" \
    --output text)

  if [[ -z "$ROUTE_ID" || "$ROUTE_ID" == "None" ]]; then
    aws apigatewayv2 create-route \
      --api-id "$API_ID" \
      --route-key "$route_key" \
      --target "integrations/${INTEGRATION_ID}" \
      --region "$AWS_REGION" >/dev/null
  fi
done

STATEMENT_ID="${API_ID}-invoke"
if ! aws lambda get-policy --function-name "$LAMBDA_FUNCTION_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  aws lambda add-permission \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --statement-id "$STATEMENT_ID" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${AWS_REGION}:${AWS_ACCOUNT_ID}:${API_ID}/*/*" \
    --region "$AWS_REGION" >/dev/null
else
  POLICY=$(aws lambda get-policy --function-name "$LAMBDA_FUNCTION_NAME" --region "$AWS_REGION" --query 'Policy' --output text)
  if [[ "$POLICY" != *"$STATEMENT_ID"* ]]; then
    aws lambda add-permission \
      --function-name "$LAMBDA_FUNCTION_NAME" \
      --statement-id "$STATEMENT_ID" \
      --action lambda:InvokeFunction \
      --principal apigateway.amazonaws.com \
      --source-arn "arn:aws:execute-api:${AWS_REGION}:${AWS_ACCOUNT_ID}:${API_ID}/*/*" \
      --region "$AWS_REGION" >/dev/null
  fi
fi

API_ENDPOINT=$(aws apigatewayv2 get-api --api-id "$API_ID" --region "$AWS_REGION" --query 'ApiEndpoint' --output text)

echo "Lambda API deployed successfully"
echo "API base URL: ${API_ENDPOINT}/api"
echo "Set NEXT_PUBLIC_API_BASE_URL=${API_ENDPOINT}/api on the S3 frontend"
