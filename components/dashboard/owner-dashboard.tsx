"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UserButton, useAuth, useUser } from "@clerk/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { buildApiUrl } from "@/lib/static-site";
import { cn } from "@/lib/utils";

type DashboardRole = "viewer" | "admin";
type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "returned" | "cancelled" | "refunded";
type OrderBucket = "open" | "fulfilled" | "archived" | "all";

type DashboardAddress = {
  name: string | null;
  phone: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

type DashboardOrderItem = {
  id: number;
  productId: number;
  productName: string;
  productSku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type DashboardOrder = {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  customerEmail: string;
  customerPhone: string | null;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  fulfilledAt: string | null;
  customerNotes: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  shippingAddress: DashboardAddress;
  items: DashboardOrderItem[];
};

type OrdersResponse = {
  role: DashboardRole;
  counts: Record<OrderBucket, number>;
  orders: DashboardOrder[];
};

const bucketLabels: Record<OrderBucket, string> = {
  open: "New & Open",
  fulfilled: "Fulfilled",
  archived: "Returned / Refunded",
  all: "All",
};

const statusOptions: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
  "refunded",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusTone(status: string) {
  switch (status) {
    case "shipped":
    case "delivered":
      return "default" as const;
    case "returned":
    case "refunded":
    case "cancelled":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function getPaymentTone(status: string) {
  switch (status) {
    case "paid":
      return "default" as const;
    case "refunded":
    case "failed":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function formatAddress(address: DashboardAddress) {
  return [
    address.name,
    address.line1,
    address.line2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
    address.country,
  ].filter(Boolean) as string[];
}

function orderPreview(order: DashboardOrder) {
  return order.items
    .slice(0, 3)
    .map((item) => `${item.quantity}× ${item.productName}`)
    .join(", ");
}

export function OwnerDashboard() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [role, setRole] = useState<DashboardRole | null>(null);
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [counts, setCounts] = useState<Record<OrderBucket, number>>({
    open: 0,
    fulfilled: 0,
    archived: 0,
    all: 0,
  });
  const [activeBucket, setActiveBucket] = useState<OrderBucket>("open");
  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    status: "confirmed" as OrderStatus,
    shippingCarrier: "",
    trackingNumber: "",
    internalNotes: "",
  });

  const loadOrders = useCallback(async (bucket: OrderBucket) => {
    setIsLoading(true);
    setSaveMessage(null);

    try {
      const token = await getToken();
      if (!token) {
        setAuthError("Please sign in to view the dashboard.");
        setOrders([]);
        setRole(null);
        return;
      }

      const response = await fetch(buildApiUrl(`/admin/orders?bucket=${bucket}`), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Clerk-User-Id": user?.id ?? "",
        },
        credentials: "include",
        cache: "no-store",
      });

      const payload = (await response.json()) as Partial<OrdersResponse> & { error?: string; details?: string };

      if (!response.ok || !Array.isArray(payload.orders) || !payload.role) {
        const message = payload.details ? `${payload.error ?? "Unable to load fulfillment data."} ${payload.details}` : (payload.error ?? "Unable to load fulfillment data.");
        if (response.status === 401 || response.status === 403) {
          setAuthError(message);
          setOrders([]);
          setRole(null);
          return;
        }

        throw new Error(message);
      }

      const nextOrders = payload.orders ?? [];

      setRole(payload.role);
      setCounts(payload.counts ?? { open: 0, fulfilled: 0, archived: 0, all: nextOrders.length });
      setOrders(nextOrders);
      setSelectedOrderId((current) => {
        if (current && nextOrders.some((order) => order.id === current)) {
          return current;
        }

        return nextOrders[0]?.id ?? null;
      });
      setAuthError(null);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load fulfillment data.");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, user?.id]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setIsLoading(false);
      setOrders([]);
      setRole(null);
      return;
    }

    void loadOrders(activeBucket);
  }, [activeBucket, isLoaded, isSignedIn, loadOrders]);

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return orders;
    }

    return orders.filter((order) => {
      const searchableValues = [
        order.orderNumber,
        order.customerEmail,
        order.shippingAddress.name ?? "",
        order.shippingCarrier ?? "",
        order.trackingNumber ?? "",
        ...order.items.map((item) => item.productName),
      ].join(" ").toLowerCase();

      return searchableValues.includes(query);
    });
  }, [orders, search]);

  const selectedOrder = useMemo(
    () => visibleOrders.find((order) => order.id === selectedOrderId) ?? orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId, visibleOrders]
  );

  useEffect(() => {
    if (!selectedOrder) {
      return;
    }

    setForm({
      status: selectedOrder.status,
      shippingCarrier: selectedOrder.shippingCarrier ?? "",
      trackingNumber: selectedOrder.trackingNumber ?? "",
      internalNotes: selectedOrder.internalNotes ?? "",
    });
  }, [selectedOrder]);

  async function handleSave() {
    if (!selectedOrder) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Please sign in again before saving changes.");
      }

      const response = await fetch(buildApiUrl(`/admin/orders?bucket=${activeBucket}`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Clerk-User-Id": user?.id ?? "",
        },
        credentials: "include",
        body: JSON.stringify({
          orderId: selectedOrder.id,
          status: form.status,
          shippingCarrier: form.shippingCarrier,
          trackingNumber: form.trackingNumber,
          internalNotes: form.internalNotes,
        }),
      });

      const payload = (await response.json()) as Partial<OrdersResponse> & { error?: string };
      if (!response.ok || !Array.isArray(payload.orders) || !payload.role) {
        throw new Error(payload.error ?? "Unable to update this order.");
      }

      const nextOrders = payload.orders ?? [];

      setRole(payload.role);
      setCounts(payload.counts ?? counts);
      setOrders(nextOrders);
      setSaveMessage("Order updated successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update the order.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Loading dashboard…</CardTitle>
            <CardDescription>Checking your Clerk session and loading order data.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              The fulfillment dashboard is password protected. Use your Clerk-managed owner credentials to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/sign-in/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Go to dashboard sign-in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
            <CardDescription>{authError}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Grant this Clerk user a role in Clerk metadata, for example <code>dashboardRole: "viewer"</code> or <code>dashboardRole: "admin"</code>.
            </p>
            <div className="flex items-center gap-3">
              <UserButton />
              <span>Signed in as {user?.primaryEmailAddress?.emailAddress ?? user?.id ?? "owner"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fulfillment Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Review new and fulfilled orders, see item quantities, and update shipment status with minimal overhead.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {role && <Badge variant={role === "admin" ? "default" : "secondary"}>{role}</Badge>}
          <Button type="button" variant="outline" onClick={() => void loadOrders(activeBucket)} disabled={isLoading}>
            Refresh
          </Button>
          <UserButton />
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(["open", "fulfilled", "archived", "all"] as OrderBucket[]).map((bucket) => (
          <Card key={bucket} className={cn(activeBucket === bucket && "ring-2 ring-primary/30")}>
            <CardHeader>
              <CardDescription>{bucketLabels[bucket]}</CardDescription>
              <CardTitle>{counts[bucket] ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                size="sm"
                variant={activeBucket === bucket ? "default" : "outline"}
                onClick={() => setActiveBucket(bucket)}
              >
                View
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {(error || saveMessage) && (
        <div className="mb-4 space-y-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saveMessage && <p className="text-sm text-green-700">{saveMessage}</p>}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>
              Focus on open fulfillment first, then switch to fulfilled or archived orders when needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by order number, email, or product"
            />

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading orders…</p>
            ) : visibleOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders match this view yet.</p>
            ) : (
              <div className="space-y-3">
                {visibleOrders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition hover:border-primary/50 hover:bg-muted/40",
                      selectedOrderId === order.id && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getStatusTone(order.status)}>{order.status}</Badge>
                        <Badge variant={getPaymentTone(order.paymentStatus)}>{order.paymentStatus}</Badge>
                      </div>
                    </div>

                    <p className="text-sm font-medium">{order.shippingAddress.name ?? order.customerEmail}</p>
                    <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{orderPreview(order) || `${order.itemCount} item(s)`}</p>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span>{order.itemCount} item{order.itemCount === 1 ? "" : "s"}</span>
                      <span className="font-semibold">{formatCurrency(order.total)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedOrder ? selectedOrder.orderNumber : "Order detail"}</CardTitle>
            <CardDescription>
              {selectedOrder ? "Everything needed to pack and mark the order as shipped." : "Select an order to see fulfillment details."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!selectedOrder ? (
              <p className="text-sm text-muted-foreground">Choose an order from the list to view products, totals, and shipping info.</p>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getStatusTone(selectedOrder.status)}>{selectedOrder.status}</Badge>
                  <Badge variant={getPaymentTone(selectedOrder.paymentStatus)}>{selectedOrder.paymentStatus}</Badge>
                  {selectedOrder.fulfilledAt && <Badge variant="outline">Fulfilled {formatDate(selectedOrder.fulfilledAt)}</Badge>}
                </div>

                <div className="space-y-2 text-sm">
                  <p className="font-medium">Shipping</p>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    {formatAddress(selectedOrder.shippingAddress).map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                    {selectedOrder.customerPhone && (
                      <p className="mt-2">
                        <a href={`tel:${selectedOrder.customerPhone}`} className="text-primary underline-offset-4 hover:underline">
                          {selectedOrder.customerPhone}
                        </a>
                      </p>
                    )}
                    <p>
                      <a href={`mailto:${selectedOrder.customerEmail}`} className="text-primary underline-offset-4 hover:underline">
                        {selectedOrder.customerEmail}
                      </a>
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="font-medium">Items</p>
                  <div className="rounded-lg border">
                    {selectedOrder.items.map((item, index) => (
                      <div key={item.id} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            {item.productSku && <p className="text-xs text-muted-foreground">SKU: {item.productSku}</p>}
                            <p className="text-xs text-muted-foreground">Qty {item.quantity} × {formatCurrency(item.unitPrice)}</p>
                          </div>
                          <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
                        </div>
                        {index < selectedOrder.items.length - 1 && <Separator className="mt-3" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Subtotal</p>
                    <p className="font-semibold">{formatCurrency(selectedOrder.subtotal)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-semibold">{formatCurrency(selectedOrder.total)}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="font-medium">Customer note</p>
                  <div className="rounded-lg border bg-muted/30 p-3 text-muted-foreground">
                    {selectedOrder.customerNotes?.trim() || "No customer note provided."}
                  </div>
                </div>

                {role === "admin" ? (
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="order-status">Order status</Label>
                        <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as OrderStatus }))}>
                          <SelectTrigger id="order-status" className="w-full">
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="shipping-carrier">Carrier</Label>
                        <Input
                          id="shipping-carrier"
                          value={form.shippingCarrier}
                          onChange={(event) => setForm((current) => ({ ...current, shippingCarrier: event.target.value }))}
                          placeholder="USPS, UPS, FedEx"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tracking-number">Tracking number</Label>
                      <Input
                        id="tracking-number"
                        value={form.trackingNumber}
                        onChange={(event) => setForm((current) => ({ ...current, trackingNumber: event.target.value }))}
                        placeholder="Add tracking once mailed"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="internal-notes">Internal fulfillment notes</Label>
                      <textarea
                        id="internal-notes"
                        value={form.internalNotes}
                        onChange={(event) => setForm((current) => ({ ...current, internalNotes: event.target.value }))}
                        rows={4}
                        className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        placeholder="Packing notes, return info, or refund context"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
                        {isSaving ? "Saving…" : "Save changes"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setForm((current) => ({ ...current, status: "shipped" }))}
                        disabled={isSaving}
                      >
                        Mark as shipped
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border p-4 text-sm">
                    <p className="font-medium">Fulfillment details</p>
                    <p><span className="text-muted-foreground">Carrier:</span> {selectedOrder.shippingCarrier || "—"}</p>
                    <p><span className="text-muted-foreground">Tracking:</span> {selectedOrder.trackingNumber || "—"}</p>
                    <p><span className="text-muted-foreground">Internal note:</span> {selectedOrder.internalNotes?.trim() || "—"}</p>
                    <p className="text-muted-foreground">Viewer accounts can see orders but cannot change them.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
