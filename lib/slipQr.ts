import jsQR from "jsqr";

/**
 * ตรวจรูปสลิปในเบราว์เซอร์ก่อนส่ง — ต้องมี QR และต้องไม่ใช่ QR สำหรับจ่ายเงิน
 *
 * เป็นแค่ด่านแรกให้ลูกค้ารู้ผลทันที backend ตรวจซ้ำด้วย ZXing เสมอ (SlipQrReader)
 * กติกาต้องตรงกัน: สลิปของธนาคารไทยมี QR ตรวจสอบรายการ ส่วน QR จ่ายเงิน (EMVCo) ขึ้นต้นด้วย 000201
 */

export const SLIP_TYPES = ["image/jpeg", "image/png"];
export const SLIP_MAX_BYTES = 5 * 1024 * 1024;

const EMV_PAYMENT_PREFIX = "000201";
/** ย่อรูปใหญ่ก่อนอ่าน — เร็วขึ้นมากและ QR บนสลิปยังใหญ่พออ่านได้ */
const SCAN_MAX_SIDE = 1600;

export type SlipCheck = { ok: true } | { ok: false; reason: string };

export async function checkSlipImage(file: File): Promise<SlipCheck> {
  if (!SLIP_TYPES.includes(file.type)) {
    return { ok: false, reason: "รองรับเฉพาะรูป JPG หรือ PNG" };
  }
  if (file.size > SLIP_MAX_BYTES) {
    return { ok: false, reason: "รูปสลิปต้องมีขนาดไม่เกิน 5MB" };
  }

  let text: string | null;
  try {
    text = await readQr(file);
  } catch {
    return { ok: false, reason: "เปิดรูปนี้ไม่ได้ กรุณาเลือกรูปใหม่" };
  }

  if (!text) {
    return { ok: false, reason: "ไม่พบ QR Code ในรูป กรุณาแนบสลิปจากแอปธนาคารที่เห็น QR ชัดเจน" };
  }
  if (text.startsWith(EMV_PAYMENT_PREFIX)) {
    return { ok: false, reason: "รูปนี้เป็น QR สำหรับจ่ายเงิน ไม่ใช่สลิป กรุณาแนบสลิปหลังโอนแล้ว" };
  }
  return { ok: true };
}

async function readQr(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, SCAN_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const { data } = ctx.getImageData(0, 0, width, height);
    return jsQR(data, width, height, { inversionAttempts: "attemptBoth" })?.data ?? null;
  } finally {
    bitmap.close();
  }
}
