import { Suspense } from 'react';
import { CheckoutSuccessDialog } from '@/components/ecommerce/cart/checkout-success-dialog';
import { ProductCard } from '@/components/ecommerce/product/product-card';
import { Product } from '@/lib/types/product';
import { neon } from '@neondatabase/serverless';
import { mockProducts } from '../../lib/data/mock-products'

async function getProducts(): Promise<Product[]> {
  try {
    if (!process.env.DATABASE_URL) {
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
      ORDER BY p.created_at DESC
    `;
    return products as Product[];
  } catch (error) {
    console.error('Error fetching shop products:', error);
    return mockProducts;
  }
}

function ProductSkeleton() {
  return (
    <div className="h-96 bg-gray-200 rounded-lg animate-pulse">
      <div className="h-64 bg-gray-300 rounded-t-lg"></div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-3 bg-gray-300 rounded w-full"></div>
        <div className="h-3 bg-gray-300 rounded w-2/3"></div>
        <div className="h-6 bg-gray-300 rounded w-1/4"></div>
      </div>
    </div>
  );
}

function ProductGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}

async function ProductList() {
  const products = await getProducts();

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No products available at this time.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default function Shop() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense>
        <CheckoutSuccessDialog />
      </Suspense>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Shop</h1>
        <p className="text-muted-foreground text-lg">
          Premium handmade wax products for equine care. Trusted by riders, owners, and groomers.
        </p>
      </div>

      <Suspense fallback={<ProductGrid />}>
        <ProductList />
      </Suspense>
    </div>
  );
}