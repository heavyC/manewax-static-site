# Static S3 Deployment

## What changed

- The storefront now builds with `output: "export"`.
- `npm run build` writes static assets to `out/`.
- Cart state is stored in browser `localStorage`, so browsing and cart UX still work on a purely static host.
- The old Next server routes were moved to `server/api/` for optional separate deployment.

## Deploy the frontend to S3

```bash
npm install
npm run build
aws s3 sync out/ s3://your-static-site-bucket --delete
```

Or use the included helper:

```bash
export AWS_REGION="us-west-2"
export S3_BUCKET="your-static-site-bucket"
export ENV_FILE=".env.production"
# Optional when using CloudFront in front of S3
export CLOUDFRONT_DISTRIBUTION_ID="E1234567890"

npm run aws:deploy-static
```

## Environment variables

### Safe for the static frontend

```bash
NEXT_PUBLIC_APP_URL=https://www.example.com
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
# Optional for cross-origin API calls from S3 website + CloudFront/custom domain
ALLOWED_ORIGIN=https://www.example.com,http://your-bucket.s3-website-us-west-2.amazonaws.com
```

### Optional at build time only

```bash
DATABASE_URL=...
```

If `DATABASE_URL` is available during `next build`, product pages are generated from Neon. If not, the mock catalog is used.

## What cannot run inside S3 alone

These features still require a server-side runtime because they use secrets or webhook verification:

- Stripe Checkout session creation
- Stripe webhooks
- Secure promo validation tied to Stripe/Neon
- Any authenticated server-side cart persistence

If you want those features live in production, deploy `server/api/` behind API Gateway/Lambda, CloudFront behaviors, or another small Node service and point `NEXT_PUBLIC_API_BASE_URL` to it.
## Deploy the preserved backend to Lambda

```bash
export AWS_REGION="us-west-2"
export AWS_ACCOUNT_ID="123456789012"
export ENV_FILE=".env.production"

npm run aws:create-lambda-role
npm run aws:deploy-lambda-api
```

The deploy script will:
- build and zip `dist-lambda/function.zip`
- create or update the `manewax-api` Lambda function
- create or reuse an HTTP API Gateway
- configure `/api` and `/api/{proxy+}` routes
- print the value to use for `NEXT_PUBLIC_API_BASE_URL`
