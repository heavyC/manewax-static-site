ALTER TYPE "public"."order_status" ADD VALUE 'returned' BEFORE 'cancelled';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_carrier" varchar(120);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_number" varchar(120);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfilled_at" timestamp;