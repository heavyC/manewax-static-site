import { OwnerDashboard } from "@/components/dashboard/owner-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Fulfillment Dashboard | Manewax",
};

export default function DashboardPage() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

  if (!clerkEnabled) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard auth setup required</CardTitle>
            <CardDescription>
              This dashboard uses Clerk for password-protected owner access. Add the Clerk environment variables to enable it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Required environment values:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code></li>
              <li><code>CLERK_SECRET_KEY</code></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <OwnerDashboard />;
}
