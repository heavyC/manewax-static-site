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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 2,
        name: "Tick Repellent Bar (mock)",
        slug: "tick-repellent-bar",
        description: "Hand-crafted tick repellent bar.",
        price: 37.99,
        shipping: 6.99,
        category_id: 1,
        sku: "MW-003",
        stock_quantity: 0,
        low_stock_threshold: 2,
        status: 'coming_soon',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
];


