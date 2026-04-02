"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ecommerce/product/product-card";
import { buildApiUrl } from "@/lib/static-site";
import type { Product } from "@/lib/types/product";

const REFRESH_INTERVAL_MS = 60_000;

function ProductSkeleton() {
  return (
    <div className="h-96 animate-pulse rounded-lg bg-gray-200">
      <div className="h-64 rounded-t-lg bg-gray-300" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded bg-gray-300" />
        <div className="h-3 w-full rounded bg-gray-300" />
        <div className="h-3 w-2/3 rounded bg-gray-300" />
        <div className="h-6 w-1/4 rounded bg-gray-300" />
      </div>
    </div>
  );
}

export function LiveProductList({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(initialProducts.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadProducts() {
      try {
        const response = await fetch(buildApiUrl("/products"), {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json()) as Product[] | { error?: string };
        if (!response.ok || !Array.isArray(payload)) {
          throw new Error(
            !Array.isArray(payload) && payload.error ? payload.error : "Unable to load products right now."
          );
        }

        if (!isActive) {
          return;
        }

        setProducts(payload);
        setError(null);
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to refresh products right now.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadProducts();
    const timer = window.setInterval(() => {
      void loadProducts();
    }, REFRESH_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, []);

  if (isLoading && products.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, index) => (
          <ProductSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-muted-foreground">No products available at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-muted-foreground">
          Live catalog refresh is temporarily unavailable. Showing the latest saved product data.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={`${product.slug}-${product.updated_at ?? product.id}`} product={product} />
        ))}
      </div>
    </div>
  );
}
