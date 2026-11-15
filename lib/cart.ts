import { getOrderMode } from "@/lib/auth";

/**
 * ตะกร้าแยกสองใบตามโหมดที่ลูกค้าเลือก — ออนไลน์ / ทานในร้าน
 *
 * ค่าต้องตรงกับ backend: CartMode.java (tb_cart.cart_mode)
 */
export type CartMode = "online" | "dinein";

export const currentCartMode = (): CartMode => (getOrderMode() === "dinein" ? "dinein" : "online");

/**
 * URL ของ /api/cart ของตะกร้าใบหนึ่ง
 *
 * @param path ต่อท้าย /api/cart เช่น "/add", "/clear" หรือ "" (ดูตะกร้า)
 * @param mode ตะกร้าใบไหน — ไม่ระบุ = ตามโหมดที่ลูกค้าเลือกอยู่
 */
export const cartUrl = (path = "", mode: CartMode = currentCartMode()) =>
  `${process.env.NEXT_PUBLIC_API_URL}/api/cart${path}?mode=${mode}`;

/** หน้าตะกร้าของแต่ละโหมด — ทานในร้านเลือกเมนูและดูรอบที่กำลังสั่งในหน้าเดียวกัน */
export const CART_PAGE: Record<CartMode, string> = {
  online: "/cart",
  dinein: "/dine-in",
};
