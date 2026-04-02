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

export function CheckoutSuccessDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isReady, clearCartAfterCheckout } = useCart();
  const hasClearedCartRef = useRef(false);
  const isCheckoutSuccess = searchParams.get("checkout") === "success";
  const [open, setOpen] = useState(isCheckoutSuccess);

  useEffect(() => {
    setOpen(isCheckoutSuccess);
  }, [isCheckoutSuccess]);

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
          <DialogTitle className="text-3xl font-semibold tracking-tight">Thank You!</DialogTitle>
          <DialogDescription className="text-base leading-7 text-muted-foreground">
            Thank you for supporting small woman owned businesses. Please allow 1-2 weeks for delivery.
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