import { authHeaders } from "@/lib/auth";
import type { Fulfillment } from "@/lib/receive";

/**
 * ข้อมูลหน้า checkout ออนไลน์ — ทุกตัวเลขมาจาก server (หน้าเว็บไม่คิดราคาเอง)
 */

const API = process.env.NEXT_PUBLIC_API_URL;

export interface SummaryItem {
  productId: number;
  productName: string;
  image: string | null;
  selectedOption: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface CheckoutSummary {
  items: SummaryItem[];
  subtotal: number;
  /** มารับที่ร้าน = 0 */
  shipping: number;
  total: number;
}

/** ช่วงเวลารับสินค้า (ReceiveSlotService) — value ส่งกลับไปเป็น receiveAt */
export interface ReceiveSlot {
  value: string;
  day: "today" | "tomorrow";
  /** "10:30" */
  time: string;
}

export interface PickupBranch {
  id: number;
  name: string;
  address?: string | null;
  hours?: string | null;
}

export interface ReceiveOptions {
  asapAvailable: boolean;
  slots: ReceiveSlot[];
  branches: PickupBranch[];
}

/** ค่า receiveAt ของ "เร็วที่สุด" */
export const ASAP = "asap";

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
  }
}

/** ผลการโหลดยอด — cartEmpty = ตะกร้าว่าง (ควรกลับไปหน้าตะกร้า) */
export type SummaryResult = { ok: true; summary: CheckoutSummary } | { ok: false; message: string; cartEmpty: boolean };

export async function fetchSummary(fulfillment: Fulfillment): Promise<SummaryResult> {
  const res = await fetch(`${API}/api/checkout/summary?fulfillment=${fulfillment}`, { headers: authHeaders() });
  if (res.status === 401) throw new UnauthorizedError();
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.success) return { ok: true, summary: data.summary as CheckoutSummary };
  const message: string = data.error || "ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้";
  return { ok: false, message, cartEmpty: message.includes("ว่าง") };
}

export async function fetchReceiveOptions(): Promise<ReceiveOptions> {
  const res = await fetch(`${API}/api/checkout/receive-options`);
  if (!res.ok) throw new Error(`receive-options ${res.status}`);
  const data = await res.json();
  return {
    asapAvailable: data.asapAvailable === true,
    slots: Array.isArray(data.slots) ? data.slots : [],
    branches: Array.isArray(data.branches) ? data.branches : [],
  };
}

// ─── เบอร์โทร (ต้องตรงกับ ReceiveDetailsService: ตัวเลข 9–10 หลัก ขึ้นต้นด้วย 0) ───

export interface PhoneCheck {
  valid: boolean;
  tone: "neutral" | "error" | "ok";
  help: string;
}

/**
 * @param digits ตัวเลขที่กรอก (ตัดอักขระอื่นออกแล้ว)
 * @param typedOther ลูกค้าพิมพ์อักขระที่ไม่ใช่ตัวเลขมาด้วย
 */
export function checkPhone(digits: string, typedOther: boolean): PhoneCheck {
  if (typedOther) return { valid: false, tone: "error", help: "ช่องนี้รับเฉพาะตัวเลข" };
  if (digits.length === 0) return { valid: false, tone: "neutral", help: "ตัวเลข 10 หลัก (เบอร์บ้าน 9 หลัก)" };
  if (digits[0] !== "0") return { valid: false, tone: "error", help: "ต้องขึ้นต้นด้วย 0" };
  if (digits.length < 9) return { valid: false, tone: "neutral", help: `อีก ${10 - digits.length} หลัก` };
  return { valid: true, tone: "ok", help: "เบอร์ถูกต้อง" };
}

/** "0812345678" → "081-234-5678", "021234567" → "02-123-4567" */
export const formatPhone = (d: string) =>
  d.length === 9 && d.startsWith("02")
    ? `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
    : d.slice(0, 3) + (d.length > 3 ? `-${d.slice(3, 6)}` : "") + (d.length > 6 ? `-${d.slice(6)}` : "");
