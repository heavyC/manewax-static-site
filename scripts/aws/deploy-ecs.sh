#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:?AWS_REGION is required}"
: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID is required}"
: "${ECR_REPOSITORY:?ECR_REPOSITORY is required}"
: "${ECS_CLUSTER:?ECS_CLUSTER is required}"
: "${ECS_SERVICE:?ECS_SERVICE is required}"

IMAGE_TAG="${IMAGE_TAG:-$(date +%Y%m%d%H%M%S)}"
USE_LOCAL_TASK_DEF="${USE_LOCAL_TASK_DEF:-false}"
IMAGE_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG"

bash scripts/aws/ecr-login.sh

if ! aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "ECR access check failed for repository '$ECR_REPOSITORY' in region '$AWS_REGION'."
  echo "Your AWS principal needs at least these ECR actions:"
  echo "  ecr:DescribeRepositories"
  echo "  ecr:BatchCheckLayerAvailability"
  echo "  ecr:InitiateLayerUpload"
  echo "  ecr:UploadLayerPart"
  echo "  ecr:CompleteLayerUpload"
  echo "  ecr:PutImage"
  echo "  ecr:GetAuthorizationToken"
  echo "If the repository does not exist, also add: ecr:CreateRepository"
  exit 1
fi

# if ! aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" --region "$AWS_REGION" >/dev/null 2>&1; then
#   aws ecr create-repository --repository-name "$ECR_REPOSITORY" --region "$AWS_REGION" >/dev/null
#   echo "Created ECR repository: $ECR_REPOSITORY"
# fi

docker build -t "$ECR_REPOSITORY:$IMAGE_TAG" .
docker tag "$ECR_REPOSITORY:$IMAGE_TAG" "$IMAGE_URI"
docker push "$IMAGE_URI"

# ── Resolve task definition ───────────────────────────────────────────────────
# For the first deploy: register from infra/ecs-task-definition.json.
# Subsequent deploys: patch the image in the running service's task definition.

TASK_DEF_FILE="infra/ecs-task-definition.json"

SERVICE_DESC=$(aws ecs describe-services \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --region "$AWS_REGION")

TASK_DEF_ARN=$(echo "$SERVICE_DESC" | jq -r '.services[0].taskDefinition')

if [[ "$USE_LOCAL_TASK_DEF" == "true" || -z "$TASK_DEF_ARN" || "$TASK_DEF_ARN" == "null" ]]; then
  # First deployment or forced template refresh — register from the local template
  if [[ ! -f "$TASK_DEF_FILE" ]]; then
    echo "Error: $TASK_DEF_FILE not found and no existing ECS service task definition."
    exit 1
  fi
  if [[ "$USE_LOCAL_TASK_DEF" == "true" ]]; then
    echo "USE_LOCAL_TASK_DEF=true — registering from $TASK_DEF_FILE"
  else
    echo "No existing task definition found — registering from $TASK_DEF_FILE"
  fi
  INTERPOLATED=$(sed \
    -e "s|YOUR_ACCOUNT_ID|$AWS_ACCOUNT_ID|g" \
    -e "s|YOUR_REGION|$AWS_REGION|g" \
    -e "s|\"image\": \".*\"|\"image\": \"$IMAGE_URI\"|g" \
    "$TASK_DEF_FILE")
  NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
    --region "$AWS_REGION" \
    --cli-input-json "$INTERPOLATED" \
    | jq -r '.taskDefinition.taskDefinitionArn')
else
  # Subsequent deployment — patch image in current task definition
  TASK_DEF_JSON=$(aws ecs describe-task-definition \
    --task-definition "$TASK_DEF_ARN" \
    --region "$AWS_REGION")

  NEW_TASK_DEF=$(echo "$TASK_DEF_JSON" | jq --arg IMAGE_URI "$IMAGE_URI" '
    .taskDefinition
    | .containerDefinitions[0].image = $IMAGE_URI
    | del(
        .taskDefinitionArn,
        .revision,
        .status,
        .requiresAttributes,
        .compatibilities,
        .registeredAt,
        .registeredBy
      )
  ')

  NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
    --region "$AWS_REGION" \
    --cli-input-json "$NEW_TASK_DEF" \
    | jq -r '.taskDefinition.taskDefinitionArn')
fi

aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --task-definition "$NEW_TASK_DEF_ARN" \
  --force-new-deployment \
  --region "$AWS_REGION" >/dev/null

echo "Deployment started"
echo "Image: $IMAGE_URI"
echo "Task definition: $NEW_TASK_DEF_ARN"
