# Development Workflow Guide

This guide outlines common development patterns and workflows for building ecommerce features with the Manewax tech stack.

## Feature Development Workflow

### 1. Planning a New Feature

Before implementing any ecommerce feature, consider:

**Business Logic Questions:**
- How does this impact inventory management?
- What are the security implications for customer data?
- How will this affect the checkout/payment flow?
- Is this feature mobile-responsive?
- How does this scale with product/order volume?

**Technical Architecture:**
- What database changes are needed?
- How will authentication be handled?
- Which shadcn components can be reused?
- What API routes are required?
- Where do loading states and error boundaries go?

### 2. Database-First Development

Start with schema changes when adding new features:

```bash
# 1. Define schema in lib/db/schema/
# 2. Generate migration
npm run db:generate

# 3. Review generated SQL
# 4. Apply migration
npm run db:migrate

# 5. Update TypeScript types if needed
npm run type-check
```

### 3. Authentication Integration

Every ecommerce feature should consider authentication and authorization.

For the current **static-export storefront + Lambda/API backend** setup:

- **Clerk manages owner logins** for the fulfillment dashboard
- **Dashboard roles are stored in Clerk metadata** as `dashboardRole: "admin"` or `dashboardRole: "viewer"`
- **Client-side auth UI** uses Clerk hooks/components in the browser
- **Protected backend access** is enforced in `server/api/_shared/admin-auth.ts`

```typescript
// Client Components - use Clerk in the browser for the dashboard
import { useAuth, useUser } from "@clerk/react";

export function DashboardGate() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  if (!isSignedIn) {
    return <a href="/sign-in/">Sign in</a>;
  }

  // Use the token for protected dashboard API calls
  async function loadOrders() {
    const token = await getToken();

    await fetch("/api/admin/orders?bucket=open", {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Clerk-User-Id": user?.id ?? "",
      },
      credentials: "include",
    });
  }

  return <button onClick={() => void loadOrders()}>Load orders</button>;
}
```

For local development of protected APIs:

```bash
npm run dev:api
npm run dev
```

This lets the static frontend call the extracted `server/api/*` handlers locally while preserving the same auth flow used in production.

### 4. Component Development

Follow the established component hierarchy:

```
components/
├── ui/                    # shadcn/ui components (don't modify)
├── ecommerce/
│   ├── product/
│   │   ├── product-card.tsx
│   │   ├── product-gallery.tsx
│   │   └── product-form.tsx
│   ├── cart/
│   │   ├── cart-drawer.tsx
│   │   ├── cart-item.tsx
│   │   └── cart-summary.tsx
│   └── checkout/
│       ├── checkout-form.tsx
│       ├── shipping-form.tsx
│       └── payment-form.tsx
```

**Component Guidelines:**
- Use shadcn components as building blocks
- Keep components focused on single responsibilities
- Include loading and error states
- Ensure accessibility (ARIA labels, keyboard navigation)
- Make components mobile-responsive by default

## Common Ecommerce Patterns

### Shopping Cart Management

```typescript
// app/api/cart/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cartItems } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    const { productId, quantity } = await request.json();
    
    // Validate inventory
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });
    
    if (!product || product.stockQuantity < quantity) {
      return NextResponse.json(
        { error: "Insufficient inventory" },
        { status: 400 }
      );
    }
    
    // Add to cart logic
    
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add to cart" },
      { status: 500 }
    );
  }
}
```

### Order Processing

```typescript
// lib/orders/create-order.ts
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";

export async function createOrder(userId: string, cartData: CartItem[]) {
  return await db.transaction(async (tx) => {
    // 1. Calculate totals
    const subtotal = calculateSubtotal(cartData);
    const tax = calculateTax(subtotal, shippingAddress);
    const shipping = calculateShipping(cartData, shippingAddress);
    
    // 2. Create order record
    const [order] = await tx.insert(orders).values({
      userId,
      orderNumber: generateOrderNumber(),
      subtotal,
      taxAmount: tax,
      shippingAmount: shipping,
      total: subtotal + tax + shipping,
      // ... other fields
    }).returning();
    
    // 3. Create order items
    const items = await tx.insert(orderItems).values(
      cartData.map(item => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        // Snapshot product data
        productName: item.product.name,
        sku: item.product.sku,
      }))
    );
    
    // 4. Update inventory
    for (const item of cartData) {
      await tx.update(products)
        .set({
          stockQuantity: sql`stock_quantity - ${item.quantity}`
        })
        .where(eq(products.id, item.productId));
    }
    
    // 5. Clear cart
    await tx.delete(cartItems).where(eq(cartItems.userId, userId));
    
    return order;
  });
}
```

### Form Handling with Validation

```typescript
// components/ecommerce/checkout/shipping-form.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

const shippingSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  address1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
});

export function ShippingForm() {
  const form = useForm({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      // ...
    },
  });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        {/* Other fields */}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Continue"}
        </Button>
      </form>
    </Form>
  );
}
```

## Error Handling Patterns

### API Route Error Handling

```typescript
// lib/api-helpers/error-handler.ts
export function handleApiError(error: unknown) {
  console.error("API Error:", error);
  
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.errors },
      { status: 400 }
    );
  }
  
  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
```

### Component Error Boundaries

```typescript
// components/error-boundary.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("Component error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <h2 className="text-xl font-semibold mb-2">Something went wrong!</h2>
      <p className="text-muted-foreground mb-4">
        We apologize for the inconvenience. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

## Testing Strategies

### Unit Tests for Business Logic

```typescript
// __tests__/lib/orders/calculate-totals.test.ts
import { calculateOrderTotals } from "@/lib/orders/calculate-totals";

describe("calculateOrderTotals", () => {
  it("should calculate correct totals with tax and shipping", () => {
    const cartItems = [
      { price: 29.99, quantity: 2 },
      { price: 15.50, quantity: 1 },
    ];
    
    const result = calculateOrderTotals({
      items: cartItems,
      taxRate: 0.08,
      shipping: 9.99,
    });
    
    expect(result.subtotal).toBe(75.48);
    expect(result.tax).toBe(6.04);
    expect(result.total).toBe(91.51);
  });
});
```

### Integration Tests for API Routes

```typescript
// __tests__/api/cart.test.ts
import { POST } from "@/app/api/cart/route";
import { createMocks } from "node-mocks-http";

describe("/api/cart", () => {
  it("should add item to cart", async () => {
    const { req } = createMocks({
      method: "POST",
      body: {
        productId: 1,
        quantity: 2,
      },
    });
    
    const response = await POST(req as any);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

## Performance Optimization

### Database Query Optimization

```typescript
// Use select to limit fields
const products = await db.select({
  id: products.id,
  name: products.name,
  price: products.price,
}).from(products);

// Use joins instead of multiple queries
const productsWithCategories = await db
  .select()
  .from(products)
  .leftJoin(categories, eq(products.categoryId, categories.id));

// Use database indexes for frequently queried fields
CREATE INDEX idx_products_category_active ON products(category_id, is_active);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

### Image Optimization

```typescript
// components/ecommerce/product/product-image.tsx
import Image from "next.js";

export function ProductImage({ src, alt, ...props }) {
  return (
    <Image
      src={src}
      alt={alt}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      priority={props.priority}
      className="object-cover"
      {...props}
    />
  );
}
```

## Security Checklist

- [ ] Validate all user inputs with Zod schemas
- [ ] Use Clerk's built-in CSRF protection
- [ ] Sanitize user-generated content (reviews, addresses)
- [ ] Implement rate limiting on public APIs
- [ ] Use environment variables for sensitive data
- [ ] Validate user permissions for data access
- [ ] Implement proper error handling (don't leak sensitive info)
- [ ] Use HTTPS in production
- [ ] Validate inventory before order creation

## Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Error monitoring setup
- [ ] Performance monitoring configured
- [ ] CDN configured for images
- [ ] SSL certificate installed
- [ ] Payment gateway in production mode
- [ ] Backup strategy implemented
- [ ] Load testing completed