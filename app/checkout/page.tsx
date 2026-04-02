"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildApiUrl, resolveStaticPromo } from "@/lib/static-site";
import type { CreateCheckoutSessionResponse, ValidatePromoResponse } from "@/lib/types/checkout";

export default function CheckoutPage() {
  const [productId, setProductId] = useState("1");
  const [quantity, setQuantity] = useState("1");
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<"idle" | "valid" | "invalid" | "loading">("idle");
  const [promoMessage, setPromoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const promoFromQuery = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const params = new URLSearchParams(window.location.search);
    return (params.get("promo") ?? "").trim();
  }, []);

  useEffect(() => {
    if (!promoFromQuery) {
      return;
    }

    setPromoCode(promoFromQuery);

    void validatePromo(promoFromQuery);
  }, [promoFromQuery]);

  async function validatePromo(code: string) {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setPromoStatus("idle");
      setPromoMessage("");
      return;
    }

    setPromoStatus("loading");
    setPromoMessage("");

    try {
      const response = await fetch(buildApiUrl("/checkout/validate-promo"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalizedCode }),
      });

      const data = (await response.json()) as ValidatePromoResponse;

      if (!response.ok || !data.valid) {
        throw new Error(data.error ?? "Promo code is invalid or expired.");
      }

      setPromoCode(data.promo?.code ?? normalizedCode);
      setPromoStatus("valid");
      setPromoMessage(
        data.promo?.discountType === "percentage"
          ? `${data.promo.discountValue}% discount applied`
          : `$${data.promo?.discountValue ?? 0} discount applied`
      );
    } catch (error) {
      const staticPromo = resolveStaticPromo(normalizedCode);
      if (staticPromo) {
        setPromoCode(staticPromo.code);
        setPromoStatus("valid");
        setPromoMessage(
          staticPromo.discountType === "percentage"
            ? `${staticPromo.discountValue}% discount applied`
            : `$${staticPromo.discountValue} discount applied`
        );
        return;
      }

      setPromoStatus("invalid");
      setPromoMessage(error instanceof Error ? error.message : "Promo code is invalid or expired.");
    }
  }

  async function handleStartCheckout() {
    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const parsedProductId = Number(productId);
      const parsedQuantity = Number(quantity);

      if (!Number.isFinite(parsedProductId) || parsedProductId <= 0) {
        setErrorMessage("Product ID must be a positive number.");
        return;
      }

      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        setErrorMessage("Quantity must be a positive number.");
        return;
      }

      const currentUrl = new URL(window.location.href);
      const query = currentUrl.search ? currentUrl.search : "";
      const cancelUrl = `${currentUrl.origin}${currentUrl.pathname}${query}`;
      const successUrl = `${currentUrl.origin}/checkout/success${query}`;

      const response = await fetch(buildApiUrl("/checkout/create-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: parsedProductId, quantity: parsedQuantity }],
          promoCode: promoCode.trim() ? promoCode.trim().toUpperCase() : undefined,
          successUrl,
          cancelUrl,
        }),
      });

      const data = (await response.json()) as CreateCheckoutSessionResponse;

      if (!response.ok || !data.url) {
        setErrorMessage(data.error ?? "Unable to start checkout.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setErrorMessage("Unable to start checkout. Configure your checkout API for static hosting.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
          <CardDescription>Apply EARLYBIRD promo from QR links and continue to Stripe Checkout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productId">Product ID</Label>
            <Input
              id="productId"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              placeholder="1"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="1"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promoCode">Promo code</Label>
            <div className="flex gap-2">
              <Input
                id="promoCode"
                value={promoCode}
                onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                placeholder="EARLYBIRD_DISCOUNT"
              />
              <Button type="button" variant="outline" onClick={() => void validatePromo(promoCode)}>
                Validate
              </Button>
            </div>
            {promoStatus !== "idle" && (
              <p className={promoStatus === "valid" ? "text-sm text-green-600" : "text-sm text-red-600"}>
                {promoStatus === "loading" ? "Validating..." : promoMessage}
              </p>
            )}
          </div>

          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

          <Button className="w-full" onClick={handleStartCheckout} disabled={isSubmitting}>
            {isSubmitting ? "Starting checkout..." : "Continue to payment"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
