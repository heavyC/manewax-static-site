"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { CartButton } from "@/components/ecommerce/cart/cart-button";
import { useCart } from "@/components/ecommerce/cart/cart-provider";

export function CartSheet() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    items,
    subtotal,
    itemCount,
    appliedPromo,
    discountAmount,
    total,
    promoError,
    isApplyingPromo,
    isCheckingOut,
    isLoading,
    error,
    updateItemQuantity,
    removeItem,
    clearCart,
    applyPromoCode,
    checkoutFromCart,
  } = useCart();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(searchParams.get("cart") === "open");
  }, [searchParams]);

  useEffect(() => {
    const promoFromQuery = searchParams.get("promo")?.trim();
    if (promoFromQuery) {
      void applyPromoCode(promoFromQuery);
    }
  }, [applyPromoCode, searchParams]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    const params = new URLSearchParams(searchParams.toString());
    if (nextOpen) {
      params.set("cart", "open");
    } else {
      params.delete("cart");
    }

    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }

  async function handleCheckout() {
    await checkoutFromCart({ openCartOnCancel: true });
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <div>
          <CartButton itemCount={itemCount} />
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Shopping Cart</SheetTitle>
          <SheetDescription>{itemCount} item{itemCount === 1 ? "" : "s"} in your cart</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Your cart is empty.</div>
          ) : (
            <div className="space-y-4 py-2">
              {items.map((item) => (
                <div key={item.id} className="space-y-3 rounded-md border p-3">
                  <div className="flex gap-3">
                    <div className="relative h-16 w-16 overflow-hidden rounded-md border">
                      <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="line-clamp-2 text-sm font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">${item.unitPrice.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isLoading || item.quantity <= 1}
                        onClick={() => void updateItemQuantity(item.id, item.quantity - 1)}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isLoading || item.quantity >= item.stockQuantity}
                        onClick={() => void updateItemQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">${item.lineTotal.toFixed(2)}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void removeItem(item.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <SheetFooter>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          {appliedPromo && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Promo ({appliedPromo.code})</span>
              <span className="font-semibold text-green-700">-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">${total.toFixed(2)}</span>
          </div>
          {isApplyingPromo && <p className="text-sm text-muted-foreground">Applying promo code...</p>}
          {promoError && <p className="text-sm text-destructive">{promoError}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => void clearCart()} disabled={isLoading || items.length === 0}>
              Clear
            </Button>
            <Button type="button" onClick={() => void handleCheckout()} disabled={items.length === 0 || isCheckingOut || isApplyingPromo}>
              {isCheckingOut ? "Redirecting..." : "Checkout"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
