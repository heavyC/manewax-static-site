"use client";

import { ClerkProvider } from "@clerk/react";

export function OptionalClerkProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

  if (!publishableKey) {
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
