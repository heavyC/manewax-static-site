"use client";

import { SignIn } from "@clerk/react";

export function DashboardSignIn() {
  return (
    <SignIn
      routing="hash"
      forceRedirectUrl="/dashboard/"
      fallbackRedirectUrl="/dashboard/"
      withSignUp={false}
    />
  );
}
