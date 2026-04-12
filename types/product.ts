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

export interface ProductOption {
  name: string;
  extraPrice: number;
  stockMultiplier?: number; // 1=ชิ้น, 8=1ปอนด์, 16=2ปอนด์
}

export interface ProductCardProps extends Product {
  onAddToCart?: (product: Product) => void;
  onStockUpdate?: () => void;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
}