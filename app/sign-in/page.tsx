import Link from "next/link";
import { DashboardSignIn } from "@/components/auth/dashboard-sign-in";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Owner Sign In | Manewax",
};

export default function SignInPage() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

  if (!clerkEnabled) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard sign-in is not configured yet</CardTitle>
            <CardDescription>
              Add your Clerk publishable and secret keys to enable owner logins for the fulfillment dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Return to the storefront
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Owner dashboard sign-in</h1>
        <p className="text-sm text-muted-foreground">
          Use your Clerk-managed owner account to access fulfillment and order management.
        </p>
      </div>

      <div className="flex justify-center">
        <DashboardSignIn />
      </div>
    </div>
  );
}
