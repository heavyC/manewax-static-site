// lib/db/schema/products.ts
import { pgTable, serial, varchar, text, decimal, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { categories } from "./categories";

export const productStatusEnum = pgEnum("product_status", ["active", "coming_soon", "inactive"]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  stockQuantity: integer("stock_quantity").default(0).notNull(),
  lowStockThreshold: integer("low_stock_threshold").default(10),
  status: productStatusEnum("status").default("active").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  // Equine-specific fields
  weight: decimal("weight", { precision: 8, scale: 2 }), // For shipping calculations
  dimensions: varchar("dimensions", { length: 100 }), // "4x2x1 inches"
  ingredients: text("ingredients"), // Wax ingredients list
  usage: text("usage"), // Application instructions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  altText: varchar("alt_text", { length: 255 }),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));