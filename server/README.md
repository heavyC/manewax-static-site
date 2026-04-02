# Optional Backend for Static Hosting

This folder preserves the former Next.js server-only code that cannot run from a static S3 bucket.

## Contains

- `api/` — former `app/api` route handlers for cart, checkout, Stripe promo validation, and webhooks
- `middleware.ts.disabled` — the former Clerk middleware, kept only for reference

## Use this when

You want the frontend hosted as static files on S3, but still need:

- Stripe Checkout session creation
- Stripe webhook processing
- Secure promo validation
- Database-backed cart persistence

Deploy these handlers behind API Gateway/Lambda or another small Node runtime, then set:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api
```

For local development, run the local API in a second terminal:

```bash
npm run dev:api
```

Then run the frontend normally:

```bash
npm run dev
```

## Included AWS helpers

```bash
npm run aws:create-lambda-role
npm run aws:deploy-lambda-api
```

These use:
- `scripts/aws/create-lambda-execution-role.sh`
- `scripts/aws/deploy-lambda-api.sh`
- `server/lambda/handler.ts`
