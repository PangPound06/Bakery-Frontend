import { getOrderMode } from "@/lib/auth";

/**
 * ตะกร้าแยกสองใบตามโหมดที่ลูกค้าเลือก — ออนไลน์ / ทานในร้าน
 *
 * ค่าต้องตรงกับ backend: CartMode.java (tb_cart.cart_mode)
 */
export type CartMode = "online" | "dinein";

export const currentCartMode = (): CartMode => (getOrderMode() === "dinein" ? "dinein" : "online");

/**
 * URL ของ /api/cart ที่ผูกกับตะกร้าของโหมดปัจจุบัน
 *
 * @param path ต่อท้าย /api/cart เช่น "/add", "/clear" หรือ "" (ดูตะกร้า)
 */
export const cartUrl = (path = "") =>
  `${process.env.NEXT_PUBLIC_API_URL}/api/cart${path}?mode=${currentCartMode()}`;
