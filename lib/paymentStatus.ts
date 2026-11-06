import { authHeaders } from "@/lib/auth";
import { PAYMENT_STATUS } from "@/lib/payment";

/**
 * ถามสถานะการจ่ายเงินของ order จาก backend (ใช้ได้ทั้งออนไลน์และบิลทานในร้าน)
 *
 * backend เป็น paid ได้จาก Stripe หรือแอดมินยืนยันยอดโอนเท่านั้น — หน้าเว็บไม่ตัดสินเอง
 *
 * ended = รอบนี้จบโดยไม่ได้เงิน (ยกเลิก / หมดเวลา) — order ถูกลบไปแล้วจึงตอบ 404
 */
export type PaymentPoll = "paid" | "verifying" | "ended" | "pending";

export async function pollPaymentStatus(orderId: number): Promise<{ state: PaymentPoll; ordCode?: string }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/checkout/status/${orderId}`, {
    headers: authHeaders(),
  });
  if (res.status === 404) return { state: "ended" };

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) return { state: "pending" };

  const ordCode = typeof data.ordCode === "string" ? data.ordCode : undefined;
  switch (data.paymentStatus) {
    case PAYMENT_STATUS.PAID:
      return { state: "paid", ordCode };
    case PAYMENT_STATUS.VERIFYING:
      return { state: "verifying", ordCode };
    case PAYMENT_STATUS.FAILED:
    case PAYMENT_STATUS.EXPIRED:
      return { state: "ended", ordCode };
    default:
      return { state: "pending", ordCode };
  }
}
