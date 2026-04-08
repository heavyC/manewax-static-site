import { neon } from "@neondatabase/serverless";
import { requireDashboardAccess } from "@/server/api/_shared/admin-auth";
import { jsonResponse } from "@/server/api/_shared/http";

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "returned" | "cancelled" | "refunded";
type OrderBucket = "open" | "fulfilled" | "archived" | "all";

type ParsedAddress = {
  name: string | null;
  phone: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

const allowedStatuses = new Set<OrderStatus>([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
  "refunded",
]);

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  return neon(process.env.DATABASE_URL);
}

function toBucket(status: string): OrderBucket {
  if (["pending", "confirmed", "processing"].includes(status)) {
    return "open";
  }

  if (["shipped", "delivered"].includes(status)) {
    return "fulfilled";
  }

  return "archived";
}

function parseAddress(raw: unknown): ParsedAddress {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const address = (parsed ?? {}) as Record<string, unknown>;

    return {
      name: typeof address.name === "string" ? address.name : null,
      phone: typeof address.phone === "string" ? address.phone : null,
      line1: typeof address.line1 === "string" ? address.line1 : null,
      line2: typeof address.line2 === "string" ? address.line2 : null,
      city: typeof address.city === "string" ? address.city : null,
      state: typeof address.state === "string" ? address.state : null,
      postalCode: typeof address.postalCode === "string" ? address.postalCode : null,
      country: typeof address.country === "string" ? address.country : null,
    };
  } catch {
    return {
      name: null,
      phone: null,
      line1: null,
      line2: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
    };
  }
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function isMissingFulfillmentColumnError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return ["shipping_carrier", "tracking_number", "fulfilled_at"].some((column) =>
    message.includes(column) && message.includes("does not exist")
  );
}

async function queryOrders(includeFulfillmentFields: boolean) {
  const sql = getSql();

  return sql.query(`
    SELECT
      o.id,
      o.order_number,
      o.status,
      o.payment_status,
      o.subtotal,
      o.tax_amount,
      o.shipping_amount,
      o.discount_amount,
      o.total,
      o.customer_email,
      o.customer_phone,
      o.shipping_address,
      ${includeFulfillmentFields ? "o.shipping_carrier," : "NULL::varchar AS shipping_carrier,"}
      ${includeFulfillmentFields ? "o.tracking_number," : "NULL::varchar AS tracking_number,"}
      ${includeFulfillmentFields ? "o.fulfilled_at," : "NULL::timestamp AS fulfilled_at,"}
      o.customer_notes,
      o.internal_notes,
      o.created_at,
      o.updated_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id,
            'productId', oi.product_id,
            'productName', oi.product_name,
            'productSku', oi.product_sku,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'totalPrice', oi.total_price
          )
          ORDER BY oi.id ASC
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'
      ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id
    ORDER BY
      CASE
        WHEN o.status IN ('pending', 'confirmed', 'processing') THEN 0
        WHEN o.status IN ('shipped', 'delivered') THEN 1
        ELSE 2
      END,
      o.created_at DESC
  `);
}

async function listOrders() {
  let rows: Array<Record<string, unknown>>;

  try {
    rows = await queryOrders(true) as Array<Record<string, unknown>>;
  } catch (error) {
    if (!isMissingFulfillmentColumnError(error)) {
      throw error;
    }

    rows = await queryOrders(false) as Array<Record<string, unknown>>;
  }

  return rows.map((row: Record<string, unknown>) => {
    const items = Array.isArray(row.items)
      ? row.items
      : typeof row.items === "string"
        ? (JSON.parse(row.items) as Array<Record<string, unknown>>)
        : [];

    return {
      id: toNumber(row.id),
      orderNumber: String(row.order_number ?? ""),
      status: String(row.status ?? "confirmed") as OrderStatus,
      paymentStatus: String(row.payment_status ?? "pending"),
      subtotal: toNumber(row.subtotal),
      taxAmount: toNumber(row.tax_amount),
      shippingAmount: toNumber(row.shipping_amount),
      discountAmount: toNumber(row.discount_amount),
      total: toNumber(row.total),
      customerEmail: String(row.customer_email ?? ""),
      customerPhone: typeof row.customer_phone === "string" ? row.customer_phone : null,
      shippingCarrier: typeof row.shipping_carrier === "string" ? row.shipping_carrier : null,
      trackingNumber: typeof row.tracking_number === "string" ? row.tracking_number : null,
      fulfilledAt: row.fulfilled_at ? String(row.fulfilled_at) : null,
      customerNotes: typeof row.customer_notes === "string" ? row.customer_notes : null,
      internalNotes: typeof row.internal_notes === "string" ? row.internal_notes : null,
      createdAt: String(row.created_at ?? ""),
      updatedAt: String(row.updated_at ?? ""),
      shippingAddress: parseAddress(row.shipping_address),
      itemCount: items.reduce((sum, item) => sum + toNumber(item.quantity), 0),
      items: items.map((item) => ({
        id: toNumber(item.id),
        productId: toNumber(item.productId),
        productName: String(item.productName ?? "Product"),
        productSku: typeof item.productSku === "string" ? item.productSku : null,
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        totalPrice: toNumber(item.totalPrice),
      })),
    };
  });
}

async function buildOrdersResponse(request: Request) {
  const accessResult = await requireDashboardAccess(request);
  if ("response" in accessResult) {
    return accessResult.response;
  }

  const { searchParams } = new URL(request.url);
  const requestedBucket = searchParams.get("bucket");
  const bucket: OrderBucket = requestedBucket === "fulfilled" || requestedBucket === "archived" || requestedBucket === "all"
    ? requestedBucket
    : "open";

  const allOrders = await listOrders();
  const filteredOrders = bucket === "all" ? allOrders : allOrders.filter((order) => toBucket(order.status) === bucket);

  return jsonResponse(
    {
      role: accessResult.access.role,
      counts: {
        open: allOrders.filter((order) => toBucket(order.status) === "open").length,
        fulfilled: allOrders.filter((order) => toBucket(order.status) === "fulfilled").length,
        archived: allOrders.filter((order) => toBucket(order.status) === "archived").length,
        all: allOrders.length,
      },
      orders: filteredOrders,
    },
    undefined,
    request
  );
}

export async function GET(request: Request) {
  try {
    return await buildOrdersResponse(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: "Failed to fetch dashboard orders.", details: message }, { status: 500 }, request);
  }
}

export async function PATCH(request: Request) {
  try {
    const accessResult = await requireDashboardAccess(request, { requireAdmin: true });
    if ("response" in accessResult) {
      return accessResult.response;
    }

    const body = (await request.json()) as {
      orderId?: number;
      status?: string;
      shippingCarrier?: string;
      trackingNumber?: string;
      internalNotes?: string;
    };

    const orderId = Number(body.orderId);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return jsonResponse({ error: "A valid order id is required." }, { status: 400 }, request);
    }

    let nextStatus: OrderStatus | null = null;
    if (typeof body.status === "string") {
      const normalizedStatus = body.status.trim().toLowerCase() as OrderStatus;
      if (!allowedStatuses.has(normalizedStatus)) {
        return jsonResponse({ error: "Invalid order status supplied." }, { status: 400 }, request);
      }

      nextStatus = normalizedStatus;
    }

    const shippingCarrier = toOptionalString(body.shippingCarrier, 120);
    const trackingNumber = toOptionalString(body.trackingNumber, 120);
    const internalNotes = toOptionalString(body.internalNotes, 2000);

    const sql = getSql();
    const updatedRows = await sql.query(
      `
        UPDATE orders
        SET
          status = COALESCE($2, status),
          shipping_carrier = $3,
          tracking_number = $4,
          internal_notes = $5,
          fulfilled_at = CASE
            WHEN COALESCE($2, status) IN ('shipped', 'delivered') THEN COALESCE(fulfilled_at, NOW())
            WHEN $2 IN ('pending', 'confirmed', 'processing') THEN NULL
            ELSE fulfilled_at
          END,
          payment_status = CASE
            WHEN COALESCE($2, status) = 'refunded' THEN 'refunded'
            ELSE payment_status
          END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [orderId, nextStatus, shippingCarrier, trackingNumber, internalNotes]
    );

    if (updatedRows.length === 0) {
      return jsonResponse({ error: "Order not found." }, { status: 404 }, request);
    }

    return await buildOrdersResponse(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: "Failed to update the order.", details: message }, { status: 500 }, request);
  }
}
