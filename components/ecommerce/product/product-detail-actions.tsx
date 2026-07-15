"use client";

import Link from "next/link";
import { useCart } from "@/components/ecommerce/cart/cart-provider";
import { ETSY_SHOP_BASE_URL } from "@/lib/constants"
import { Button, buttonVariants } from '@/components/ui/button';

interface ProductDetailActionsProps {
  productId: number;
  productName: string;
  productSlug: string;
  productPrice: number;
  productStatus: string;
  stockQuantity: number;
  imageUrl?: string;
  isComingSoon: boolean;
  isOutOfStock: boolean;
}

export function ProductDetailActions({
  productId,
  productName,
  productSlug,
  productPrice,
  productStatus,
  stockQuantity,
  imageUrl,
  isComingSoon,
  isOutOfStock,
}: ProductDetailActionsProps) {
  const { addToCart, isLoading, error } = useCart();
  const isNotPurchasable = isComingSoon || isOutOfStock;

  async function handleAddToCart() {
    if (isNotPurchasable) {
      return;
    }

    await addToCart(
      {
        id: productId,
        name: productName,
        slug: productSlug,
        status: productStatus,
        stockQuantity,
        imageUrl: imageUrl ?? "/images/products/placeholder.jpg",
        unitPrice: productPrice,
      },
      1
    );
  }

  return (
    <div className="space-y-3">
        <Link
            href={`${ETSY_SHOP_BASE_URL}${productSlug}`}
            className={buttonVariants({ variant: "default", className: "w-full" })}
        >View on Etsy</Link>

      <Button
        className="w-full"
        size="lg"
        variant={isNotPurchasable ? "outline" : "secondary"}
        disabled={isNotPurchasable || isLoading}
        onClick={() => void handleAddToCart()}
      >
        {isComingSoon
          ? "Coming Soon"
          : isOutOfStock
            ? "Out of Stock"
            : `Add to Cart - $${productPrice}`}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
