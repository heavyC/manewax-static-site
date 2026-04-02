import { neon } from "@neondatabase/serverless";
import { jsonResponse } from "@/server/api/_shared/http";

export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: "Database configuration error" }, { status: 500 }, request);
    }

    const sql = neon(process.env.DATABASE_URL);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let query = `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price,
        p.compare_at_price,
        p.sku,
        p.stock_quantity,
        p.low_stock_threshold,
        p.status,
        p.category_id,
        p.weight,
        p.dimensions,
        p.ingredients,
        p.usage,
        p.created_at,
        p.updated_at,
        c.name AS category_name,
        c.slug AS category_slug,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'url', pi.url,
              'alt_text', pi.alt_text,
              'sort_order', pi.sort_order
            )
            ORDER BY pi.sort_order ASC
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) AS images
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.status IN ('active', 'coming_soon')
    `;

    const params: string[] = [];

    if (category) {
      query += ` AND c.slug = $${params.length + 1}`;
      params.push(category);
    }

    query += `
      GROUP BY p.id, c.name, c.slug
      ORDER BY CASE WHEN p.status = 'coming_soon' THEN 1 ELSE 0 END, p.created_at DESC
    `;

    const products = await sql.query(query, params);
    return jsonResponse(products, undefined, request);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: "Failed to fetch products", details: errorMessage }, { status: 500 }, request);
  }
}