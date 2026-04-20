"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProductDetailActions } from "@/components/ecommerce/product/product-detail-actions";
import { buildApiUrl, shouldUseMockProducts } from "@/lib/static-site";
import type { Product } from "@/lib/types/product";

const REFRESH_INTERVAL_MS = 60_000;

function isProduct(value: Product | { error?: string }): value is Product {
  return typeof value === "object" && value !== null && "id" in value && "slug" in value;
}

export function LiveProductDetail({ slug, initialProduct }: { slug: string; initialProduct: Product }) {
  const useMockCatalog = shouldUseMockProducts();
  const [product, setProduct] = useState<Product>(initialProduct);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (useMockCatalog) {
      setProduct(initialProduct);
      setError(null);
      return;
    }

    let isActive = true;

    async function loadProduct() {
      try {
        const response = await fetch(buildApiUrl(`/products/${encodeURIComponent(slug)}`), {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json()) as Product | { error?: string };
        if (!response.ok || !isProduct(payload)) {
          throw new Error(!Array.isArray(payload) && "error" in payload && payload.error ? payload.error : "Unable to load this product.");
        }

        if (!isActive) {
          return;
        }

        setProduct(payload);
        setError(null);
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to refresh this product right now.");
      }
    }

    void loadProduct();
    const timer = window.setInterval(() => {
      void loadProduct();
    }, REFRESH_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, [initialProduct, slug, useMockCatalog]);

  const isComingSoon = product.status === "coming_soon";
  const isOutOfStock = !isComingSoon && product.stock_quantity === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="mb-6">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-foreground">Shop</Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg">
            <Image
              src={product.images?.[0]?.url || "/images/products/placeholder.jpg"}
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

        <div className="space-y-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold">{product.name}</h1>
            {product.category_name && (
              <p className="text-muted-foreground">
                Category: <span className="text-foreground">{product.category_name}</span>
              </p>
            )}
          </div>

          <div className="text-3xl font-bold text-primary">
            ${product.price}
          </div>

          {error && <p className="text-sm text-muted-foreground">{error}</p>}

          <div>
            <h3 className="mb-2 font-semibold">Description</h3>
            <p className="leading-relaxed text-muted-foreground">{product.description}</p>
          </div>

          {product.ingredients && (
            <div>
              <h3 className="mb-2 font-semibold">Ingredients</h3>
              <p className="text-muted-foreground">{product.ingredients}</p>
            </div>
          )}

          {product.usage && (
            <div>
              <h3 className="mb-2 font-semibold">Usage Instructions</h3>
              <p className="text-muted-foreground">{product.usage}</p>
            </div>
          )}

          {/* <Separator /> */}

          <div className="space-y-3">
            {product.weight && (
              <div className="flex justify-between">
                {/* <span className="text-muted-foreground">Weight</span> */}
                {/* <span>{product.weight}</span> */}
              </div>
            )}
            {product.dimensions && (
              <div className="flex justify-between">
                {/* <span className="text-muted-foreground">Dimensions</span> */}
                {/* <span>{product.dimensions}</span> */}
              </div>
            )}
            {product.sku && (
              <div className="flex justify-between">
                {/* <span className="text-muted-foreground">SKU</span> */}
                {/* <span className="font-mono text-sm">{product.sku}</span> */}
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
