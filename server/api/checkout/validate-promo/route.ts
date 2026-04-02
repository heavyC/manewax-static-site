import { jsonResponse } from "@/server/api/_shared/http";
import { resolvePromoByCode } from "@/lib/promo";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string };

    if (!body.code || !body.code.trim()) {
      return jsonResponse({ error: "Promo code is required" }, { status: 400 }, request);
    }

    const promo = await resolvePromoByCode(body.code);

    if (!promo) {
      return jsonResponse({ valid: false, error: "Promo code is invalid or expired" }, { status: 404 }, request);
    }

    return jsonResponse(
      {
        valid: true,
        promo: {
          code: promo.code,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
        },
      },
      undefined,
      request
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: "Failed to validate promo", details: message }, { status: 500 }, request);
  }
}
