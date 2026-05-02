"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    window.location.replace("/shop");
  }, []);

  return (
    <main className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-bold">Welcome to ManeWax</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Redirecting you to the shop. If nothing happens, use the link below.
      </p>
      <Link href="/shop" className="mt-6 text-primary underline underline-offset-4">
        Go to the shop
      </Link>
    </main>
  );
}
