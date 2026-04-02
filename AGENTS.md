<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Manewax Ecommerce Project

## Project Context
This is an **ecommerce website** called "Manewax" with specific technology requirements and business logic considerations.

## Required Tech Stack
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Authentication**: Clerk
- **UI Components**: shadcn/ui
- **Framework**: Next.js with App Router

## Agent Behavior
When working on this project, ALL agents must:

1. **Prioritize ecommerce business logic** - Consider products, orders, cart, inventory, customers, payments
2. **Use the specified tech stack** - No alternatives unless explicitly approved
3. **Follow ecommerce best practices** - Security, performance, user experience, conversion optimization
4. **Maintain consistency** - Use established patterns and component structures
5. **Consider scalability** - Design for growth in products, customers, and orders

## Common Ecommerce Patterns
- Product catalog management with variants and inventory
- Shopping cart with persistence and checkout flow
- User authentication and account management
- Order processing and status tracking  
- Payment processing integration points
- Admin dashboard for store management

## Documentation
- Main instructions: `.github/copilot-instructions.md`
- Database patterns: `docs/database-schema.md`
- Development workflows: `docs/development-workflow.md`

See `.github/copilot-instructions.md` for comprehensive guidelines.
