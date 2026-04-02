import Stripe from "stripe";
import { jsonResponse } from "@/server/api/_shared/http";
import { recordPromoUsage } from "@/lib/promo";
import { stripe } from "@/lib/stripe";

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
      const promoCode = session.metadata?.promoCode;

      if (promoCode) {
        await recordPromoUsage({
          code: promoCode,
          stripeSessionId: session.id,
          email: session.customer_details?.email,
          userId: session.metadata?.userId || null,
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
