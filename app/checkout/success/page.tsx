"use client";

import { useEffect } from "react";

export default function CheckoutSuccessPage() {
  useEffect(() => {
    const currentSearchParams = new URLSearchParams(window.location.search);
    const nextSearchParams = new URLSearchParams({ checkout: "success" });
    const sessionId = currentSearchParams.get("session_id");

    if (sessionId) {
      nextSearchParams.set("session_id", sessionId);
    }

    window.location.replace(`/shop/?${nextSearchParams.toString()}`);
  }, []);

  return (
    <div className="container mx-auto max-w-xl px-4 py-10 text-center">
      <h1 className="text-2xl font-semibold">Finalizing your checkout...</h1>
      <p className="mt-3 text-muted-foreground">You will be redirected back to the shop shortly.</p>
    </div>
  );
}
