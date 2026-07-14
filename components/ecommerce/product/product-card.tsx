// components/ecommerce/product/product-card.tsx
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Product } from '@/lib/types/product';
import { useCart } from '@/components/ecommerce/cart/cart-provider';
import {ETSY_SHOP_BASE_URL} from '@/lib/constants';


interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, isLoading } = useCart();
  const isComingSoon = product.status === 'coming_soon';
  const isOutOfStock = !isComingSoon && product.stock_quantity === 0;
  const isNotPurchasable = isComingSoon || isOutOfStock;
  const cartProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: product.status,
    stockQuantity: product.stock_quantity,
    imageUrl: product.images?.[0]?.url || '/images/products/placeholder.jpg',
    unitPrice: Number(product.price),
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-0">
        <div className="relative aspect-square overflow-hidden rounded-t-lg">
          <Link
            href={`/products/${product.slug}`}
            className="group"
          >
            <Image
              src={product.images?.[0]?.url || '/images/products/placeholder.jpg'}
              alt={product.image_alt || product.name}
              fill
              className="object-cover transition-transform hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </Link>
          {isComingSoon && (
            <Badge className="absolute top-2 right-2" variant="secondary">
              Coming Soon
            </Badge>
          )}
          {isOutOfStock && (
            <Badge className="absolute top-2 right-2 text-destructive!" variant="secondary">
              Out of Stock
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-4">
        <Link 
          href={`/products/${product.slug}`}
          className="group"
        >
          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>
        <p className="text-muted-foreground text-sm mt-2 line-clamp-3">
          {product.description}
        </p>
        <div className="mt-4">
          <span className="text-2xl font-bold text-primary">
            ${product.price}
          </span>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Link
            href={`${ETSY_SHOP_BASE_URL}${product.slug}`}
            className={buttonVariants({ variant: "default", className: "w-full" })}
        >View on Etsy</Link>
      </CardFooter>
    </Card>
  );
}