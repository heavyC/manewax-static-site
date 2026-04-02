import { Product } from '@/lib/types/product';

export const mockCategories = [
    {
        id: 1,
        name: "Mane Care",
        slug: "mane-care",
        description: "Premium wax products for mane health and protection"
    },
    {
        id: 2,
        name: "Coat Care",
        slug: "coat-care",
        description: "Nourishing wax treatments for coat shine and health"
    },
    {
        id: 3,
        name: "Show Prep",
        slug: "show-prep",
        description: "Professional grooming wax for competition ready horses"
    }
];

export const mockProducts: Product[] = [
    {
        id: 1,
        name: "Itch Prevention and Repellent Bar",
        slug: "mane-itch-prevention-and-repellent-bar",
        description: "Hand-crafted conditioning wax that soothes itches and repels insects.",
        price: 34.99,
        shipping: 6.99,
        category_id: 1,
        sku: "MW-001",
        stock_quantity: 4,
        low_stock_threshold: 2,
        status: 'active',
        // main_image: "/images/products/itch-prevention-bar.jpg",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 2,
        name: "Lavender Braiding Bar",
        slug: "lavender-braiding-bar",
        description: "Hand-crafted braiding wax with soothing lavendar scent.",
        price: 37.99,
        shipping: 6.99,
        category_id: 1,
        sku: "MW-001",
        stock_quantity: 4,
        low_stock_threshold: 2,
        status: 'active',
        // main_image: "/images/products/braiding-bar.jpg",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 2,
        name: "Tick Repellent Bar",
        slug: "tick-repellent-bar",
        description: "Hand-crafted tick repellent bar.",
        price: 37.99,
        shipping: 6.99,
        category_id: 1,
        sku: "MW-003",
        stock_quantity: 0,
        low_stock_threshold: 2,
        status: 'coming_soon',
        // main_image: "/images/products/tick-bar.jpg",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
];


// const mockFeaturedProducts: Product[] = [
//   {
//     id: 1,
//     name: "Itch Prevention and Repellent Bar",
//     slug: "itch-prevention-repellent-bar", 
//     description: "To help with the symptoms of Sweet Itch. Specifically designed to repel stable flies, Culicoides and mosquitoes. Contains lemon eucalyptus and neem. Contains vitamin E to help with regrowth.",
//     price: 34.99,
//     sku: "IPR-001",
//     stock_quantity: 25,
//     low_stock_threshold: 10,
//     is_active: true,
//     is_featured: true,
//     category_id: 3,
//     created_at: new Date().toISOString(),
//     updated_at: new Date().toISOString(),
//   },
//   {
//     id: 2,
//     name: "Lavender Braiding Wax",
//     slug: "lavender-braiding-bar",
//     description: "Infused with lavender and vitamin E. Lavender promotes relaxation and calming of the nervous system (for horse and rider) and vitamin E to promote hair health and growth.",
//     price: "37.99", 
//     sku: "LBB-001",
//     stock_quantity: 18,
//     low_stock_threshold: 10,
//     is_active: true,
//     is_featured: true,
//     category_id: 4,
//     created_at: new Date().toISOString(),
//     updated_at: new Date().toISOString(),
//   }
// ];
