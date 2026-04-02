import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { schema } from './schema';

// Lazily initialized so the module can be imported at build time without secrets.
type Schema = typeof schema;
let _db: NeonHttpDatabase<Schema> | null = null;

function getInstance(): NeonHttpDatabase<Schema> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL);
    _db = drizzle(sql, {
      schema,
      logger: process.env.NODE_ENV === 'development',
    });
  }
  return _db;
}

export const db: NeonHttpDatabase<Schema> = new Proxy({} as NeonHttpDatabase<Schema>, {
  get(_, prop: string | symbol) {
    return Reflect.get(getInstance(), prop);
  },
});

// Export types
export type Database = typeof db;

// Re-export schema for convenience
export * from './schema';