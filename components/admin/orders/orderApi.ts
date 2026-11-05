import { authHeaders } from "@/lib/auth";
import type { CancelRefundValues } from "@/components/admin/CancelRefundModal";
import type { Order, OrderItem, Product } from "./types";

/**
 * เรียก API ของหน้าจัดการคำสั่งซื้อ — ทุกคำขอแนบ token แอดมิน
 *
 * คืน { ok, data } ไม่ throw เมื่อ backend ตอบ error — ให้หน้าจอเลือกข้อความแจ้งเอง
 * throw เฉพาะตอนเชื่อมต่อ server ไม่ได้
 */

const BASE = process.env.NEXT_PUBLIC_API_URL;

export interface ApiResult<T = Record<string, unknown>> {
  ok: boolean;
  data: T & { success?: boolean; error?: string; message?: string };
}

async function request<T = Record<string, unknown>>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const hasBody = init.body !== undefined;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...authHeaders(),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.success !== false, data };
}

/** ข้อความ error จาก backend (บาง endpoint ใช้ error บางตัวใช้ message) */
export const errorText = <T,>(result: ApiResult<T>, fallback: string) =>
  result.data.error || result.data.message || fallback;

// ─── อ่าน ──────────────────────────────────────────────────

export interface OrdersPage {
  content: Order[];
  totalPages: number;
  totalElements: number;
}

export interface OrdersSummary {
  totalOrderCount: number;
  statusCounts: Record<string, number>;
  channelCounts: Record<string, number>;
}

export const fetchOrdersPage = (params: URLSearchParams) =>
  request<OrdersPage>(`/api/orders/admin/page?${params}`);

export const fetchOrdersSummary = (params: URLSearchParams) =>
  request<OrdersSummary>(`/api/orders/admin/report-summary?${params}`);

export const fetchOrderDetail = (orderId: number) =>
  request<{ order: Order; items: OrderItem[] }>(`/api/orders/${orderId}`);

export const fetchProducts = async (): Promise<Product[]> => {
  const result = await request<Product[]>(`/api/products`);
  return Array.isArray(result.data) ? result.data : [];
};

// ─── เปลี่ยนสถานะ ───────────────────────────────────────────

export const updateOrderStatus = (orderId: number, orderStatus: string, paymentStatus?: string) =>
  request(`/api/orders/${orderId}/status`, {
    method: "PUT",
    body: JSON.stringify(paymentStatus ? { orderStatus, paymentStatus } : { orderStatus }),
  });

/** ยกเลิก order ที่ยังไม่ได้เงิน (backend คืน stock ให้) */
export const cancelOrder = (orderId: number) =>
  request(`/api/orders/${orderId}/cancel`, { method: "PUT" });

/** ยกเลิก + คืนเงิน order ที่จ่ายแล้ว — บันทึกใน tb_cancel_requests / tb_refunds */
export const cancelAndRefund = (orderId: number, values: CancelRefundValues) =>
  request(`/api/admin/orders/${orderId}/cancel-refund`, {
    method: "POST",
    body: JSON.stringify(values),
  });

export const decideTransfer = (orderId: number, decision: "confirm" | "reject", reason = "") =>
  request(`/api/orders/${orderId}/transfer/${decision}`, {
    method: "POST",
    body: JSON.stringify(decision === "reject" ? { reason } : {}),
  });

// ─── แก้รายการ ─────────────────────────────────────────────

export interface TotalsResponse {
  newSubtotal: number;
  newTotal: number;
}

/** quantity เป็นจำนวน "ออเดอร์" ไม่ใช่ "ชิ้น" */
export const updateItemQuantity = (orderId: number, itemId: number, quantity: number) =>
  request<TotalsResponse>(`/api/orders/${orderId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });

export const removeItem = (orderId: number, itemId: number) =>
  request<TotalsResponse & { cancelled?: boolean }>(`/api/orders/${orderId}/items/${itemId}`, {
    method: "DELETE",
  });

export interface NewItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  selectedOption: string | null;
  image: string;
}

export const addItem = (orderId: number, item: NewItem) =>
  request<TotalsResponse & { newItem: OrderItem }>(`/api/orders/${orderId}/items`, {
    method: "POST",
    body: JSON.stringify(item),
  });
