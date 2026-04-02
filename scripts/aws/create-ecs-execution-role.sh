#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-west-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-831869585621}"
ROLE_NAME="${ROLE_NAME:-ecsTaskExecutionRole}"
POLICY_NAME="${POLICY_NAME:-ManewaxEcsExecutionExtras}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

TRUST_POLICY_FILE="$ROOT_DIR/infra/iam/ecs-task-trust-policy.json"
INLINE_POLICY_TEMPLATE="$ROOT_DIR/infra/iam/ecs-task-execution-inline-policy.json"
TMP_INLINE_POLICY="$(mktemp)"
trap 'rm -f "$TMP_INLINE_POLICY"' EXIT

sed \
  -e "s|831869585621|$AWS_ACCOUNT_ID|g" \
  -e "s|us-west-2|$AWS_REGION|g" \
  "$INLINE_POLICY_TEMPLATE" > "$TMP_INLINE_POLICY"

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "Role already exists: $ROLE_NAME"
else
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "file://$TRUST_POLICY_FILE" >/dev/null
  echo "Created role: $ROLE_NAME"
fi

aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy" >/dev/null

aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document "file://$TMP_INLINE_POLICY" >/dev/null

echo "Execution role is ready: arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME"
echo "Next: register the updated task definition and force a new ECS deployment."
