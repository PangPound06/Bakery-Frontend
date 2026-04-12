import type { ProductOption } from "@/types/product";

// แปลงราคาเป็นรูปแบบไทย เช่น 1,234.00
export const formatPrice = (price: number): string =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// แปลง JSON string ของ options เป็น array
export const parseOptions = (optionsStr?: string | null): ProductOption[] => {
  if (!optionsStr) return [];
  try {
    return JSON.parse(optionsStr);
  } catch {
    return [];
  }
};

// ค่าคงที่สำหรับสินค้าประเภท Fresh
export const FRESH_STOCK_VALUE = 9999;
export const FRESH_MAX_QTY = 10;

export const isFresh = (stockQuantity: number): boolean =>
  stockQuantity === FRESH_STOCK_VALUE;

export const getMaxQty = (stockQuantity: number): number =>
  isFresh(stockQuantity) ? FRESH_MAX_QTY : stockQuantity;

// คำนวณค่าจัดส่ง
export const getShippingFee = (total: number): number => {
  if (total < 100) return 50;
  if (total <= 500) return 20;
  return 0;
};
