export type ProductStatus = 'active' | 'coming_soon' | 'inactive';

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  shipping: number;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
  status: ProductStatus;
  category_id: number;
  weight?: string;
  dimensions?: string;
  ingredients?: string;
  usage?: string;
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_slug?: string;
  image_alt?: string;
  images?: ProductImage[];
}

export interface ProductImage {
  id: number;
  url: string;
  alt_text: string;
  sort_order: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent_id?: number;
  created_at: string;
  updated_at: string;
}