import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { neon } from '@neondatabase/serverless';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ProductDetailActions } from '@/components/ecommerce/product/product-detail-actions';
import { mockProducts } from '@/lib/data/mock-products';
import { Product } from '@/lib/types/product';

export const dynamicParams = false;

async function getProduct(slug: string): Promise<Product | null> {
  if (!process.env.DATABASE_URL) {
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
    console.error('Error fetching product:', error);
    return mockProducts.find((product) => product.slug === slug) ?? null;
  }
}

export async function generateStaticParams() {
  if (!process.env.DATABASE_URL) {
    return mockProducts.map((product) => ({ slug: product.slug }));
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT slug FROM products WHERE status IN ('active', 'coming_soon') ORDER BY created_at DESC`;
    return rows.map((row) => ({ slug: String(row.slug) }));
  } catch (error) {
    console.error('Error generating product params:', error);
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

  const isComingSoon = product.status === 'coming_soon';
  const isOutOfStock = !isComingSoon && product.stock_quantity === 0;
  // const isNotPurchasable = isComingSoon || isOutOfStock;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-foreground">Shop</Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg">
            <Image
              src={product.images?.[0].url || '/images/products/placeholder.jpg'}
              alt={product.image_alt || product.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            {isComingSoon && (
              <Badge className="absolute top-4 right-4" variant="secondary">
                Coming Soon
              </Badge>
            )}
            {isOutOfStock && (
              <Badge className="absolute top-4 right-4" variant="destructive">
                Out of Stock
              </Badge>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            {product.category_name && (
              <p className="text-muted-foreground">
                Category: <span className="text-foreground">{product.category_name}</span>
              </p>
            )}
          </div>

          <div className="text-3xl font-bold text-primary">
            ${product.price}
            {product.compare_at_price && (
              <span className="text-lg text-muted-foreground line-through ml-2">
                ${product.compare_at_price}
              </span>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          </div>

          {product.ingredients && (
            <div>
              <h3 className="font-semibold mb-2">Ingredients</h3>
              <p className="text-muted-foreground">{product.ingredients}</p>
            </div>
          )}

          {product.usage && (
            <div>
              <h3 className="font-semibold mb-2">Usage Instructions</h3>
              <p className="text-muted-foreground">{product.usage}</p>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            {product.weight && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weight</span>
                <span>{product.weight}</span>
              </div>
            )}
            {product.dimensions && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensions</span>
                <span>{product.dimensions}</span>
              </div>
            )}
            {product.sku && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">SKU</span>
                <span className="font-mono text-sm">{product.sku}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Availability</span>
              <span className={isComingSoon || isOutOfStock ? "text-destructive" : "text-green-600"}>
                {isComingSoon ? "Coming Soon" : isOutOfStock ? "Out of Stock" : `${product.stock_quantity} in stock`}
              </span>
            </div>
          </div>

          <ProductDetailActions
            productId={product.id}
            productName={product.name}
            productSlug={product.slug}
            productPrice={Number(product.price)}
            productStatus={product.status}
            stockQuantity={product.stock_quantity}
            imageUrl={product.images?.[0]?.url}
            isComingSoon={isComingSoon}
            isOutOfStock={isOutOfStock}
          />
        </div>
      </div>
    </div>
  );
}