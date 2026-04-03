import { neon } from "@neondatabase/serverless";
import Stripe from "stripe";
import { recordPromoUsage } from "@/lib/promo";
import { stripe } from "@/lib/stripe";
import { jsonResponse } from "@/server/api/_shared/http";

function getSqlClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  return neon(process.env.DATABASE_URL);
}

function toDecimalAmount(amount: number | null | undefined) {
  return ((amount ?? 0) / 100).toFixed(2);
}

function serializeAddress(details: {
  name?: string | null;
  phone?: string | null;
  address?: Stripe.Address | null;
}) {
  return JSON.stringify({
    name: details.name ?? null,
    phone: details.phone ?? null,
    line1: details.address?.line1 ?? null,
    line2: details.address?.line2 ?? null,
    city: details.address?.city ?? null,
    state: details.address?.state ?? null,
    postalCode: details.address?.postal_code ?? null,
    country: details.address?.country ?? null,
  });
}

function buildOrderNumber(sessionId: string) {
  const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = sessionId.replace(/[^a-zA-Z0-9]/g, "").slice(-10).toUpperCase();
  return `MW-${datePrefix}-${suffix}`.slice(0, 50);
}

function isStripeProduct(
  product: Stripe.Product | Stripe.DeletedProduct | null | undefined
): product is Stripe.Product {
  return Boolean(product && !("deleted" in product && product.deleted));
}

type CheckoutSessionWithShipping = Stripe.Checkout.Session & {
  shipping_details?: {
    name?: string | null;
    phone?: string | null;
    address?: Stripe.Address | null;
  } | null;
};

async function ensureOrderUserId(session: Stripe.Checkout.Session) {
  const sql = getSqlClient();
  const requestedUserId = session.metadata?.userId?.trim();

  if (requestedUserId) {
    const matchingUser = await sql.query(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [requestedUserId]);
    if (matchingUser.length > 0) {
      return requestedUserId;
    }
  }

  const guestUserId = `guest_${session.id}`;
  await sql.query(
    `
      INSERT INTO users (id, email, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING
    `,
    [
      guestUserId,
      `guest+${session.id}@orders.manewax.local`,
      session.customer_details?.name ?? "Guest Customer",
      null,
    ]
  );

  return guestUserId;
}

async function resolveLineItems(session: Stripe.Checkout.Session) {
  const sql = getSqlClient();
  const response = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ["data.price.product"],
  });

  const resolvedItems: Array<{
    productId: number;
    productName: string;
    productSku: string | null;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }> = [];

  for (const item of response.data) {
    const expandedProduct = typeof item.price?.product === "string" ? null : item.price?.product;
    const stripeProduct = isStripeProduct(expandedProduct) ? expandedProduct : null;
    const productIdFromMetadata = stripeProduct?.metadata?.productId ?? stripeProduct?.metadata?.product_id;
    let productId = Number(productIdFromMetadata ?? 0);
    let productSku = stripeProduct?.metadata?.sku?.trim() || null;

    if (!Number.isFinite(productId) || productId <= 0) {
      const matchingProduct = await sql.query(
        `SELECT id, sku FROM products WHERE name = $1 LIMIT 1`,
        [item.description ?? stripeProduct?.name ?? ""]
      );

      if (matchingProduct.length === 0) {
        throw new Error(`Unable to resolve purchased product for line item: ${item.description ?? item.id}`);
      }

      productId = Number(matchingProduct[0].id);
      productSku = productSku ?? (matchingProduct[0].sku ? String(matchingProduct[0].sku) : null);
    }

    const quantity = Number(item.quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }

    const unitPrice = toDecimalAmount(item.price?.unit_amount ?? 0);
    const totalPrice = (Number(unitPrice) * quantity).toFixed(2);

    resolvedItems.push({
      productId,
      productName: item.description ?? stripeProduct?.name ?? `Product ${productId}`,
      productSku,
      quantity,
      unitPrice,
      totalPrice,
    });
  }

  return resolvedItems;
}

export async function persistCompletedCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.status !== "complete" && session.payment_status !== "paid") {
    return null;
  }

  const sql = getSqlClient();
  const paymentReference =
    (typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id) ?? session.id;

  const existingOrder = await sql.query(`SELECT id FROM orders WHERE payment_reference = $1 LIMIT 1`, [paymentReference]);
  if (existingOrder.length > 0) {
    return Number(existingOrder[0].id);
  }

  const userId = await ensureOrderUserId(session);
  const lineItems = await resolveLineItems(session);

  if (lineItems.length === 0) {
    throw new Error(`No line items found for checkout session ${session.id}`);
  }

  const sessionWithShipping = session as CheckoutSessionWithShipping;
  const shippingDetails = sessionWithShipping.shipping_details ?? null;
  const orderNumber = buildOrderNumber(session.id);
  const customerEmail = session.customer_details?.email?.trim() || `guest+${session.id}@orders.manewax.local`;
  const customerPhone = session.customer_details?.phone?.trim() || shippingDetails?.phone?.trim() || null;
  const shippingAddress = serializeAddress({
    name: shippingDetails?.name ?? session.customer_details?.name ?? null,
    phone: customerPhone,
    address: shippingDetails?.address ?? session.customer_details?.address ?? null,
  });
  const billingAddress = serializeAddress({
    name: session.customer_details?.name ?? shippingDetails?.name ?? null,
    phone: customerPhone,
    address: session.customer_details?.address ?? shippingDetails?.address ?? null,
  });

  await sql.query(`BEGIN`);

  try {
    const insertedOrder = await sql.query(
      `
        INSERT INTO orders (
          order_number,
          user_id,
          status,
          payment_status,
          subtotal,
          tax_amount,
          shipping_amount,
          discount_amount,
          total,
          customer_email,
          customer_phone,
          shipping_address,
          billing_address,
          payment_method,
          payment_reference,
          internal_notes
        )
        VALUES ($1, $2, 'confirmed', 'paid', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `,
      [
        orderNumber,
        userId,
        toDecimalAmount(session.amount_subtotal),
        toDecimalAmount(session.total_details?.amount_tax),
        toDecimalAmount(session.total_details?.amount_shipping),
        toDecimalAmount(session.total_details?.amount_discount),
        toDecimalAmount(session.amount_total),
        customerEmail,
        customerPhone,
        shippingAddress,
        billingAddress,
        session.payment_method_types?.join(", ") ?? "card",
        paymentReference,
        `Stripe checkout session: ${session.id}`,
      ]
    );

    const orderId = Number(insertedOrder[0].id);

    for (const item of lineItems) {
      await sql.query(
        `
          INSERT INTO order_items (
            order_id,
            product_id,
            product_name,
            product_sku,
            quantity,
            unit_price,
            total_price
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [orderId, item.productId, item.productName, item.productSku, item.quantity, item.unitPrice, item.totalPrice]
      );

      await sql.query(
        `
          UPDATE products
          SET stock_quantity = GREATEST(stock_quantity - $1, 0), updated_at = NOW()
          WHERE id = $2
        `,
        [item.quantity, item.productId]
      );
    }

    await sql.query(`COMMIT`);
    return orderId;
  } catch (error) {
    await sql.query(`ROLLBACK`);
    throw error;
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return jsonResponse({ error: "Webhook signature configuration missing" }, { status: 400 }, request);
  }

  let event: Stripe.Event;

  try {
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: "Webhook signature verification failed", details: message }, { status: 400 }, request);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = await persistCompletedCheckoutSession(session);
      const promoCode = session.metadata?.promoCode;

      if (promoCode) {
        await recordPromoUsage({
          code: promoCode,
          stripeSessionId: session.id,
          email: session.customer_details?.email,
          userId: session.metadata?.userId || null,
          orderId,
          amountDiscounted: (session.total_details?.amount_discount ?? 0) / 100,
        });
      }
    }

    return jsonResponse({ received: true }, undefined, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: "Failed to process webhook", details: message }, { status: 500 }, request);
  }
}
