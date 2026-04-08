// Direct SQL approach for seeding
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = neon(process.env.DATABASE_URL);

async function seedWithRawSQL() {
  try {
    console.log('🌱 Starting database seed with raw SQL...');

    // Insert categories
    console.log('📁 Seeding categories...');
    
    const categories = [
      ['Hoof Care', 'hoof-care', 'Premium wax products for hoof health and protection'],
      ['Coat Care', 'coat-care', 'Nourishing wax treatments for coat shine and health'],
      ['Grooming Essentials', 'grooming-essentials', 'Essential wax products for daily horse grooming'],
      ['Show Prep', 'show-prep', 'Professional grooming wax for competition ready horses']
    ];

    for (const [name, slug, description] of categories) {
      await sql`
        INSERT INTO categories (name, slug, description)
        VALUES (${name}, ${slug}, ${description})
      `;
      console.log(`✓ Inserted category: ${name}`);
    }

    // Insert products
    console.log('🛍️ Seeding products...');
    
    // Get category IDs first
    const categoryResults = await sql`SELECT id, slug FROM categories ORDER BY id`;
    const categoryMap = Object.fromEntries(categoryResults.map(cat => [cat.slug, cat.id]));

    const products = [
      {
        name: "Itch Prevention and Repellent Bar",
        slug: "itch-prevention-repellent-bar",
        description: "Our Itch Prevention and Repellent Bar is specially formulated to provide long-lasting protection against insects while soothing irritated skin.",
        price: "34.99",
        sku: "IPR-001",
        stockQuantity: 25,
        weight: "4.00",
        dimensions: "4x2x1 inches",
        ingredients: "Beeswax, Coconut Oil, Citronella Essential Oil, Tea Tree Oil, Vitamin E",
        usage: "Apply directly to affected areas or as a preventive measure. Safe for daily use.",
        status: 'active',
        categorySlug: "grooming-essentials"
      },
      {
        name: "Lavender Braiding Bar",
        slug: "lavender-braiding-bar", 
        description: "Premium braiding wax infused with calming lavender essential oil. Perfect for creating neat, long-lasting braids.",
        price: "37.99",
        sku: "LBB-001",
        stockQuantity: 18,
        weight: "3.50",
        dimensions: "3.5x2x1.5 inches",
        ingredients: "Beeswax, Lanolin, Lavender Essential Oil, Coconut Oil, Shea Butter",
        usage: "Warm slightly in hands before application. Work through mane sections before braiding for best hold.",
        status: 'active',
        categorySlug: "show-prep"
      },
      {
        name: "Tick Repellent Bar",
        slug: "tick-repellent-bar",
        description: "Powerful natural tick repellent bar made with cedarwood and eucalyptus oils.",
        price: "37.99",
        sku: "TRB-001", 
        stockQuantity: 0,
        weight: "4.50",
        dimensions: "4x2.5x1 inches",
        ingredients: "Beeswax, Cedarwood Oil, Eucalyptus Oil, Neem Oil, Coconut Oil",
        usage: "Apply liberally to legs, belly, and other exposed areas.",
        status: 'coming_soon',
        categorySlug: "grooming-essentials"
      }
    ];

    for (const product of products) {
      const categoryId = categoryMap[product.categorySlug];
      
      await sql`
        INSERT INTO products (
          name, slug, description, price, sku, stock_quantity, 
          weight, dimensions, ingredients, usage, status, category_id
        ) VALUES (
          ${product.name}, ${product.slug}, ${product.description}, ${product.price}, 
          ${product.sku}, ${product.stockQuantity}, ${product.weight}, ${product.dimensions}, 
          ${product.ingredients}, ${product.usage}, ${product.status}, ${categoryId}
        )
      `;
      console.log(`✓ Inserted product: ${product.name}`);
    }

    // Insert product images
    console.log('🖼️ Seeding product images...');
    const productResults = await sql`SELECT id, slug, name FROM products ORDER BY id`;
    
    for (const product of productResults) {
      await sql`
        INSERT INTO product_images (product_id, url, alt_text, sort_order)
        VALUES (${product.id}, ${`/images/products/${product.slug}.jpg`}, ${`${product.name} - Equine Wax Product`}, 0)
      `;
      console.log(`✓ Inserted image for: ${product.name}`);
    }

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

if (require.main === module) {
  seedWithRawSQL()
    .then(() => {
      console.log('Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}