// components/ecommerce/cart/cart-button.tsx
'use client';

import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CartButtonProps {
  itemCount: number;
  onOpenCart?: () => void;
}

export function CartButton({ itemCount, onOpenCart }: CartButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="relative gap-2 pr-3"
      onClick={onOpenCart}
    >
      <ShoppingCart className="h-4 w-4" />
      <span>Shopping Cart</span>
      {itemCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {itemCount > 99 ? '99+' : itemCount}
        </Badge>
      )}
    </Button>
  );
}