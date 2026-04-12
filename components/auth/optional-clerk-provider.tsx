"use client";

import { ClerkProvider } from "@clerk/react";
import { usePathname } from "next/navigation";

export function OptionalClerkProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const isAuthRoute = pathname?.startsWith("/sign-in") || pathname?.startsWith("/dashboard");

  if (!publishableKey || !isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      afterSignOutUrl="/"
      signInForceRedirectUrl="/dashboard/"
      signInFallbackRedirectUrl="/dashboard/"
    >
      {children}
    </ClerkProvider>
  );
}
