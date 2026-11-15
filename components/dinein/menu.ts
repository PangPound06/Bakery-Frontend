import type { ApiProduct, ProductOption } from "@/types/product";
import type { CartItem } from "@/types/cart";
import { FRESH_MAX_PER_PRODUCT, FRESH_STOCK, isPoundOption } from "@/components/cart/cartUtils";

/**
 * เมนูหน้าทานในร้าน — แปลงสินค้าเป็นตัวเลือกที่กดเพิ่มลงรอบได้
 *
 * รูปแบบที่ส่งเข้าตะกร้าต้องเหมือนหน้า ProductDetail ทุกตัวอักษร เพราะ backend (PricingService)
 * อ่านขนาดเค้กและชื่อตัวเลือกจากข้อความ selectedOption เพื่อคิดราคาเอง:
 *   เค้ก   → "แบบชิ้น" / "1 ปอนด์ (8 ชิ้น)" / "2 ปอนด์ (16 ชิ้น)" [+ " - <ชื่อตัวเลือก>"]
 *            quantity = จำนวนชิ้นที่ตัด stock (1 / 8 / 16)
 *   อื่น ๆ → ชื่อตัวเลือก หรือ null, quantity = 1
 */

export interface MenuProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  stock: number;
  isAvailable: boolean;
  options: ProductOption[];
}

export const toMenuProduct = (p: ApiProduct): MenuProduct => ({
  id: p.id,
  name: p.name,
  category: p.category,
  price: p.price,
  image: p.image,
  stock: p.stockQuantity,
  isAvailable: p.isAvailable,
  options: parseOptions(p.options),
});

function parseOptions(raw?: string | null): ProductOption[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((o): o is ProductOption => typeof o?.name === "string" && o.name.trim() !== "")
      : [];
  } catch {
    return [];
  }
}

const isCake = (p: MenuProduct) => p.category === "cake";
export const isFresh = (p: MenuProduct) => p.stock === FRESH_STOCK;

const CAKE_SIZES = [
  { id: "slice", label: "แบบชิ้น", desc: "1 ชิ้น", pieces: 1 },
  { id: "1lb", label: "1 ปอนด์ (8 ชิ้น)", desc: "8 ชิ้น", pieces: 8 },
  { id: "2lb", label: "2 ปอนด์ (16 ชิ้น)", desc: "16 ชิ้น", pieces: 16 },
] as const;

/** 1 ตัวเลือกที่กดเพิ่มลงรอบได้ */
export interface MenuChoice {
  id: string;
  title: string;
  description?: string;
  /** ราคาต่อ 1 หน่วยที่สั่ง (เค้ก 1 ปอนด์ = ราคาทั้งก้อน) */
  unitPrice: number;
  /** ค่า selectedOption ที่ส่งเข้าตะกร้า */
  optionLabel: string | null;
  /** จำนวนชิ้นที่ตัด stock ต่อการเพิ่ม 1 ครั้ง */
  pieces: number;
}

/**
 * ตัวเลือกของสินค้า
 *  - เค้ก: เลือกขนาด (ตัวเลือกรสชาติใช้เฉพาะเมื่อมีอันเดียว — เหมือนหน้า ProductDetail)
 *  - สินค้าที่มีตัวเลือก: ต้องเลือกหนึ่งอย่าง
 *  - ไม่มีตัวเลือก: ตัวเลือกเดียว
 */
export function choicesFor(p: MenuProduct): MenuChoice[] {
  const single = p.options.length === 1 ? p.options[0] : null;
  if (isCake(p)) {
    const base = p.price + (single?.extraPrice ?? 0);
    return CAKE_SIZES.map((size) => ({
      id: size.id,
      title: size.label,
      description: size.desc,
      unitPrice: base * size.pieces,
      optionLabel: single ? `${size.label} - ${single.name}` : size.label,
      pieces: size.pieces,
    }));
  }
  if (p.options.length > 0) {
    return p.options.map((o) => ({
      id: o.name,
      title: o.name,
      unitPrice: p.price + (o.extraPrice ?? 0),
      optionLabel: o.name,
      pieces: 1,
    }));
  }
  return [{ id: "default", title: p.name, unitPrice: p.price, optionLabel: null, pieces: 1 }];
}

/** ต้องเปิดหน้าต่างเลือกก่อนเพิ่มไหม */
export const needsChoice = (p: MenuProduct) => choicesFor(p).length > 1;

/** จำนวนชิ้นต่อ 1 หน่วยของแถวในตะกร้า ("1 ปอนด์ (8 ชิ้น)" → 8) */
export const piecesOf = (option?: string | null) =>
  option?.startsWith("2 ปอนด์") ? 16 : option?.startsWith("1 ปอนด์") ? 8 : 1;

/** ในรอบนี้มีสินค้านี้กี่หน่วย (ทุกตัวเลือกรวมกัน) */
export const unitsInRound = (productId: number, items: CartItem[]) =>
  items.filter((i) => i.productId === productId).reduce((sum, i) => sum + i.quantity, 0);

/** ในรอบนี้ใช้ stock สินค้านี้ไปกี่ชิ้น */
const piecesInRound = (productId: number, items: CartItem[]) =>
  items
    .filter((i) => i.productId === productId)
    .reduce((sum, i) => sum + i.quantity * piecesOf(i.selectedOption), 0);

/** ตัวเลือกนี้ยังเพิ่มได้อีกไหม (stock ที่เหลือหลังหักของในรอบนี้) */
export const choiceFits = (p: MenuProduct, choice: MenuChoice, items: CartItem[]) =>
  isFresh(p) || p.stock - piecesInRound(p.id, items) >= choice.pieces;

export interface Availability {
  /** กดเพิ่มไม่ได้ */
  blocked: boolean;
  /** ข้อความใต้ชื่อเมนู */
  note: string;
  /** note เป็นคำเตือน (สีแดง) */
  warn: boolean;
  soldOut: boolean;
}

/** กดเพิ่มสินค้านี้ได้ไหม และบอกลูกค้าว่าเพราะอะไร */
export function availabilityOf(p: MenuProduct, items: CartItem[], orderingClosed: boolean): Availability {
  const soldOut = !p.isAvailable || (!isFresh(p) && p.stock <= 0);
  if (soldOut) return { blocked: true, note: "หมดชั่วคราว", warn: true, soldOut };

  if (isFresh(p)) {
    const atMax = unitsInRound(p.id, items) >= FRESH_MAX_PER_PRODUCT;
    if (atMax) return { blocked: true, note: `สั่งได้สูงสุด ${FRESH_MAX_PER_PRODUCT} ต่อรอบ`, warn: true, soldOut };
    return { blocked: orderingClosed, note: `ทำสด · สูงสุด ${FRESH_MAX_PER_PRODUCT} ต่อรอบ`, warn: false, soldOut };
  }

  const anyFits = choicesFor(p).some((c) => choiceFits(p, c, items));
  if (!anyFits) return { blocked: true, note: "ครบจำนวนที่มีแล้ว", warn: true, soldOut };
  return { blocked: orderingClosed, note: needsChoice(p) ? "มีให้เลือก" : "", warn: false, soldOut };
}

/** ปุ่ม + ของแถวในรอบนี้กดได้ไหม — เค้กปอนด์เพิ่มได้จากหน้าต่างเลือกขนาดเท่านั้น */
export function rowCanIncrease(item: CartItem, items: CartItem[]) {
  if (isPoundOption(item.selectedOption)) return false;
  if (item.stock === FRESH_STOCK) return unitsInRound(item.productId, items) < FRESH_MAX_PER_PRODUCT;
  return piecesInRound(item.productId, items) < item.stock;
}
