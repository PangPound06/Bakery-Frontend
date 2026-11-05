/** ชนิดข้อมูลของหน้าจัดการคำสั่งซื้อ (admin/order) */

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  /** ราคาต่อ 1 ออเดอร์ (ไม่ใช่ต่อชิ้น) */
  price: number;
  /** จำนวน "ชิ้น" ที่สั่ง (เค้ก 1 ปอนด์ = 8) */
  quantity: number;
  selectedOption?: string | null;
  /** จำนวน "ชิ้น" ที่ถูกยกเลิกและคืนเงินไปแล้ว */
  cancelledQty?: number | null;
}

export interface Order {
  id: number;
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
  ordCode: string;
  /** ยอดที่คืนเงินไปแล้ว — มีเฉพาะตอนดึงรายละเอียด */
  refundedAmount?: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  /** JSON ของ ProductOption[] */
  options?: string | null;
  stockQuantity: number;
  isAvailable: boolean;
}

export interface ProductOption {
  name: string;
  extraPrice: number;
}

/** ปุ่มดำเนินการกับ order ในตาราง/โมดัล */
export type OrderAction = { label: string; color: string } & (
  | { kind: "status"; orderStatus: string; paymentStatus?: string }
  | { kind: "cancel" }
  | { kind: "confirm-transfer" }
  | { kind: "reject-transfer" }
);

export type DateRangeKey = "today" | "7d" | "30d" | "month" | "year" | "all" | "custom";

export type ChannelKey =
  | "all"
  | "online"
  | "pos"
  | "dine-in"
  | "dine-in-alacarte"
  | "dine-in-buffet";

export interface Badge {
  text: string;
  className: string;
  icon?: string;
}
