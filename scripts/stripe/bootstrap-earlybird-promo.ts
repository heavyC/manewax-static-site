import "dotenv/config";
import Stripe from "stripe";

const PUBLIC_PROMO_CODE = "EARLYBIRD_DISCOUNT";
const STRIPE_PROMO_CODE = "EARLYBIRDDISCOUNT";

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is required");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let coupon = (await stripe.coupons.list({ limit: 100 })).data.find(
    (entry) => entry.percent_off === 10 && entry.metadata?.managed_code === PUBLIC_PROMO_CODE
  );

  if (!coupon) {
    coupon = await stripe.coupons.create({
      percent_off: 10,
      duration: "once",
      name: "Earlybird 10%",
      metadata: {
        managed_code: PUBLIC_PROMO_CODE,
      },
    });
  }

  let promotionCode = (await stripe.promotionCodes.list({ code: STRIPE_PROMO_CODE, active: true, limit: 10 })).data.find(
    (entry) => entry.code === STRIPE_PROMO_CODE && entry.metadata?.managed_code === PUBLIC_PROMO_CODE
  );

  if (!promotionCode) {
    promotionCode = await stripe.promotionCodes.create({
      promotion: {
        type: "coupon",
        coupon: coupon.id,
      },
      code: STRIPE_PROMO_CODE,
      active: true,
      metadata: {
        managed_code: PUBLIC_PROMO_CODE,
      },
    });
  }

  console.log("EARLYBIRD_DISCOUNT ready");
  console.log(`Promotion code ID: ${promotionCode.id}`);
  console.log(`Coupon ID: ${coupon.id}`);
  console.log(`Set STRIPE_PROMO_EARLYBIRD_ID=${promotionCode.id} in your .env.local`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
