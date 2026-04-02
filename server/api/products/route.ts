import { neon } from '@neondatabase/serverless';
import { jsonResponse } from '@/server/api/_shared/http';

export async function GET(request: Request) {
  try {
    // Check environment variable
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is missing');
      return jsonResponse(
        { error: 'Database configuration error' },
        { status: 500 },
        request
      );
    }

    const sql = neon(process.env.DATABASE_URL);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    let query = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price,
        p.compare_at_price,
        p.sku,
        p.stock_quantity,
        p.low_stock_threshold,
        p.status,
        p.category_id,
        p.weight,
        p.dimensions,
        p.ingredients,
        p.usage,
        p.created_at,
        p.updated_at,
        c.name as category_name,
        c.slug as category_slug,
        pi.url as image_url,
        pi.alt_text as image_alt
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.sort_order = 0
      WHERE p.status IN ('active', 'coming_soon')
    `;
    
    const params = [];
    
    if (category) {
      query += ` AND c.slug = $${params.length + 1}`;
      params.push(category);
    }
    
    query += ` ORDER BY p.created_at DESC`;
    
    console.log('Executing query:', query);
    console.log('With params:', params);
    
    const products = await sql.query(query, params);
    
    console.log(`Found ${products.length} products`);
    
    return jsonResponse(products, undefined, request);
  } catch (error) {
    console.error('Detailed error fetching products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(
      { error: 'Failed to fetch products', details: errorMessage },
      { status: 500 },
      request
    );
  }
}