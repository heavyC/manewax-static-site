// components/ecommerce/product/product-grid.tsx
import { ProductCard } from './product-card';
import { Product } from '@/lib/types/product';

interface ProductGridProps {
  products: Product[];
  title?: string;
  className?: string;
}

export function ProductGrid({ products, title, className = "" }: ProductGridProps) {
  if (!products?.length) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-muted-foreground">No products found</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Check back soon for new equine care products!
        </p>
      </div>
    );
  }

  return (
    <section className={`space-y-6 ${className}`}>
      {title && (
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}