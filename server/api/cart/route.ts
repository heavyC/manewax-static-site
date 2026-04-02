import { neon } from "@neondatabase/serverless";
import { getCartSessionId, getOptionalUserId, jsonResponse } from "@/server/api/_shared/http";

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  return neon(process.env.DATABASE_URL);
}

async function resolveCartOwner(request: Request) {
  const userId = getOptionalUserId(request);
  const sessionId = getCartSessionId(request);

  if (!userId && !sessionId) {
    return { userId: null, sessionId: null, valid: false };
  }

  return { userId, sessionId, valid: true };
}

export async function GET(request: Request) {
  try {
    const owner = await resolveCartOwner(request);
    if (!owner.valid) {
      return jsonResponse({ items: [], subtotal: 0, itemCount: 0 }, undefined, request);
    }

    const sql = getSql();

    const cartItems = await sql.query(
      `
        SELECT
          ci.id,
          ci.product_id,
          ci.quantity,
          ci.price,
          p.name,
          p.slug,
          p.status,
          p.stock_quantity,
          pi.url AS image_url
        FROM cart_items ci
        INNER JOIN products p ON p.id = ci.product_id
        LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.sort_order = 0
        WHERE
          ($1::varchar IS NOT NULL AND ci.user_id = $1)
          OR
          ($1::varchar IS NULL AND $2::varchar IS NOT NULL AND ci.session_id = $2)
        ORDER BY ci.created_at DESC
      `,
      [owner.userId, owner.sessionId]
    );

    const items = cartItems.map((item: Record<string, unknown>) => {
      const unitPrice = Number(item.price);
      const quantity = Number(item.quantity);

      return {
        id: Number(item.id),
        productId: Number(item.product_id),
        productName: String(item.name),
        productSlug: String(item.slug),
        productStatus: String(item.status),
        stockQuantity: Number(item.stock_quantity),
        imageUrl: (item.image_url as string | null) ?? "/images/products/placeholder.jpg",
        unitPrice,
        quantity,
        lineTotal: Number((unitPrice * quantity).toFixed(2)),
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return jsonResponse(
      {
        items,
        subtotal: Number(subtotal.toFixed(2)),
        itemCount,
      },
      undefined,
      request
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: "Failed to fetch cart", details: message }, { status: 500 }, request);
  }
}

export async function POST(request: Request) {
  try {
    const owner = await resolveCartOwner(request);
    if (!owner.valid) {
      return jsonResponse({ error: "Cart session is required" }, { status: 400 }, request);
    }

    const body = (await request.json()) as { productId?: number; quantity?: number };
    const productId = Number(body.productId);
    const quantity = Number(body.quantity ?? 1);

    if (!Number.isFinite(productId) || productId <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      return jsonResponse({ error: "Invalid cart item payload" }, { status: 400 }, request);
    }

    const sql = getSql();
    const products = await sql.query(
      `
        SELECT id, price, stock_quantity, status
        FROM products
        WHERE id = $1
        LIMIT 1
      `,
      [productId]
    );

    if (products.length === 0) {
      return jsonResponse({ error: "Product not found" }, { status: 404 }, request);
    }

    const product = products[0] as Record<string, unknown>;
    const status = String(product.status);
    const stockQuantity = Number(product.stock_quantity);

    if (status !== "active") {
      return jsonResponse({ error: "Product is not available for purchase" }, { status: 400 }, request);
    }

    if (stockQuantity < quantity) {
      return jsonResponse({ error: "Requested quantity exceeds stock" }, { status: 400 }, request);
    }

    const existingRows = await sql.query(
      `
        SELECT id, quantity
        FROM cart_items
        WHERE product_id = $1
          AND (
            ($2::varchar IS NOT NULL AND user_id = $2)
            OR
            ($2::varchar IS NULL AND $3::varchar IS NOT NULL AND session_id = $3)
          )
        LIMIT 1
      `,
      [productId, owner.userId, owner.sessionId]
    );

    if (existingRows.length > 0) {
      const existing = existingRows[0] as Record<string, unknown>;
      const nextQuantity = Number(existing.quantity) + quantity;

      if (nextQuantity > stockQuantity) {
        return jsonResponse({ error: "Requested quantity exceeds stock" }, { status: 400 }, request);
      }

      await sql.query(
        `UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2`,
        [nextQuantity, Number(existing.id)]
      );
    } else {
      await sql.query(
        `
          INSERT INTO cart_items (user_id, session_id, product_id, quantity, price)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [owner.userId, owner.sessionId, productId, quantity, String(product.price)]
      );
    }

    return GET(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: "Failed to add cart item", details: message }, { status: 500 }, request);
  }
}

export async function PATCH(request: Request) {
  try {
    const owner = await resolveCartOwner(request);
    if (!owner.valid) {
      return jsonResponse({ error: "Cart session is required" }, { status: 400 }, request);
    }

    const body = (await request.json()) as { itemId?: number; quantity?: number };
    const itemId = Number(body.itemId);
    const quantity = Number(body.quantity);

    if (!Number.isFinite(itemId) || itemId <= 0 || !Number.isFinite(quantity) || quantity < 0) {
      return jsonResponse({ error: "Invalid cart update payload" }, { status: 400 }, request);
    }

    const sql = getSql();

    if (quantity === 0) {
      await sql.query(
        `
          DELETE FROM cart_items
          WHERE id = $1
            AND (
              ($2::varchar IS NOT NULL AND user_id = $2)
              OR
              ($2::varchar IS NULL AND $3::varchar IS NOT NULL AND session_id = $3)
            )
        `,
        [itemId, owner.userId, owner.sessionId]
      );

      return GET(request);
    }

    const itemRows = await sql.query(
      `
        SELECT ci.product_id, p.stock_quantity
        FROM cart_items ci
        INNER JOIN products p ON p.id = ci.product_id
        WHERE ci.id = $1
          AND (
            ($2::varchar IS NOT NULL AND ci.user_id = $2)
            OR
            ($2::varchar IS NULL AND $3::varchar IS NOT NULL AND ci.session_id = $3)
          )
        LIMIT 1
      `,
      [itemId, owner.userId, owner.sessionId]
    );

    if (itemRows.length === 0) {
      return jsonResponse({ error: "Cart item not found" }, { status: 404 }, request);
    }

    const row = itemRows[0] as Record<string, unknown>;
    if (quantity > Number(row.stock_quantity)) {
      return jsonResponse({ error: "Requested quantity exceeds stock" }, { status: 400 }, request);
    }

    await sql.query(`UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2`, [quantity, itemId]);

    return GET(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: "Failed to update cart item", details: message }, { status: 500 }, request);
  }
}

export async function DELETE(request: Request) {
  try {
    const owner = await resolveCartOwner(request);
    if (!owner.valid) {
      return jsonResponse({ error: "Cart session is required" }, { status: 400 }, request);
    }

    const { searchParams } = new URL(request.url);
    const itemIdParam = searchParams.get("itemId");
    const sql = getSql();

    if (itemIdParam) {
      const itemId = Number(itemIdParam);
      if (!Number.isFinite(itemId) || itemId <= 0) {
        return jsonResponse({ error: "Invalid item id" }, { status: 400 }, request);
      }

      await sql.query(
        `
          DELETE FROM cart_items
          WHERE id = $1
            AND (
              ($2::varchar IS NOT NULL AND user_id = $2)
              OR
              ($2::varchar IS NULL AND $3::varchar IS NOT NULL AND session_id = $3)
            )
        `,
        [itemId, owner.userId, owner.sessionId]
      );

      return GET(request);
    }

    await sql.query(
      `
        DELETE FROM cart_items
        WHERE
          ($1::varchar IS NOT NULL AND user_id = $1)
          OR
          ($1::varchar IS NULL AND $2::varchar IS NOT NULL AND session_id = $2)
      `,
      [owner.userId, owner.sessionId]
    );

    return jsonResponse({ items: [], subtotal: 0, itemCount: 0 }, undefined, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: "Failed to remove cart item", details: message }, { status: 500 }, request);
  }
}
