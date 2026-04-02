import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
}

const sql = neon(process.env.DATABASE_URL);

async function migrateProductStatus() {
    console.log('🔧 Migrating product status model...');

    await sql`
    DO $$
    BEGIN
      CREATE TYPE product_status AS ENUM ('active', 'coming_soon', 'inactive');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `;

    await sql`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS status product_status;
  `;

    await sql`
    UPDATE products
    SET status = CASE
      WHEN is_active = true THEN 'active'::product_status
      ELSE 'inactive'::product_status
    END
    WHERE status IS NULL;
  `;

    await sql`
    ALTER TABLE products
    ALTER COLUMN status SET DEFAULT 'active'::product_status;
  `;

    await sql`
    ALTER TABLE products
    ALTER COLUMN status SET NOT NULL;
  `;

    console.log('✅ Product status migration complete.');
}

if (require.main === module) {
    migrateProductStatus()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('❌ Product status migration failed:', error);
            process.exit(1);
        });
}