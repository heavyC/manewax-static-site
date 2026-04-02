import { neon } from "@neondatabase/serverless";
import { getOptionalUserId, jsonResponse } from "@/server/api/_shared/http";
import { resolvePromoByCode } from "@/lib/promo";
import { stripe } from "@/lib/stripe";

type CreateSessionBody = {
  items?: Array<{
    productId: number;
    quantity: number;
  }>;
  promoCode?: string;
  successUrl?: string;
  cancelUrl?: string;
};

function normalizeAppUrl(url: string | undefined, appUrl: string, fallbackPath: string) {
  if (!url) {
    return `${appUrl}${fallbackPath}`;
  }

  try {
    if (url.startsWith("/")) {
      return `${appUrl}${url}`;
    }

    const parsedUrl = new URL(url);
    const appOrigin = new URL(appUrl).origin;

    if (parsedUrl.origin !== appOrigin) {
      return `${appUrl}${fallbackPath}`;
    }

    return parsedUrl.toString();
  } catch {
    return `${appUrl}${fallbackPath}`;
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: "Database configuration error" }, { status: 500 }, request);
    }

    const body = (await request.json()) as CreateSessionBody;
    const items = body.items ?? [];

    if (items.length === 0) {
      return jsonResponse({ error: "At least one cart item is required" }, { status: 400 }, request);
    }

    const normalizedItems = items
      .map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      }))
      .filter((item) => Number.isFinite(item.productId) && item.quantity > 0);

    if (normalizedItems.length === 0) {
      return jsonResponse({ error: "Invalid cart items" }, { status: 400 }, request);
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
    const sql = neon(process.env.DATABASE_URL);

    const products = await sql.query(
      `
        SELECT id, name, description, price, status
        FROM products
        WHERE id = ANY($1::int[]) AND status = 'active'
      `,
      [productIds]
    );

    if (products.length !== productIds.length) {
      return jsonResponse({ error: "Some products are unavailable" }, { status: 400 }, request);
    }

    const productRows = products as Array<{
      id: number;
      name: string;
      description: string | null;
      price: string;
    }>;

    const productById = new Map<number, { id: number; name: string; description: string | null; price: string }>(
      productRows.map((product) => [product.id, product])
    );

    const lineItems: Array<{
      price_data: {
        currency: string;
        product_data: {
          name: string;
          description?: string;
        };
        unit_amount: number;
      };
      quantity: number;
    }> = [];

    for (const item of normalizedItems) {
      const product = productById.get(item.productId);
      if (!product) {
        return jsonResponse({ error: `Product ${item.productId} not found` }, { status: 400 }, request);
      }

      const unitAmount = Math.round(Number(product.price) * 100);
      if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
        return jsonResponse({ error: `Product ${product.name} has invalid pricing` }, { status: 400 }, request);
      }

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            description: product.description ?? undefined,
          },
          unit_amount: unitAmount,
        },
        quantity: item.quantity,
      });
    }

    let resolvedPromoCode: string | undefined;
    let stripePromotionCodeId: string | undefined;

    if (body.promoCode?.trim()) {
      const promo = await resolvePromoByCode(body.promoCode);

      if (!promo) {
        return jsonResponse({ error: "Promo code is invalid or expired" }, { status: 400 }, request);
      }

      resolvedPromoCode = promo.code;
      stripePromotionCodeId = promo.stripePromotionCodeId;
    }

    const userId = getOptionalUserId(request);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const successUrl = normalizeAppUrl(
      body.successUrl,
      appUrl,
      "/shop?checkout=success"
    );
    const cancelUrl = normalizeAppUrl(body.cancelUrl, appUrl, "/checkout");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      billing_address_collection: "auto",
      phone_number_collection: {
        enabled: true,
      },
      discounts: stripePromotionCodeId ? [{ promotion_code: stripePromotionCodeId }] : undefined,
      metadata: {
        promoCode: resolvedPromoCode ?? "",
        userId: userId ?? "",
      },
      allow_promotion_codes: stripePromotionCodeId ? undefined : true,
    });

    if (!session.url) {
      return jsonResponse({ error: "Failed to create checkout session" }, { status: 500 }, request);
    }

    return jsonResponse(
      {
        url: session.url,
        sessionId: session.id,
        promoApplied: Boolean(stripePromotionCodeId),
        promoCode: resolvedPromoCode ?? null,
      },
      undefined,
      request
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: "Failed to create checkout session", details: message }, { status: 500 }, request);
  }
}
