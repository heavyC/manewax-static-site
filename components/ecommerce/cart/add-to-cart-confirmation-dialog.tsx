"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/components/ecommerce/cart/cart-provider";

export function AddToCartConfirmationDialog() {
  const {
    isAddToCartConfirmOpen,
    lastAddedItemName,
    closeAddToCartConfirm,
    checkoutFromCart,
    isCheckingOut,
    isApplyingPromo,
  } = useCart();

  return (
    <Dialog open={isAddToCartConfirmOpen} onOpenChange={(open) => !open && closeAddToCartConfirm()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Added To Cart</DialogTitle>
          <DialogDescription>
            {lastAddedItemName ?? "Item"} was added to your cart.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeAddToCartConfirm}>
            Ok
          </Button>
          <Button
            type="button"
            onClick={() => void checkoutFromCart()}
            disabled={isCheckingOut || isApplyingPromo}
          >
            {isCheckingOut ? "Redirecting..." : "Checkout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
