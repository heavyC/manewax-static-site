import { neon } from '@neondatabase/serverless';
import { jsonResponse } from '@/server/api/_shared/http';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    if (!process.env.DATABASE_URL) {
      return jsonResponse({ error: 'DATABASE_URL not found' }, { status: 500 });
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Test basic query
    const result = await sql`SELECT COUNT(*) as count FROM products`;
    const count = result[0]?.count || 0;
    
    console.log(`Database test successful: ${count} products found`);
    
    return jsonResponse({ 
      status: 'success', 
      productCount: count,
      message: 'Database connection working'
    });
  } catch (error) {
    console.error('Database test failed:', error);
    return jsonResponse({ 
      error: 'Database connection failed', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}