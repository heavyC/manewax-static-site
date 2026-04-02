// lib/db/schema/index.ts
// Export all tables
export * from './users';
export * from './categories';
export * from './products';
export * from './cart';
export * from './orders';
export * from './promos';

// Export schema for Drizzle
import { users } from './users';
import { categories, categoriesRelations } from './categories';
import { products, productImages, productsRelations, productImagesRelations, productStatusEnum } from './products';
import { cartItems, cartItemsRelations } from './cart';
import { orders, orderItems, ordersRelations, orderItemsRelations, orderStatusEnum, paymentStatusEnum } from './orders';
import { promos, promoUsages, promosRelations, promoUsagesRelations, promoDiscountTypeEnum, promoStatusEnum } from './promos';

export const schema = {
  // Users
  users,
  
  // Categories  
  categories,
  categoriesRelations,
  
  // Products
  products,
  productImages,
  productsRelations,
  productImagesRelations,
  productStatusEnum,
  
  // Cart
  cartItems,
  cartItemsRelations,
  
  // Orders
  orders,
  orderItems,
  ordersRelations,
  orderItemsRelations,
  orderStatusEnum,
  paymentStatusEnum,

  // Promos
  promos,
  promoUsages,
  promosRelations,
  promoUsagesRelations,
  promoDiscountTypeEnum,
  promoStatusEnum,
};