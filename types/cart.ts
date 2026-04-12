export interface CartItem {
  id: number;
  productId: number;
  email: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
  category: string;
  image: string;
  stock: number;
  selectedOption?: string | null;
}

export interface CartResponse {
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
}
