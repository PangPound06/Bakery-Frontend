import { authHeaders } from "@/lib/auth";

/**
 * มื้อทานในร้านของลูกค้า — ค่าที่หน้าเลือกโหมดเก็บไว้ในเครื่อง และ API ที่หน้าทานในร้านใช้ร่วมกัน
 *
 * ค่าในเครื่องเป็นแค่ "สิ่งที่ลูกค้าเลือก" — ราคา เวลาบุฟเฟต์ และประเภทการทานจริง backend ตัดสินเอง
 * (DineInBillService) หน้าเว็บไม่ส่งตัวเลขราคาไปเลย
 */

// ─── ค่าตายตัวของร้าน (ต้องตรงกับ DineInBillService.java) ───

export const BUFFET_PRICE_PER_PERSON = 1599;
export const MAX_BUFFET_PAX = 8;
export const BUFFET_MINUTES = 100;
export const TABLE_COUNT = 30;
/** หมายเหตุถึงครัวยาวได้ไม่เกิน (DineInBillService.MAX_NOTE_LENGTH) */
export const MAX_NOTE_LENGTH = 200;

/** จำนวนที่นั่งของโต๊ะ: 1–5 = 2 คน, 6–25 = 4 คน, 26–30 = 8 คน */
export const tableCapacity = (table: number) => (table <= 5 ? 2 : table <= 25 ? 4 : 8);

/** กลุ่มโต๊ะสำหรับหน้าเลือกโต๊ะ */
export const TABLE_GROUPS: { seats: number; tables: number[] }[] = [
  { seats: 2, tables: range(1, 5) },
  { seats: 4, tables: range(6, 25) },
  { seats: 8, tables: range(26, 30) },
];

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

// ─── ค่าที่เก็บในเครื่อง ───

export type DineType = "alacarte" | "buffet";

export const DINE_KEYS = {
  mode: "orderMode",
  table: "tableNo",
  type: "dineType",
  pax: "buffetPax",
} as const;

/** ค่าเก่าจากหน้าเวอร์ชันก่อน — ลบทิ้งทุกครั้งที่เริ่ม/จบมื้อ */
const LEGACY_KEYS = ["buffetPrice"];

/** หน้าเลือกโหมดยิง event นี้ทุกครั้งที่ค่าเปลี่ยน (useOrderMode / DineInBar ฟังอยู่) */
export const ORDER_MODE_CHANGED = "orderModeChanged";

export interface DineSelection {
  tableNo: string;
  dineType: DineType;
  /** จำนวนคน (บุฟเฟต์) — à la carte = 1 */
  pax: number;
}

export const parseDineType = (raw: string | null | undefined): DineType => (raw === "buffet" ? "buffet" : "alacarte");

/** จำนวนคนจากค่าในเครื่อง — ค่าเพี้ยน/เกินช่วง ถือเป็น 1 */
export const parsePax = (raw: string | null | undefined): number => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= MAX_BUFFET_PAX ? n : 1;
};

/** เริ่มมื้อทานในร้าน (หรือกลับเข้าโต๊ะเดิม) */
export function saveDineSelection({ tableNo, dineType, pax }: DineSelection) {
  localStorage.setItem(DINE_KEYS.mode, "dinein");
  localStorage.setItem(DINE_KEYS.table, tableNo);
  localStorage.setItem(DINE_KEYS.type, dineType);
  if (dineType === "buffet") localStorage.setItem(DINE_KEYS.pax, String(pax));
  else localStorage.removeItem(DINE_KEYS.pax);
  LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  window.dispatchEvent(new Event(ORDER_MODE_CHANGED));
}

/** เปลี่ยนเป็นสั่งออนไลน์ */
export function switchToOnline() {
  localStorage.setItem(DINE_KEYS.mode, "online");
  [DINE_KEYS.table, DINE_KEYS.type, DINE_KEYS.pax, ...LEGACY_KEYS].forEach((k) => localStorage.removeItem(k));
  window.dispatchEvent(new Event(ORDER_MODE_CHANGED));
}

/** จ่ายบิลแล้ว — จบมื้อ กลับเป็นโหมดออนไลน์ */
export const endDineSession = switchToOnline;

// ─── API ───

const API = process.env.NEXT_PUBLIC_API_URL;

/** สถานะของรอบที่ส่งเข้าครัว (tb_dinein_orders.order_status) */
export type RoundStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";

export interface RoundItem {
  id: number;
  productId: number;
  productName: string;
  /** จำนวนที่สั่ง (เค้กปอนด์นับเป็นก้อน) */
  quantity: number;
  /** ราคาต่อหน่วยที่ server คิดตอนส่งรอบ */
  price: number;
  selectedOption?: string | null;
  image?: string | null;
}

/** 1 รอบที่ส่งเข้าครัวแล้ว (GET /api/dinein/my-orders) */
export interface Round {
  id: number;
  ordCode?: string;
  orderStatus: RoundStatus | string;
  tableNo?: string;
  note?: string | null;
  dineType?: string | null;
  total: number;
  createdAt: string;
  items: RoundItem[];
}

/** ยังไม่ได้ login / token หมดอายุ */
export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
  }
}

/** รอบที่ยังไม่จ่ายของโต๊ะนี้ เรียงจากรอบแรก → ล่าสุด */
export async function fetchRounds(tableNo: string): Promise<Round[]> {
  const res = await fetch(`${API}/api/dinein/my-orders?tableNo=${encodeURIComponent(tableNo)}`, {
    headers: authHeaders(),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`my-orders ${res.status}`);
  const data: unknown = await res.json();
  const list = Array.isArray(data) ? (data as Round[]) : [];
  return list
    .filter((r) => r.orderStatus !== "cancelled")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/** ผลการส่งรอบเข้าครัว */
export type SendResult = { ok: true; ordCode: string } | { ok: false; message: string };

/** ส่งตะกร้าทานในร้านเข้าครัวเป็น 1 รอบ — รายการและราคา backend อ่านจากตะกร้าเอง */
export async function sendRound(tableNo: string, dineType: DineType, note: string): Promise<SendResult> {
  const res = await fetch(`${API}/api/dinein/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ tableNo, dineType, note: note.trim() || null }),
  });
  if (res.status === 401) throw new UnauthorizedError();
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) return { ok: false, message: data.message || "ส่งรายการไม่สำเร็จ กรุณาลองใหม่" };
  return { ok: true, ordCode: typeof data.ordCode === "string" ? data.ordCode : "" };
}

// ─── การแสดงผล ───

export interface RoundStatusView {
  label: string;
  tone: "success" | "warning" | "info" | "danger" | "neutral";
  /** ยังเปลี่ยนสถานะได้อีก — แสดงจุดกะพริบ */
  live: boolean;
}

const ROUND_STATUS: Record<string, RoundStatusView> = {
  pending: { label: "รอครัวรับ", tone: "info", live: true },
  preparing: { label: "กำลังทำ", tone: "warning", live: true },
  ready: { label: "พร้อมเสิร์ฟ", tone: "warning", live: true },
  completed: { label: "เสร็จแล้ว", tone: "success", live: false },
};

export const roundStatusView = (status: string): RoundStatusView =>
  ROUND_STATUS[status] ?? { label: status, tone: "neutral", live: false };

export const isRoundDone = (r: Round) => r.orderStatus === "completed";

/** 1234.5 → "1,234.50 ฿" */
export const formatBaht = (amount: number) =>
  `${amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`;

/** เวลาไทยจากค่า LocalDateTime ของ backend (ไม่มี timezone) */
export const formatClock = (iso: string) => {
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
  const date = new Date(hasZone ? iso : `${iso}+07:00`);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
};
