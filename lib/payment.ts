/**
 * ค่าและป้ายกำกับของการชำระเงิน — ใช้ร่วมกันทุกหน้า (ลูกค้า / แอดมิน)
 *
 * ค่าต้องตรงกับ backend: PaymentMethods.java และ PaymentStateService.java
 */

export const PAYMENT_STATUS = {
  AWAITING: "awaiting_payment",
  /** ลูกค้าแจ้งโอนพร้อมเพย์แล้ว รอแอดมินตรวจยอด */
  VERIFYING: "awaiting_verification",
  PAID: "paid",
  FAILED: "failed",
  EXPIRED: "expired",
} as const;

export const PAYMENT_METHOD = {
  STRIPE_PROMPTPAY: "qr_promptpay",
  CARD: "card",
  CASH: "cash",
  /** โอนเข้าพร้อมเพย์ของร้านตรง แอดมินยืนยันเอง */
  PROMPTPAY_TRANSFER: "promptpay_transfer",
} as const;

export interface Badge {
  text: string;
  /** class ของ Tailwind สำหรับพื้นหลัง + สีตัวอักษร */
  className: string;
}

const STATUS_BADGES: Record<string, Badge> = {
  [PAYMENT_STATUS.PAID]: { text: "ชำระแล้ว", className: "bg-green-100 text-green-700" },
  [PAYMENT_STATUS.AWAITING]: { text: "รอชำระเงิน", className: "bg-amber-100 text-amber-700" },
  [PAYMENT_STATUS.VERIFYING]: { text: "รอตรวจสอบยอดโอน", className: "bg-orange-100 text-orange-700" },
  [PAYMENT_STATUS.FAILED]: { text: "ไม่สำเร็จ", className: "bg-red-100 text-red-700" },
  [PAYMENT_STATUS.EXPIRED]: { text: "หมดเวลา", className: "bg-gray-100 text-gray-600" },
  // order สมัยอัปสลิป (ก่อนใช้ Stripe)
  pending: { text: "รอตรวจสอบ", className: "bg-yellow-100 text-yellow-700" },
};

const METHOD_LABELS: Record<string, string> = {
  [PAYMENT_METHOD.STRIPE_PROMPTPAY]: "📱 QR PromptPay",
  [PAYMENT_METHOD.PROMPTPAY_TRANSFER]: "🏦 โอนพร้อมเพย์",
  [PAYMENT_METHOD.CARD]: "💳 บัตรเครดิต/เดบิต",
  [PAYMENT_METHOD.CASH]: "💵 เงินสด",
  // order ก่อนแก้บั๊ก — ดูวิธีจ่ายจริงได้ใน Stripe Dashboard
  stripe: "Stripe (ข้อมูลเก่า ไม่ระบุวิธี)",
};

export const paymentStatusBadge = (status?: string | null): Badge =>
  STATUS_BADGES[status ?? ""] ?? { text: status || "-", className: "bg-gray-100 text-gray-700" };

/** ค่าที่ไม่รู้จักแสดงตามที่เก็บไว้ — ห้ามเดาว่าเป็นบัตร */
export const paymentMethodLabel = (method?: string | null): string =>
  METHOD_LABELS[method ?? ""] ?? (method || "-");

export const isPaid = (status?: string | null) => status === PAYMENT_STATUS.PAID;

export const isAwaitingVerification = (status?: string | null) =>
  status === PAYMENT_STATUS.VERIFYING;

/** กำลังจ่าย / รอตรวจยอดโอน / จ่ายแล้ว — แก้รายการไม่ได้ เพราะยอดจะไม่ตรงกับเงินที่ได้ */
export const isPaymentLocked = (status?: string | null) =>
  status === PAYMENT_STATUS.PAID ||
  status === PAYMENT_STATUS.AWAITING ||
  status === PAYMENT_STATUS.VERIFYING;

export const isPromptPayTransfer = (method?: string | null) =>
  method === PAYMENT_METHOD.PROMPTPAY_TRANSFER;
