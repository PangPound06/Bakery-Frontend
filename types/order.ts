export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  selectedOption?: string | null;
}

export interface Order {
  id: number;
  ordCode: string;
  email: string;
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  orderType?: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  note: string;
  slipImage: string;
  createdAt: string;
  items?: OrderItem[];
}