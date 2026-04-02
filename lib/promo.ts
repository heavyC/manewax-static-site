import { neon } from "@neondatabase/serverless";
import { stripe } from "@/lib/stripe";

export const EARLYBIRD_PROMO_CODE = "EARLYBIRD_DISCOUNT";

export type ResolvedPromo = {
  code: string;
  stripePromotionCodeId: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
};

function getSqlClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  return neon(process.env.DATABASE_URL);
}

async function resolveEarlybirdPromotionCodeId() {
  if (process.env.STRIPE_PROMO_EARLYBIRD_ID) {
    try {
      const configuredPromotionCode = await stripe.promotionCodes.retrieve(process.env.STRIPE_PROMO_EARLYBIRD_ID);
      if (configuredPromotionCode.active) {
        return configuredPromotionCode.id;
      }
    } catch {
      // Fall back to resolving by code when configured promo id is stale or invalid.
    }
  }

  const promotionCodes = await stripe.promotionCodes.list({
    code: EARLYBIRD_PROMO_CODE,
    active: true,
    limit: 10,
  });

  const managed = promotionCodes.data.find(
    (promotionCode) =>
      promotionCode.metadata?.managed_code === EARLYBIRD_PROMO_CODE ||
      promotionCode.code === EARLYBIRD_PROMO_CODE
  );

  return managed?.id;
}

export async function resolvePromoByCode(code: string): Promise<ResolvedPromo | null> {
  const normalizedCode = code.trim().toUpperCase();
  const sql = getSqlClient();

  const promoRows = await sql.query(
    `
      SELECT
        code,
        discount_type,
        discount_value,
        stripe_promotion_code_id,
        starts_at,
        ends_at,
        max_uses,
        current_uses,
        is_active,
        status
      FROM promos
      WHERE code = $1
      LIMIT 1
    `,
    [normalizedCode]
  );

  if (promoRows.length > 0) {
    const promo = promoRows[0];
    const now = new Date();
    const startsAt = promo.starts_at ? new Date(promo.starts_at) : null;
    const endsAt = promo.ends_at ? new Date(promo.ends_at) : null;

    const isWithinDateWindow =
      (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
    const hasRemainingUses =
      promo.max_uses === null || Number(promo.current_uses) < Number(promo.max_uses);

    if (!promo.is_active || promo.status !== "active" || !isWithinDateWindow || !hasRemainingUses) {
      return null;
    }

    if (!promo.stripe_promotion_code_id) {
      return null;
    }

    return {
      code: promo.code,
      stripePromotionCodeId: promo.stripe_promotion_code_id,
      discountType: promo.discount_type,
      discountValue: Number(promo.discount_value),
    };
  }

  if (normalizedCode !== EARLYBIRD_PROMO_CODE) {
    return null;
  }

  const stripePromotionCodeId = await resolveEarlybirdPromotionCodeId();
  if (!stripePromotionCodeId) {
    return null;
  }

  return {
    code: normalizedCode,
    stripePromotionCodeId,
    discountType: "percentage",
    discountValue: 10,
  };
}

export async function recordPromoUsage(params: {
  code: string;
  stripeSessionId: string;
  email?: string | null;
  amountDiscounted: number;
  userId?: string | null;
}) {
  const sql = getSqlClient();
  const normalizedCode = params.code.trim().toUpperCase();

  const promoRows = await sql.query(
    `SELECT id FROM promos WHERE code = $1 LIMIT 1`,
    [normalizedCode]
  );

  const promoId = promoRows.length > 0 ? promoRows[0].id : null;

  await sql.query(
    `
      INSERT INTO promo_usages (
        promo_id,
        user_id,
        email,
        stripe_session_id,
        amount_discounted
      ) VALUES ($1, $2, $3, $4, $5)
    `,
    [
      promoId,
      params.userId ?? null,
      params.email ?? null,
      params.stripeSessionId,
      params.amountDiscounted.toFixed(2),
    ]
  );

  if (promoId) {
    await sql.query(
      `UPDATE promos SET current_uses = current_uses + 1, updated_at = NOW() WHERE id = $1`,
      [promoId]
    );
  }
}
