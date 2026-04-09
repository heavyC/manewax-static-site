import { Suspense } from "react";
import { neon } from "@neondatabase/serverless";
import { CheckoutSuccessDialog } from "@/components/ecommerce/cart/checkout-success-dialog";
import { LiveProductList } from "@/components/ecommerce/product/live-product-list";
import { mockProducts } from "@/lib/data/mock-products";
import { shouldUseMockProducts } from "@/lib/static-site";
import { Product } from "@/lib/types/product";

async function getProducts(): Promise<Product[]> {
  try {
    if (shouldUseMockProducts() || !process.env.DATABASE_URL) {
      return mockProducts;
    }

    const sql = neon(process.env.DATABASE_URL);
    const products = await sql`
      SELECT p.id, p.name, p.slug, p.description, p.price, p.sku,
             p.stock_quantity, p.low_stock_threshold, p.status,
             p.category_id, p.created_at, p.updated_at,
             COALESCE(
               json_agg(
                 json_build_object('id', i.id, 'url', i.url, 'alt_text', i.alt_text, 'sort_order', i.sort_order)
                 ORDER BY i.sort_order ASC
               ) FILTER (WHERE i.id IS NOT NULL),
               '[]'
             ) AS images
      FROM products p
      LEFT JOIN product_images i ON i.product_id = p.id
      WHERE p.status IN ('active', 'coming_soon')
      GROUP BY p.id
      ORDER BY CASE WHEN p.status = 'coming_soon' THEN 1 ELSE 0 END, p.created_at DESC
    `;

    return products as Product[];
  } catch (error) {
    console.error("Error fetching shop products:", error);
    return mockProducts;
  }
}

export default async function Shop() {
  const initialProducts = await getProducts();

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense>
        <CheckoutSuccessDialog />
      </Suspense>

      <div className="mb-8">
        <p className="text-foreground text-center text-2xl font-bold">
          Premium handmade wax products for equine care.
          <br />
          Veternarian formulated and handmade in small batches.
          <br />
          Trusted by riders, owners, and groomers.
        </p>
      </div>

      <LiveProductList initialProducts={initialProducts} />
    </div>
  );
}