"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildApiUrl, resolveStaticPromo } from "@/lib/static-site";
import type { CreateCheckoutSessionResponse, ValidatePromoResponse } from "@/lib/types/checkout";

const CART_STORAGE_KEY = "manewax_cart_items";
const PROMO_STORAGE_KEY = "manewax_promo_code";

export interface CartItem {
  id: number;
  productId: number;
  productName: string;
  productSlug: string;
  productStatus: string;
  stockQuantity: number;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface CartProductSnapshot {
  id: number;
  name: string;
  slug: string;
  status: string;
  stockQuantity: number;
  imageUrl: string;
  unitPrice: number;
}

export type AppliedPromo = {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
};

type CartResponse = {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  error?: string;
};

type CartContextValue = {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  appliedPromo: AppliedPromo | null;
  discountAmount: number;
  total: number;
  promoError: string | null;
  isApplyingPromo: boolean;
  isCheckingOut: boolean;
  isAddToCartConfirmOpen: boolean;
  lastAddedItemName: string | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  refreshCart: () => Promise<void>;
  addToCart: (product: CartProductSnapshot, quantity?: number) => Promise<void>;
  updateItemQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  clearCartAfterCheckout: () => Promise<void>;
  applyPromoCode: (code: string) => Promise<void>;
  removePromoCode: () => void;
  closeAddToCartConfirm: () => void;
  checkoutFromCart: (options?: { openCartOnCancel?: boolean }) => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);
const EMPTY_CART: CartResponse = {
  items: [],
  subtotal: 0,
  itemCount: 0,
};

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function toCartResponse(items: CartItem[]): CartResponse {
  const normalizedItems = items.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    stockQuantity: Number(item.stockQuantity),
    unitPrice: Number(item.unitPrice),
    lineTotal: roundCurrency(Number(item.unitPrice) * Number(item.quantity)),
  }));

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items: normalizedItems,
    subtotal: roundCurrency(subtotal),
    itemCount,
  };
}

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        id: Number(item.id),
        productId: Number(item.productId),
        productName: String(item.productName),
        productSlug: String(item.productSlug),
        productStatus: String(item.productStatus),
        stockQuantity: Number(item.stockQuantity),
        imageUrl: String(item.imageUrl || "/images/products/placeholder.jpg"),
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        lineTotal: roundCurrency(Number(item.unitPrice) * Number(item.quantity)),
      }))
      .filter(
        (item) =>
          Number.isFinite(item.productId) &&
          item.productId > 0 &&
          Number.isFinite(item.quantity) &&
          item.quantity > 0 &&
          Number.isFinite(item.unitPrice)
      );
  } catch {
    return [];
  }
}

function writeStoredCart(items: CartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isAddToCartConfirmOpen, setIsAddToCartConfirmOpen] = useState(false);
  const [lastAddedItemName, setLastAddedItemName] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyCartState = useCallback((payload: CartResponse) => {
    setItems(payload.items ?? []);
    setSubtotal(Number(payload.subtotal ?? 0));
    setItemCount(Number(payload.itemCount ?? 0));
  }, []);

  const syncCart = useCallback(
    (nextItems: CartItem[]) => {
      writeStoredCart(nextItems);
      applyCartState(toCartResponse(nextItems));
    },
    [applyCartState]
  );

  const resetCartState = useCallback(() => {
    applyCartState(EMPTY_CART);
  }, [applyCartState]);

  const removePromoCode = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PROMO_STORAGE_KEY);
    }

    setAppliedPromo(null);
    setPromoError(null);
  }, []);

  const closeAddToCartConfirm = useCallback(() => {
    setIsAddToCartConfirmOpen(false);
  }, []);

  const refreshCart = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const storedItems = readStoredCart();
      applyCartState(toCartResponse(storedItems));
    } catch {
      setError("Failed to load cart");
    } finally {
      setIsLoading(false);
    }
  }, [applyCartState]);

  useEffect(() => {
    void refreshCart();
    setIsReady(true);
  }, [refreshCart]);

  const applyPromoCode = useCallback(async (code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      removePromoCode();
      return;
    }

    if (appliedPromo?.code === normalizedCode) {
      return;
    }

    setIsApplyingPromo(true);
    setPromoError(null);

    try {
      const response = await fetch(buildApiUrl("/checkout/validate-promo"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalizedCode }),
      });

      const payload = (await response.json()) as ValidatePromoResponse;
      if (!response.ok || !payload.valid || !payload.promo) {
        throw new Error(payload.error ?? "Promo code is invalid or expired");
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(PROMO_STORAGE_KEY, payload.promo.code);
      }

      setAppliedPromo({
        code: payload.promo.code,
        discountType: payload.promo.discountType,
        discountValue: Number(payload.promo.discountValue),
      });
      setPromoError(null);
    } catch (error) {
      const staticPromo = resolveStaticPromo(normalizedCode);
      if (staticPromo) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(PROMO_STORAGE_KEY, staticPromo.code);
        }

        setAppliedPromo({
          code: staticPromo.code,
          discountType: staticPromo.discountType,
          discountValue: staticPromo.discountValue,
        });
        setPromoError(null);
      } else {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(PROMO_STORAGE_KEY);
        }

        setAppliedPromo(null);
        setPromoError(error instanceof Error ? error.message : "Unable to validate promo code");
      }
    } finally {
      setIsApplyingPromo(false);
    }
  }, [appliedPromo?.code, removePromoCode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const persistedPromoCode = window.localStorage.getItem(PROMO_STORAGE_KEY)?.trim();
    if (!persistedPromoCode) {
      return;
    }

    void applyPromoCode(persistedPromoCode);
  }, [applyPromoCode]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === CART_STORAGE_KEY) {
        void refreshCart();
        return;
      }

      if (event.key !== PROMO_STORAGE_KEY) {
        return;
      }

      const nextPromoCode = event.newValue?.trim();
      if (!nextPromoCode) {
        removePromoCode();
        return;
      }

      void applyPromoCode(nextPromoCode);
    }

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [applyPromoCode, refreshCart, removePromoCode]);

  const addToCart = useCallback(
    async (product: CartProductSnapshot, quantity = 1) => {
      setIsLoading(true);
      setError(null);

      try {
        const normalizedQuantity = Number(quantity);
        if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
          setError("Quantity must be greater than zero");
          return;
        }

        if (product.status !== "active") {
          setError("Product is not available for purchase");
          return;
        }

        const existingItems = readStoredCart();
        const existingItem = existingItems.find((item) => item.productId === product.id);
        const nextQuantity = (existingItem?.quantity ?? 0) + normalizedQuantity;

        if (nextQuantity > product.stockQuantity) {
          setError("Requested quantity exceeds stock");
          return;
        }

        const nextItems = existingItem
          ? existingItems.map((item) =>
              item.productId === product.id
                ? {
                    ...item,
                    quantity: nextQuantity,
                    stockQuantity: product.stockQuantity,
                    unitPrice: product.unitPrice,
                    productStatus: product.status,
                    imageUrl: product.imageUrl,
                    lineTotal: roundCurrency(product.unitPrice * nextQuantity),
                  }
                : item
            )
          : [
              {
                id: product.id,
                productId: product.id,
                productName: product.name,
                productSlug: product.slug,
                productStatus: product.status,
                stockQuantity: product.stockQuantity,
                imageUrl: product.imageUrl,
                unitPrice: product.unitPrice,
                quantity: normalizedQuantity,
                lineTotal: roundCurrency(product.unitPrice * normalizedQuantity),
              },
              ...existingItems,
            ];

        syncCart(nextItems);
        setLastAddedItemName(product.name);
        setIsAddToCartConfirmOpen(true);
      } catch {
        setError("Failed to add item");
      } finally {
        setIsLoading(false);
      }
    },
    [syncCart]
  );

  const updateItemQuantity = useCallback(
    async (itemId: number, quantity: number) => {
      setIsLoading(true);
      setError(null);

      try {
        if (quantity <= 0) {
          const nextItems = readStoredCart().filter((item) => item.id !== itemId);
          syncCart(nextItems);
          return;
        }

        const nextItems = readStoredCart().map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          const safeQuantity = Math.min(quantity, item.stockQuantity);
          return {
            ...item,
            quantity: safeQuantity,
            lineTotal: roundCurrency(item.unitPrice * safeQuantity),
          };
        });

        syncCart(nextItems);
      } catch {
        setError("Failed to update item");
      } finally {
        setIsLoading(false);
      }
    },
    [syncCart]
  );

  const removeItem = useCallback(
    async (itemId: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const nextItems = readStoredCart().filter((item) => item.id !== itemId);
        syncCart(nextItems);
      } catch {
        setError("Failed to remove item");
      } finally {
        setIsLoading(false);
      }
    },
    [syncCart]
  );

  const clearCart = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(CART_STORAGE_KEY);
      }
      resetCartState();
    } catch {
      setError("Failed to clear cart");
    } finally {
      setIsLoading(false);
    }
  }, [resetCartState]);

  const clearCartAfterCheckout = useCallback(async () => {
    await clearCart();
    removePromoCode();
  }, [clearCart, removePromoCode]);

  const checkoutFromCart = useCallback(async (options?: { openCartOnCancel?: boolean }) => {
    if (items.length === 0 || isApplyingPromo || isCheckingOut) {
      return;
    }

    setIsCheckingOut(true);
    setError(null);

    try {
      const params = new URLSearchParams(window.location.search);
      if (options?.openCartOnCancel) {
        params.set("cart", "open");
      }

      const query = params.toString();
      const cancelUrl = `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ""}`;
      const successUrl = `${window.location.origin}/checkout/success${window.location.search}`;
      const persistedPromoCode = window.localStorage.getItem(PROMO_STORAGE_KEY)?.trim().toUpperCase();

      const response = await fetch(buildApiUrl("/checkout/create-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          promoCode: appliedPromo?.code ?? persistedPromoCode,
          successUrl,
          cancelUrl,
        }),
      });

      const data = (await response.json()) as CreateCheckoutSessionResponse;
      if (!response.ok || !data.url) {
        setError(
          data.error ??
            "Unable to start checkout. Stripe session creation requires a deployed server-side API when the site is hosted on S3."
        );
        return;
      }

      setIsAddToCartConfirmOpen(false);
      window.location.href = data.url;
    } catch {
      setError("Unable to start checkout. Configure your checkout API for static hosting.");
    } finally {
      setIsCheckingOut(false);
    }
  }, [appliedPromo?.code, isApplyingPromo, isCheckingOut, items]);

  const discountAmount = useMemo(() => {
    if (!appliedPromo || subtotal <= 0) {
      return 0;
    }

    if (appliedPromo.discountType === "percentage") {
      return roundCurrency(Math.min((subtotal * appliedPromo.discountValue) / 100, subtotal));
    }

    return roundCurrency(Math.min(appliedPromo.discountValue, subtotal));
  }, [appliedPromo, subtotal]);

  const total = useMemo(() => {
    return roundCurrency(Math.max(subtotal - discountAmount, 0));
  }, [discountAmount, subtotal]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      subtotal,
      itemCount,
      appliedPromo,
      discountAmount,
      total,
      promoError,
      isApplyingPromo,
      isCheckingOut,
      isAddToCartConfirmOpen,
      lastAddedItemName,
      isReady,
      isLoading,
      error,
      refreshCart,
      addToCart,
      updateItemQuantity,
      removeItem,
      clearCart,
      clearCartAfterCheckout,
      applyPromoCode,
      removePromoCode,
      closeAddToCartConfirm,
      checkoutFromCart,
    }),
    [
      addToCart,
      appliedPromo,
      applyPromoCode,
      checkoutFromCart,
      clearCart,
      clearCartAfterCheckout,
      closeAddToCartConfirm,
      discountAmount,
      error,
      isAddToCartConfirmOpen,
      isApplyingPromo,
      isCheckingOut,
      isLoading,
      isReady,
      itemCount,
      items,
      lastAddedItemName,
      promoError,
      refreshCart,
      removeItem,
      removePromoCode,
      subtotal,
      total,
      updateItemQuantity,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
