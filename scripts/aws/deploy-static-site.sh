#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-west-2}"
S3_BUCKET="${S3_BUCKET:-${1:-}}"
ENV_FILE="${ENV_FILE:-.env.production}"

if [[ -z "$S3_BUCKET" ]]; then
  echo "S3_BUCKET is required."
  echo "Usage: S3_BUCKET=your-bucket npm run aws:deploy-static"
  echo "   or: bash scripts/aws/deploy-static-site.sh your-bucket"
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

echo "Building static storefront for S3..."
npm run build

echo "Syncing versioned assets to s3://${S3_BUCKET} ..."
aws s3 sync out/ "s3://${S3_BUCKET}" \
  --delete \
  --region "$AWS_REGION" \
  --exclude "*.html" \
  --exclude "404.html" \
  --cache-control "public,max-age=31536000,immutable"

echo "Syncing HTML entry points with no-cache headers..."
aws s3 sync out/ "s3://${S3_BUCKET}" \
  --delete \
  --region "$AWS_REGION" \
  --exclude "*" \
  --include "*.html" \
  --include "404.html" \
  --cache-control "public,max-age=0,must-revalidate"

if [[ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]]; then
  echo "Creating CloudFront invalidation for ${CLOUDFRONT_DISTRIBUTION_ID} ..."
  aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*" >/dev/null
fi

echo "Static storefront deployed successfully to s3://${S3_BUCKET}"
if [[ -n "${NEXT_PUBLIC_API_BASE_URL:-}" ]]; then
  echo "Frontend checkout API: ${NEXT_PUBLIC_API_BASE_URL}"
fi
