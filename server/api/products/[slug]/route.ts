import { neon } from '@neondatabase/serverless';
import { jsonResponse } from '@/server/api/_shared/http';

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return neon(process.env.DATABASE_URL);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        array_agg(
          json_build_object(
            'id', pi.id,
            'url', pi.url,
            'alt_text', pi.alt_text,
            'sort_order', pi.sort_order
          ) ORDER BY pi.sort_order
        ) as images
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.slug = $1 AND p.status IN ('active', 'coming_soon')
      GROUP BY p.id, c.name, c.slug
    `;
    
    const result = await getSql().query(query, [slug]);
    
    if (result.length === 0) {
      return jsonResponse(
        { error: 'Product not found' },
        { status: 404 },
        request
      );
    }
    
    return jsonResponse(result[0], undefined, request);
  } catch (error) {
    console.error('Error fetching product:', error);
    return jsonResponse(
      { error: 'Failed to fetch product' },
      { status: 500 },
      request
    );
  }
}