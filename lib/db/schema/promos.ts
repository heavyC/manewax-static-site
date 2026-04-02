import { relations } from "drizzle-orm";
import { boolean, integer, pgEnum, pgTable, serial, timestamp, varchar, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";

export const promoDiscountTypeEnum = pgEnum("promo_discount_type", ["percentage", "fixed"]);
export const promoStatusEnum = pgEnum("promo_status", ["active", "inactive", "expired"]);

export const promos = pgTable("promos", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  status: promoStatusEnum("status").default("active").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  discountType: promoDiscountTypeEnum("discount_type").notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxUses: integer("max_uses"),
  currentUses: integer("current_uses").default(0).notNull(),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  stripeCouponId: varchar("stripe_coupon_id", { length: 255 }),
  stripePromotionCodeId: varchar("stripe_promotion_code_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const promoUsages = pgTable("promo_usages", {
  id: serial("id").primaryKey(),
  promoId: integer("promo_id").references(() => promos.id),
  userId: varchar("user_id").references(() => users.id),
  email: varchar("email", { length: 255 }),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }).notNull(),
  orderId: integer("order_id"),
  amountDiscounted: decimal("amount_discounted", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promosRelations = relations(promos, ({ many }) => ({
  usages: many(promoUsages),
}));

export const promoUsagesRelations = relations(promoUsages, ({ one }) => ({
  promo: one(promos, {
    fields: [promoUsages.promoId],
    references: [promos.id],
  }),
  user: one(users, {
    fields: [promoUsages.userId],
    references: [users.id],
  }),
}));