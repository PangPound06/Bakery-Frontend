import type { CartItem } from "@/types/cart";

/** stock 9999 = สินค้าทำสด ไม่นับ stock */
export const FRESH_STOCK = 9999;
/** สินค้าทำสดสั่งรวมได้ไม่เกินเท่านี้ต่อสินค้า (backend กันไว้ด้วย) */
export const FRESH_MAX_PER_PRODUCT = 10;

export const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** เค้กปอนด์เปลี่ยนจำนวนในตะกร้าไม่ได้ — ต้องกลับไปเลือกขนาดใหม่ที่หน้าสินค้า */
export const isPoundOption = (option?: string | null) => option?.includes("ปอนด์") ?? false;

/** ปุ่ม + กดได้ไหม — ไม่เกิน stock และสินค้าทำสดไม่เกิน 10 ต่อสินค้า (รวมทุกตัวเลือก) */
export const canIncrease = (item: CartItem, all: CartItem[]) => {
  if (isPoundOption(item.selectedOption)) return false;
  if (item.stock !== FRESH_STOCK) return item.quantity < item.stock;
  const sameProduct = all.filter((i) => i.productId === item.productId).reduce((sum, i) => sum + i.quantity, 0);
  return sameProduct < FRESH_MAX_PER_PRODUCT;
};

/** ค่าจัดส่งที่แสดงในหน้าตะกร้า (ยอดจริงคิดที่ backend: PricingService.shippingFor) */
export const shippingFeeFor = (subtotal: number) => {
  if (subtotal < 100) return 50;
  if (subtotal <= 500) return 20;
  return 0;
};
