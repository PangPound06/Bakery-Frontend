/**
 * รอบจ่ายเงินที่ backend ออกให้ — รูปแบบเดียวกันทั้ง checkout ออนไลน์ (/api/checkout/intent)
 * และบิลทานในร้าน (/api/dinein/request-bill) จึงใช้ PaymentPanel ตัวเดียวกันได้
 */

export type CheckoutMethod = "promptpay" | "card" | "transfer";

export interface ActiveIntent {
  method: CheckoutMethod;
  orderId: number;
  ordCode: string;
  total: number;
  /** promptpay / transfer */
  qrImageUrl?: string;
  /** promptpay — หน้าของ Stripe (test mode ใช้จำลองการจ่าย) */
  hostedUrl?: string;
  testMode?: boolean;
  /** card */
  clientSecret?: string;
  /** transfer */
  promptPayId?: string;
  accountName?: string;
  expiresInSeconds?: number;
}

/** แปลง JSON ที่ backend ตอบกลับ (success = true) เป็น ActiveIntent */
export const toActiveIntent = (
  method: CheckoutMethod,
  data: Record<string, unknown>,
  fallbackTotal = 0,
): ActiveIntent => ({
  method,
  orderId: Number(data.orderId),
  ordCode: typeof data.ordCode === "string" ? data.ordCode : "",
  total: typeof data.total === "number" ? data.total : fallbackTotal,
  qrImageUrl: typeof data.qrImageUrl === "string" ? data.qrImageUrl : undefined,
  hostedUrl: typeof data.hostedUrl === "string" ? data.hostedUrl : undefined,
  testMode: data.testMode === true,
  clientSecret: typeof data.clientSecret === "string" ? data.clientSecret : undefined,
  promptPayId: typeof data.promptPayId === "string" ? data.promptPayId : undefined,
  accountName: typeof data.accountName === "string" ? data.accountName : undefined,
  expiresInSeconds: typeof data.expiresInSeconds === "number" ? data.expiresInSeconds : undefined,
});
