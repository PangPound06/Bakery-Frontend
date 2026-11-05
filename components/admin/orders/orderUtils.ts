import {
  isAwaitingVerification,
  isPaid,
  isPaymentLocked,
  isPromptPayTransfer,
  PAYMENT_STATUS,
} from "@/lib/payment";
import type { Badge, DateRangeKey, Order, OrderAction, OrderItem, ProductOption } from "./types";

/** ฟังก์ชันล้วน (ไม่มี state / ไม่เรียก API) ของหน้าจัดการคำสั่งซื้อ */

export const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const parseOptions = (json?: string | null): ProductOption[] => {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
};

/**
 * จำนวนชิ้นต่อ 1 ออเดอร์ — ตรงกับ ProductQuantityHelper ฝั่ง backend
 *
 * price ใน tb_order_items เป็นราคาต่อ 1 ออเดอร์ แต่ quantity เป็นชิ้น
 * เอามาคูณกันตรงๆ เค้กปอนด์จะได้ยอดเกินจริง 8 เท่า
 */
const multiplierOf = (option?: string | null) => {
  if (!option) return 1;
  if (option.includes("2 ปอนด์")) return 16;
  if (option.includes("1 ปอนด์")) return 8;
  return 1;
};

/** แตกจำนวนออกเป็น สั่ง / ยกเลิกแล้ว / เหลือจริง — หน่วยเป็น "ออเดอร์" */
export const splitQty = (item: OrderItem) => {
  const mult = multiplierOf(item.selectedOption);
  const ordered = Math.max(0, Math.floor(item.quantity / mult));
  const cancelled = Math.max(0, Math.floor((item.cancelledQty ?? 0) / mult));
  return { ordered, cancelled, active: Math.max(0, ordered - cancelled) };
};

/** ชื่อลูกค้า — order หน้าร้าน (POS) เก็บชื่อไว้ใน note รูปแบบ "POS Sale - <ชื่อ>" */
export const customerNameOf = (order: Order): string => {
  if (order.receiverName) return order.receiverName;
  if (order.orderType === "pos" && order.note) {
    const match = order.note.match(/POS Sale\s*-\s*(.+)/);
    if (match) return match[1].trim();
  }
  return "-";
};

/** เลข ORD — order เก่าที่ยังไม่มี ordCode ใช้สูตรเดียวกับ backend (OrderCodeGenerator) */
export const orderCodeOf = (order: Pick<Order, "id" | "ordCode">) =>
  order.ordCode || `ORD${String((order.id * 104729) % 1000000).padStart(6, "0")}${order.id}`;

/** วันที่และเวลาตามเวลาไทยเสมอ ไม่ขึ้นกับเขตเวลาของเครื่องแอดมิน */
export const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  const day = date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
  const time = date.toLocaleString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
  return `${day} ${time}`;
};

/** สลิปใหม่เก็บบน Cloudinary (URL เต็ม) ส่วนสลิปสมัยก่อนเก็บเป็น path บน backend */
export const slipUrlOf = (slipImage: string) =>
  slipImage.startsWith("http") ? slipImage : `${process.env.NEXT_PUBLIC_API_URL}${slipImage}`;

export const orderStatusBadge = (status: string, orderType?: string): Badge => {
  switch (status) {
    case "pending":
      return { text: "รอดำเนินการ", className: "bg-yellow-100 text-yellow-700", icon: "⏳" };
    case "confirmed":
      return { text: "ยืนยันแล้ว", className: "bg-blue-100 text-blue-700", icon: "✅" };
    case "preparing":
      return { text: "กำลังเตรียม", className: "bg-indigo-100 text-indigo-700", icon: "👨‍🍳" };
    case "shipping":
      return { text: "กำลังจัดส่ง", className: "bg-purple-100 text-purple-700", icon: "🚚" };
    case "delivered":
      if (orderType === "pos")
        return { text: "สั่งซื้อสำเร็จ (หน้าร้าน)", className: "bg-emerald-100 text-emerald-700", icon: "🎉" };
      if (orderType === "dine-in")
        return { text: "ชำระเงินแล้ว", className: "bg-emerald-100 text-emerald-700", icon: "✅" };
      return { text: "จัดส่งแล้ว", className: "bg-green-100 text-green-700", icon: "📦" };
    case "cancel_requested":
      return { text: "รอพิจารณาคำขอยกเลิก", className: "bg-orange-100 text-orange-700", icon: "⏸️" };
    case "cancelled":
      return { text: "ยกเลิก", className: "bg-red-100 text-red-700", icon: "❌" };
    default:
      return { text: status, className: "bg-gray-100 text-gray-700", icon: "📋" };
  }
};

export const channelBadge = (orderType?: string): Badge => {
  if (orderType === "pos") return { text: "🏪 หน้าร้าน", className: "bg-amber-100 text-amber-700" };
  if (orderType === "dine-in") return { text: "🪑 ในร้าน", className: "bg-green-100 text-green-700" };
  return { text: "🌐 ออนไลน์", className: "bg-blue-50 text-blue-600" };
};

// ─── สิทธิ์แก้ไขรายการ ───────────────────────────────────────

const CLOSED_STATUSES = ["delivered", "cancelled", "cancel_requested"];

/**
 * แก้/ลบรายการได้ไหม — ห้ามเมื่อ order ปิดแล้ว, เป็น POS, หรือลูกค้ากำลังจ่าย/จ่ายแล้ว
 * (backend กันไว้ที่ OrderItemService ด้วย ปุ่มต้องหายไปเพื่อไม่ให้กดแล้วเด้ง error)
 */
export const canEditItems = (order: Order) =>
  !CLOSED_STATUSES.includes(order.orderStatus) &&
  order.orderType !== "pos" &&
  !isPaymentLocked(order.paymentStatus);

/** จ่ายแล้วแก้จำนวนตรงๆ ไม่ได้ แต่ตัดออกพร้อมคืนเงินได้ผ่าน CancelRefundModal */
export const canRefundItems = (order: Order) =>
  isPaid(order.paymentStatus) && !CLOSED_STATUSES.includes(order.orderStatus);

/** ส่วนเพิ่มสินค้าแสดงไหม (ข้างในค่อยแยกว่าเป็นปุ่มหรือข้อความแจ้งเหตุผล) */
export const showsAddItemSection = (order: Order) =>
  !["delivered", "cancelled"].includes(order.orderStatus) && order.orderType !== "pos";

// ─── ปุ่มดำเนินการ ─────────────────────────────────────────

const RED = "bg-red-100 hover:bg-red-200 text-red-600";
const GREEN = "bg-green-500 hover:bg-green-600 text-white";

/**
 * ปุ่มที่แอดมินกดได้ต่อจากสถานะปัจจุบัน
 *
 * order ออนไลน์ต้องได้เงินก่อนถึงจะยืนยัน/เตรียมของได้ (backend กันไว้ด้วย)
 * โอนพร้อมเพย์ยังไม่ได้ยืนยันยอด → ปุ่มยืนยันรับเงิน / ไม่พบยอดโอน แทนปุ่มยกเลิก
 */
export const nextActionsFor = (order: Order): OrderAction[] => {
  if (order.orderType === "pos") return [];

  // dine-in มีแค่ปุ่มยืนยันชำระเงิน (รับเงินสดที่เคาน์เตอร์)
  if (order.orderType === "dine-in") {
    return order.orderStatus === "pending" || order.orderStatus === "confirmed"
      ? [
          {
            kind: "status",
            label: "✅ ยืนยันการชำระเงิน",
            orderStatus: "delivered",
            paymentStatus: PAYMENT_STATUS.PAID,
            color: GREEN,
          },
        ]
      : [];
  }

  switch (order.orderStatus) {
    case "pending": {
      const transferUndecided =
        isPromptPayTransfer(order.paymentMethod) &&
        (isAwaitingVerification(order.paymentStatus) ||
          order.paymentStatus === PAYMENT_STATUS.AWAITING);
      if (transferUndecided) {
        return [
          { kind: "confirm-transfer", label: "✅ ยืนยันรับเงิน", color: GREEN },
          { kind: "reject-transfer", label: "❌ ไม่พบยอดโอน", color: RED },
        ];
      }
      const cancel: OrderAction = { kind: "cancel", label: "❌ ยกเลิก", color: RED };
      return isPaid(order.paymentStatus)
        ? [
            {
              kind: "status",
              label: "✅ ยืนยันคำสั่งซื้อ",
              orderStatus: "confirmed",
              color: "bg-blue-500 hover:bg-blue-600 text-white",
            },
            cancel,
          ]
        : [cancel];
    }
    case "confirmed":
      return [
        { kind: "status", label: "👨‍🍳 เตรียมสินค้า", orderStatus: "preparing", color: "bg-indigo-500 hover:bg-indigo-600 text-white" },
      ];
    case "preparing":
      return [
        { kind: "status", label: "🚚 จัดส่ง", orderStatus: "shipping", color: "bg-purple-500 hover:bg-purple-600 text-white" },
      ];
    case "shipping":
      return [{ kind: "status", label: "📦 จัดส่งสำเร็จ", orderStatus: "delivered", color: GREEN }];
    default:
      return [];
  }
};

// ─── ช่วงเวลา ──────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, "0");

/** LocalDateTime ของ backend (ไม่มี timezone) จากเวลาเครื่อง */
const toLocalDateTime = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 0);
  return x;
};

const daysAgo = (now: Date, days: number) => {
  const x = startOfDay(now);
  x.setDate(x.getDate() - days);
  return x;
};

/** from/to สำหรับ query ตามปุ่มช่วงเวลา — "all" คืนค่าว่างทั้งคู่ */
export const dateRangeBounds = (
  range: DateRangeKey,
  customFrom: string,
  customTo: string,
  now = new Date(),
): { from: string; to: string } => {
  const today = toLocalDateTime(endOfDay(now));
  switch (range) {
    case "today":
      return { from: toLocalDateTime(startOfDay(now)), to: today };
    case "7d":
      return { from: toLocalDateTime(daysAgo(now, 6)), to: today };
    case "30d":
      return { from: toLocalDateTime(daysAgo(now, 29)), to: today };
    case "month":
      return { from: toLocalDateTime(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    case "year":
      return { from: toLocalDateTime(new Date(now.getFullYear(), 0, 1)), to: today };
    case "custom":
      return { from: customFrom, to: customTo };
    case "all":
      return { from: "", to: "" };
  }
};
