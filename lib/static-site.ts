export type StaticPromoFallback = {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
};

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getApiBaseUrl() {
  return trimTrailingSlash((process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api").trim());
}

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export function shouldUseMockProducts() {
  const configuredValue = process.env.NEXT_PUBLIC_USE_MOCK_PRODUCTS_ONLY?.trim().toLowerCase();

  if (configuredValue === "true") {
    return true;
  }

  if (configuredValue === "false") {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

export function resolveStaticPromo(code: string): StaticPromoFallback | null {
  const normalizedCode = code.trim().toUpperCase();
  const fallbackCode = (process.env.NEXT_PUBLIC_FALLBACK_PROMO_CODE ?? "EARLYBIRD_DISCOUNT")
    .trim()
    .toUpperCase();
  const alternateFallbackCode = (process.env.NEXT_PUBLIC_FALLBACK_PROMO_ALIAS ?? "EARLYBIRDDISCOUNT")
    .trim()
    .toUpperCase();

  if (!normalizedCode || (normalizedCode !== fallbackCode && normalizedCode !== alternateFallbackCode)) {
    return null;
  }

  const fallbackDiscountValue = Number(process.env.NEXT_PUBLIC_FALLBACK_PROMO_VALUE ?? "10");
  const fallbackDiscountType =
    process.env.NEXT_PUBLIC_FALLBACK_PROMO_TYPE === "fixed" ? "fixed" : "percentage";

  return {
    code: fallbackCode,
    discountType: fallbackDiscountType,
    discountValue: Number.isFinite(fallbackDiscountValue) ? fallbackDiscountValue : 10,
  };
}
