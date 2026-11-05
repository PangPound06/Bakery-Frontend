export interface Product {
  id: number;
  name: string;
  type: string;
  category: string;
  price: number;
  img: string;
  image?: string; // บาง API return เป็น image แทน img
  description?: string;
  stockQuantity?: number;
  isAvailable?: boolean;
  options?: string | null; // JSON string ของ ProductOption[]
}

/** รูปแบบสินค้าที่ backend ส่งมาจาก /api/products (ProductEntity) */
export interface ApiProduct {
  id: number;
  name: string;
  type: string;
  category: string;
  price: number;
  image: string;
  description: string;
  stockQuantity: number;
  isAvailable: boolean;
  options?: string | null;
}

export interface ProductOption {
  name: string;
  extraPrice: number;
  stockMultiplier?: number; // 1=ชิ้น, 8=1ปอนด์, 16=2ปอนด์
}

export type ProductCardProps = Product;

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
}