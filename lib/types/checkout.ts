export interface CheckoutItemInput {
  productId: number;
  quantity: number;
}

export interface ValidatePromoResponse {
  valid: boolean;
  error?: string;
  promo?: {
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
  };
}

export interface CreateCheckoutSessionResponse {
  url?: string;
  sessionId?: string;
  promoApplied?: boolean;
  promoCode?: string | null;
  error?: string;
  details?: string;
}
