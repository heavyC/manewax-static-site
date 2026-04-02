// lib/db/seed.ts
import 'dotenv/config';
import { db } from './index';
import { categories, products, productImages } from './schema';

const equineCategories = [
  {
    name: "Hoof Care",
    slug: "hoof-care",
    description: "Premium wax products for hoof health and protection"
  },
  {
    name: "Coat Care",
    slug: "coat-care", 
    description: "Nourishing wax treatments for coat shine and health"
  },
  {
    name: "Grooming Essentials",
    slug: "grooming-essentials",
    description: "Essential wax products for daily horse grooming"
  },
  {
    name: "Show Prep",
    slug: "show-prep",
    description: "Professional grooming wax for competition ready horses"
  }
];

const equineProducts = [
  {
    name: "Itch Prevention and Repellent Bar",
    slug: "itch-prevention-repellent-bar",
    description: "Our Itch Prevention and Repellent Bar is specially formulated to provide long-lasting protection against insects while soothing irritated skin. Made with natural ingredients including citronella and tea tree oil.",
    price: "34.99",
    sku: "IPR-001",
    stockQuantity: 25,
    weight: "4.00",
    dimensions: "4x2x1 inches",
    ingredients: "Beeswax, Coconut Oil, Citronella Essential Oil, Tea Tree Oil, Vitamin E",
    usage: "Apply directly to affected areas or as a preventive measure. Safe for daily use.",
    status: 'active' as const,
    isFeatured: true,
    categoryId: 3, // Grooming Essentials
  },
  {
    name: "Lavender Braiding Bar",
    slug: "lavender-braiding-bar",
    description: "Premium braiding wax infused with calming lavender essential oil. Perfect for creating neat, long-lasting braids while providing a soothing aromatherapy experience for your horse.",
    price: "37.99",
    sku: "LBB-001",
    stockQuantity: 18,
    weight: "3.50",
    dimensions: "3.5x2x1.5 inches",
    ingredients: "Beeswax, Lanolin, Lavender Essential Oil, Coconut Oil, Shea Butter",
    usage: "Warm slightly in hands before application. Work through mane sections before braiding for best hold.",
    status: 'active' as const,
    isFeatured: true,
    categoryId: 4, // Show Prep
  },
  {
    name: "Tick Repellent Bar",
    slug: "tick-repellent-bar",
    description: "Powerful natural tick repellent bar made with cedarwood and eucalyptus oils. Creates a protective barrier against ticks and other harmful pests without harsh chemicals.",
    price: "37.99",
    sku: "TRB-001",
    stockQuantity: 0, // Out of stock
    weight: "4.50",
    dimensions: "4x2.5x1 inches", 
    ingredients: "Beeswax, Cedarwood Oil, Eucalyptus Oil, Neem Oil, Coconut Oil",
    usage: "Apply liberally to legs, belly, and other exposed areas. Reapply after heavy sweating or rain.",
    status: 'coming_soon' as const,
    isFeatured: false,
    categoryId: 3, // Grooming Essentials
  }
];

export async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...');

    // Insert categories one by one
    console.log('📁 Seeding categories...');
    const insertedCategoryIds: number[] = [];
    for (const category of equineCategories) {
      const insertedCategoryResult = await db.insert(categories).values(category).returning() as Array<{ id: number; name: string }>;
      const insertedCategory = insertedCategoryResult[0];
      insertedCategoryIds.push(insertedCategory.id);
      console.log(`✓ Inserted category: ${insertedCategory.name}`);
    }
    console.log(`✓ Inserted ${insertedCategoryIds.length} categories`);

    // Update products with correct category IDs
    const updatedProducts = equineProducts.map((product) => ({
      ...product,
      categoryId: insertedCategoryIds[product.categoryId - 1] || null
    }));

    // Insert products one by one
    console.log('🛍️ Seeding products...');
    const insertedProducts: Array<{ id: number; name: string; slug: string }> = [];
    for (const product of updatedProducts) {
      const insertedProductResult = await db.insert(products).values(product).returning() as Array<{ id: number; name: string; slug: string }>;
      const insertedProduct = insertedProductResult[0];
      insertedProducts.push(insertedProduct);
      console.log(`✓ Inserted product: ${insertedProduct.name}`);
    }
    console.log(`✓ Inserted ${insertedProducts.length} products`);

    // Insert product images one by one
    console.log('🖼️ Seeding product images...');
    for (const product of insertedProducts) {
      const productImage = {
        productId: product.id,
        url: `/images/products/${product.slug}.jpg`,
        altText: `${product.name} - Equine Wax Product`,
        sortOrder: 0,
      };
      
      await db.insert(productImages).values(productImage);
      console.log(`✓ Inserted image for: ${product.name}`);
    }

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Only run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}