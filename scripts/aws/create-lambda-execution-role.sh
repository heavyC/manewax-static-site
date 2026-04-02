#!/usr/bin/env bash
set -euo pipefail

: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID is required}"
LAMBDA_ROLE_NAME="${LAMBDA_ROLE_NAME:-manewax-lambda-api-role}"
TRUST_POLICY_FILE="infra/iam/lambda-trust-policy.json"
ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${LAMBDA_ROLE_NAME}"

echo "Lambda role LAMBDA_ROLE_NAME: $LAMBDA_ROLE_NAME"
echo "Lambda role ROLE_ARN: $ROLE_ARN"

if [[ ! -f "$TRUST_POLICY_FILE" ]]; then
  echo "Missing trust policy file: $TRUST_POLICY_FILE"
  exit 1
fi

if aws iam get-role --role-name "$LAMBDA_ROLE_NAME" >/dev/null 2>&1; then
  echo "Lambda role already exists: $ROLE_ARN"
else
  aws iam create-role \
    --role-name "$LAMBDA_ROLE_NAME" \
    --assume-role-policy-document "file://$TRUST_POLICY_FILE" >/dev/null

  aws iam attach-role-policy \
    --role-name "$LAMBDA_ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole >/dev/null

  echo "Created Lambda execution role: $ROLE_ARN"
fi

echo "Role ARN: $ROLE_ARN"
