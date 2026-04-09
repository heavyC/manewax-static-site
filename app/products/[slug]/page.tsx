import { notFound } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { LiveProductDetail } from "@/components/ecommerce/product/live-product-detail";
import { mockProducts } from "@/lib/data/mock-products";
import { shouldUseMockProducts } from "@/lib/static-site";
import { Product } from "@/lib/types/product";

export const dynamicParams = false;

async function getProduct(slug: string): Promise<Product | null> {
  if (shouldUseMockProducts() || !process.env.DATABASE_URL) {
    return mockProducts.find((product) => product.slug === slug) ?? null;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql.query(
      `SELECT p.*,
              c.name as category_name,
              c.slug as category_slug,
              array_agg(
                json_build_object(
                  'id', pi.id, 'url', pi.url,
                  'alt_text', pi.alt_text, 'sort_order', pi.sort_order
                ) ORDER BY pi.sort_order
              ) as images
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN product_images pi ON p.id = pi.product_id
        WHERE p.slug = $1 AND p.status IN ('active', 'coming_soon')
        GROUP BY p.id, c.name, c.slug`,
      [slug]
    );

    return (result[0] as Product | undefined) ?? mockProducts.find((product) => product.slug === slug) ?? null;
  } catch (error) {
    console.error("Error fetching product:", error);
    return mockProducts.find((product) => product.slug === slug) ?? null;
  }
}

export async function generateStaticParams() {
  if (shouldUseMockProducts() || !process.env.DATABASE_URL) {
    return mockProducts.map((product) => ({ slug: product.slug }));
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT slug FROM products WHERE status IN ('active', 'coming_soon') ORDER BY created_at DESC`;
    return rows.map((row) => ({ slug: String(row.slug) }));
  } catch (error) {
    console.error("Error generating product params:", error);
    return mockProducts.map((product) => ({ slug: product.slug }));
  }
}

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  return <LiveProductDetail slug={slug} initialProduct={product} />;
}