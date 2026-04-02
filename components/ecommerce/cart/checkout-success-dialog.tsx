"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/ecommerce/cart/cart-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DISMISSED_CHECKOUT_SUCCESS_KEY = "manewax_dismissed_checkout_success";

export function CheckoutSuccessDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isReady, clearCartAfterCheckout } = useCart();
  const hasClearedCartRef = useRef(false);
  const isCheckoutSuccess = searchParams.get("checkout") === "success";
  const sessionId = searchParams.get("session_id")?.trim() || "";
  const successToken = sessionId || `${pathname}?checkout=success`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isCheckoutSuccess) {
      setOpen(false);
      return;
    }

    const dismissedToken = typeof window === "undefined"
      ? null
      : window.sessionStorage.getItem(DISMISSED_CHECKOUT_SUCCESS_KEY);

    setOpen(dismissedToken !== successToken);
  }, [isCheckoutSuccess, successToken]);

  useEffect(() => {
    if (!isCheckoutSuccess) {
      hasClearedCartRef.current = false;
      return;
    }

    if (!isReady || hasClearedCartRef.current) {
      return;
    }

    hasClearedCartRef.current = true;
    void clearCartAfterCheckout();
  }, [clearCartAfterCheckout, isCheckoutSuccess, isReady]);

  function closeDialog() {
    setOpen(false);

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DISMISSED_CHECKOUT_SUCCESS_KEY, successToken);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("checkout");
    params.delete("session_id");
    params.delete("cart");

    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      closeDialog();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader className="gap-3 text-center sm:text-center">
          <DialogTitle className="text-3xl font-semibold tracking-tight">Order Confirmed</DialogTitle>
          <DialogDescription className="text-xl leading-7 text-foreground text-center">
            Thank you for your order. Your payment was successful, and we&apos;re preparing your items now.
            <br />
            A confirmation email with your order details will arrive shortly. Please allow 1 to 2 weeks for delivery.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="justify-center border-t-0 bg-transparent p-0 pt-2 sm:justify-center">
          <Button type="button" onClick={closeDialog}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}