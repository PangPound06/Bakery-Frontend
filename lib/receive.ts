/**
 * การรับสินค้าของ order ออนไลน์ (tb_orders.fulfillment / receive_at)
 *
 * ค่าต้องตรงกับ backend: common/Fulfillment.java และ ReceiveSlotService.java
 */
export type Fulfillment = "delivery" | "pickup";

/** order เก่าที่ไม่มีค่า = จัดส่ง */
export const fulfillmentLabel = (f?: string | null) => (f === "pickup" ? "มารับที่ร้าน" : "จัดส่ง");

/** เวลาไทยจากค่า LocalDateTime ของ backend (ไม่มี timezone ติดมา) */
const toDate = (iso: string) => new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}+07:00`);

/** null = "เร็วที่สุด" / อื่นๆ = "ส. 15 พ.ย. 15:30 น." */
export const formatReceiveAt = (iso?: string | null) => {
  if (!iso) return "เร็วที่สุด";
  const date = toDate(iso);
  if (Number.isNaN(date.getTime())) return "-";
  const day = date.toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });
  const time = date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
  return `${day} ${time} น.`;
};

/** "มารับที่ร้าน · ส. 15 พ.ย. 15:30 น." */
export const receiveSummary = (order: { fulfillment?: string | null; receiveAt?: string | null }) =>
  `${fulfillmentLabel(order.fulfillment)} · ${formatReceiveAt(order.receiveAt)}`;
