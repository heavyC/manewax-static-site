# Manewax Ecommerce Website

A modern ecommerce website built with Next.js, now simplified for **static S3 hosting** with an exported frontend in `out/`.

> The storefront can now be deployed as a static site to **AWS S3**. Product pages can still be generated from **Neon** at build time, while any secure Stripe/database operations must live behind a small separate API.

## Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: Clerk
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Project Setup

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Neon PostgreSQL database
- Clerk account for authentication

### Environment Variables

Use this scheme:

- `.env.sandbox` for local sandbox/test accounts
- `.env.production` for local production/live account testing
- `.env` as the active file used by Next.js and Docker locally

Bootstrap files:

```bash
cp .env.sandbox.example .env.sandbox
cp .env.production.example .env.production
npm run env:use:sandbox   # or: npm run env:use:production
```

Minimum variables needed in each env file:

```bash
# Database
DATABASE_URL="your-neon-postgres-connection-string"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your-clerk-publishable-key"
CLERK_SECRET_KEY="your-clerk-secret-key"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"

# Optional: Additional configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Notes:
- Keep sandbox keys in `.env.sandbox` and live keys in `.env.production`.
- Never commit populated env files.
- If keys were ever shared or exposed, rotate them in Clerk, Stripe, and Neon.

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Set up the database schema:

```bash
npm run db:generate  # Generate Drizzle schema
npm run db:migrate   # Run migrations
```

3. Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Development Guidelines

### Database Management
- Use Drizzle ORM for all database interactions
- Define schemas in `lib/db/schema/`
- Run `npm run db:generate` after schema changes
- Use proper relations and foreign keys for ecommerce entities

### Authentication
- Clerk handles all authentication flows
- Use `auth()` in Server Components
- Use `useUser()` in Client Components
- Implement role-based access control where needed

### UI Components
- Use shadcn/ui components for consistency
- Add new components with: `npx shadcn-ui@latest add [component]`
- Custom ecommerce components go in `components/ecommerce/`
- Ensure mobile responsiveness and accessibility

### Project Structure
```
app/
├── (dashboard)/      # Admin/seller dashboard
├── (shop)/          # Customer-facing pages
├── api/             # API routes
├── globals.css      # Global styles
├── layout.tsx       # Root layout
└── page.tsx         # Homepage

components/
├── ui/              # shadcn/ui components
├── ecommerce/       # Business-specific components
└── ...

lib/
├── db/              # Database schemas and utilities
├── auth/            # Clerk utilities
├── utils/           # General utilities
└── validations/     # Zod schemas
```

## Ecommerce Features

This application includes standard ecommerce functionality:

- **Product Management**: Catalog, variants, inventory tracking
- **Shopping Cart**: Persistent cart with session management
- **User Accounts**: Customer profiles, order history, addresses
- **Order Processing**: Checkout flow, payment integration, order tracking
- **Admin Dashboard**: Product management, order fulfillment, analytics

## Owner Fulfillment Dashboard

A minimal password-protected fulfillment dashboard is now available at:

```text
/dashboard/
```

It is designed for a simple workflow and includes:

- **Open vs fulfilled order views**
- **Returned and refunded order states**
- **Per-order item visibility** with product names, quantities, and totals
- **Shipping details** needed to pack and mail orders
- **Admin-only updates** for status, carrier, tracking, and internal notes
- **Viewer access** for read-only order visibility

### Clerk role setup

Owner logins are managed by **Clerk**. To grant access, assign one of these role values in the user’s Clerk metadata:

- `dashboardRole: "admin"`
- `dashboardRole: "viewer"`

The dashboard also accepts `role` with the same values if you prefer that naming. Users without one of those roles are blocked from the dashboard.

> After pulling these changes, run `npm run db:migrate` so the new fulfillment fields are added to the `orders` table.

## Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate Drizzle schema
npm run db:migrate      # Run database migrations
npm run db:studio       # Open Drizzle Studio
npm run db:seed         # Seed database with sample data

# Code Quality
npm run lint           # Run ESLint
npm run type-check     # Run TypeScript checks
```

## Contributing

1. Follow the coding standards defined in [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
2. All features must consider ecommerce business logic
3. Use the established tech stack (Neon/Drizzle, Clerk, shadcn)
4. Ensure mobile responsiveness and accessibility
5. Add proper error handling and loading states

## Documentation

- **[Development Guidelines](.github/copilot-instructions.md)** - Complete coding standards and project requirements
- **[Database Schema Reference](docs/database-schema.md)** - Drizzle schema patterns for ecommerce data models
- **[Development Workflow Guide](docs/development-workflow.md)** - Common patterns and best practices

## Deployment

### Static AWS S3 Hosting (Recommended)

The app now builds as a static export:

```bash
npm install
npm run build
```

This creates an `out/` folder ready for S3 website hosting or CloudFront.

Example deploy:

```bash
aws s3 sync out/ s3://your-static-site-bucket --delete
```

Or use the included deploy helper:

```bash
export AWS_REGION="us-west-2"
export S3_BUCKET="your-static-site-bucket"
export ENV_FILE=".env.production"
# Optional if you use CloudFront in front of S3
export CLOUDFRONT_DISTRIBUTION_ID="E1234567890"

npm run aws:deploy-static
```

Recommended environment setup for static hosting:

```bash
NEXT_PUBLIC_APP_URL=https://www.example.com
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api
ALLOWED_ORIGIN=https://www.example.com,http://your-bucket.s3-website-us-west-2.amazonaws.com
DATABASE_URL=... # optional, used only at build time for product generation
```

Important limits of an S3-only site:
- **Can stay static:** shop pages, product detail pages, local cart UX, content pages.
- **Needs a separate backend/API:** Stripe Checkout session creation, Stripe webhooks, secure promo validation, direct protected database writes.
- **Neon support:** product catalog can still come from Neon during `next build`, but runtime browser-to-Neon access is intentionally not used for security.

The previous Next route handlers were preserved under `server/api/` for optional deployment behind API Gateway, Lambda, or any Node host.

### Lambda + API Gateway backend for Stripe / Neon

To keep checkout, promo validation, and webhooks live while the storefront stays static on S3:

```bash
npm install
npm run aws:create-lambda-role
npm run aws:deploy-lambda-api
```

Expected shell variables:

```bash
export AWS_REGION="us-west-2"
export AWS_ACCOUNT_ID="123456789012"
export LAMBDA_FUNCTION_NAME="manewax-api"
export API_NAME="manewax-http-api"
export ENV_FILE=".env.production"
```

After deployment, point the static frontend to the API:

```bash
NEXT_PUBLIC_API_BASE_URL=https://<api-id>.execute-api.<region>.amazonaws.com/api
```

### Docker (Local)

Build and run the production image locally:

```bash
npm run env:use:sandbox   # or env:use:production
npm run docker:build
npm run docker:run
```

Then open http://localhost:3000.

### AWS ECS Fargate (From VS Code Terminal)

This repo includes helper scripts for ECR + ECS rolling deployment.

1. Set required environment variables:

```bash
export AWS_REGION="us-west-2"
export AWS_ACCOUNT_ID="831869585621"
export ECR_REPOSITORY="manewax"
export ECS_CLUSTER="manewax-cluster"
export ECS_SERVICE="manewax-service"

# Optional: set a custom image tag
export IMAGE_TAG="v1"
```

2. Ensure AWS credentials are configured locally:

```bash
aws sts get-caller-identity
```

3. Deploy:

```bash
npm run aws:deploy-ecs
```

4. Create/update AWS secrets from your chosen env file:

```bash
# sandbox namespace (separate secrets)
npm run aws:create-secrets:sandbox

# production namespace (matches task definition defaults)
npm run aws:create-secrets:production
```

What the deploy script does:
- Logs into ECR
- Creates the ECR repo if missing
- Builds and pushes your Docker image
- On first deploy, registers task definition from `infra/ecs-task-definition.json`
- On later deploys, clones current ECS task definition and updates only image
- Triggers ECS service rolling deployment

### Required Runtime Environment Variables in ECS

Set these in your ECS task definition / secrets manager:

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://<your-domain>

DATABASE_URL=...

STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PROMO_EARLYBIRD_ID=...   # optional, code lookup fallback exists

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/shop
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/shop
```

### Optional Platforms

The app can also run on App Runner or EKS with the same Docker image.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Clerk Authentication](https://clerk.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
