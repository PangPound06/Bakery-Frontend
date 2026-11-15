"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import CancelRequestModal from "@/components/orders/CancelRequestModal";
import Pagination from "@/components/ui/Pagination";
import { receiveSummary } from "@/lib/receive";
import {
  isAwaitingVerification,
  isPaid,
  paymentMethodLabel,
  paymentStatusBadge,
} from "@/lib/payment";

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  selectedOption?: string | null;
  /** จำนวนชิ้นที่ถูกยกเลิกไปแล้ว — backend ส่งมาใน itemToMap */
  cancelledQty?: number | null;
}

interface Order {
  id: number;
  ordCode: string;
  email: string;
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  orderType: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  fulfillment?: string | null;
  receiveAt?: string | null;
  note: string;
  slipImage: string;
  createdAt: string;
  /** ยอดที่คืนเงินไปแล้ว — มาจาก GET /api/orders/{id} เท่านั้น */
  refundedAmount?: number;
}

const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ดึงชื่อลูกค้าจาก receiverName ก่อน → fallback ไป note ของ POS
const getCustomerName = (order: Order): string => {
  if (order.receiverName) return order.receiverName;
  if (order.orderType === "pos" && order.note) {
    const match = order.note.match(/POS Sale\s*-\s*(.+)/i);
    if (match) return match[1].trim();
  }
  return "-";
};

/**
 * ซ่อนใบที่หมดเวลาก่อนจ่ายเงินออกจากสายตาลูกค้า
 *
 * ใบเหล่านี้เกิดจากการกดจ่ายเงินค้างไว้แล้วเริ่มใหม่ ไม่เคยมีเงินเข้าออกจริง
 * สำหรับลูกค้ามันคือขยะ — แอดมินยังเห็นครบที่หน้า Manage Orders
 */
const NEVER_PAID = ["expired", "failed"];
const visibleOrders = (list: Order[]) =>
  list.filter((o) => !NEVER_PAID.includes(o.paymentStatus));

const isPoundOption = (opt?: string | null) => opt?.includes("ปอนด์") ?? false;

/**
 * จำนวนชิ้นต่อ 1 ออเดอร์ — ตรงกับ ProductQuantityHelper ฝั่ง backend
 *
 * tb_order_items เก็บ quantity เป็น "ชิ้น" ส่วน price เป็นราคาต่อ 1 ออเดอร์
 * เค้ก 1 ปอนด์จึงเก็บ quantity = 8 ถ้าเอา price × quantity ตรงๆ จะได้ยอดเกินจริง 8 เท่า
 */
const multiplierOf = (opt?: string | null) => {
  if (!opt) return 1;
  if (opt.includes("2 ปอนด์")) return 16;
  if (opt.includes("1 ปอนด์")) return 8;
  return 1;
};

/** แตกรายการหนึ่งออกเป็น สั่ง / ยกเลิกแล้ว / เหลือจริง (หน่วยเป็น "ออเดอร์") */
const splitQty = (item: OrderItem) => {
  const mult = multiplierOf(item.selectedOption);
  const ordered = Math.max(0, Math.floor(item.quantity / mult));
  const cancelled = Math.max(0, Math.floor((item.cancelledQty ?? 0) / mult));
  return { ordered, cancelled, active: Math.max(0, ordered - cancelled) };
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelItems, setCancelItems] = useState<OrderItem[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState<
    "today" | "7d" | "30d" | "month" | "year" | "all" | "custom"
  >("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const selectedOrderRef = useRef<Order | null>(null);

  useEffect(() => {
    selectedOrderRef.current = selectedOrder;
  }, [selectedOrder]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrdersSilent();
      // ถ้ามีออเดอร์ที่เปิดดูอยู่ ให้รีเฟรชข้อมูลออเดอร์นั้นด้วย
      if (selectedOrderRef.current) {
        fetchOrderDetail(selectedOrderRef.current.id, true);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [router]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.email) return;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/user/${user.email}?size=500`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.ok) {
        const data = await response.json();
        // ✅ response เป็น envelope { content, ... } รองรับของเดิม (array) ด้วย
        setOrders(
          visibleOrders(Array.isArray(data) ? data : (data.content ?? [])),
        );
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrdersSilent = async () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.email) return;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/user/${user.email}?size=500`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.ok) {
        const data = await response.json();
        // ✅ response เป็น envelope { content, ... } รองรับของเดิม (array) ด้วย
        setOrders(
          visibleOrders(Array.isArray(data) ? data : (data.content ?? [])),
        );
      }
    } catch {
      // เครือข่ายสะดุด — รอบ polling ถัดไปจะดึงใหม่เอง
    }
  };

  const fetchOrderDetail = async (orderId: number, silent = false) => {
    if (!silent) setLoadingDetail(true); // ✅ ถ้า silent จะไม่แสดง spinner
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedOrder(data.order);
          setOrderItems(data.items || []);
        }
      }
    } catch (error) {
      console.error("Error fetching order detail:", error);
    } finally {
      if (!silent) setLoadingDetail(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    const result = await Swal.fire({
      title: "ยกเลิกคำสั่งซื้อ?",
      text: "ต้องการยกเลิกคำสั่งซื้อนี้หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#b3261e",
      cancelButtonColor: "#6b5e52",
      confirmButtonText: "ยืนยันยกเลิก",
      cancelButtonText: "ไม่ยกเลิก",
    });
    if (!result.isConfirmed) return;
    try {
      const token = localStorage.getItem("token"); // ✅ เพิ่ม
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}/cancel`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }, // ✅ เพิ่ม
        },
      );
      const data = await response.json();
      if (data.success) {
        await Swal.fire({
          title: "ยกเลิกสำเร็จ!",
          text: "ยกเลิกคำสั่งซื้อเรียบร้อยแล้ว",
          icon: "success",
          confirmButtonColor: "#a84a0e",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchOrders();
        setSelectedOrder(null);
      } else {
        await Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: data.error || data.message || "ไม่สามารถยกเลิกได้",
          icon: "error",
          confirmButtonColor: "#a84a0e",
        });
      }
    } catch {
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถยกเลิกได้",
        icon: "error",
        confirmButtonColor: "#a84a0e",
      });
    }
  };

  /**
   * จ่ายเงินแล้ว → ต้องยื่นคำขอเพื่อให้แอดมินคืนเงิน
   * ยังไม่จ่าย → ยกเลิกตรงได้เลยเหมือนเดิม ไม่มีเงินให้คืน
   */
  /** แจ้งโอนแล้วรอร้านตรวจยอด → ยกเลิกเองไม่ได้ (เงินอาจอยู่ในบัญชีร้านแล้ว) */
  const canCancel = (order: Order) =>
    (order.orderStatus === "pending" || order.orderStatus === "confirmed") &&
    !isAwaitingVerification(order.paymentStatus);

  const startCancel = async (order: Order) => {
    if (!isPaid(order.paymentStatus)) {
      handleCancelOrder(order.id);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${order.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      setCancelItems(data.items ?? []);
      setCancelTarget(order);
    } catch {
      await Swal.fire({
        title: "โหลดรายการสินค้าไม่สำเร็จ",
        text: "ลองใหม่อีกครั้ง",
        icon: "error",
        confirmButtonColor: "#a84a0e",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return {
          text: "รอดำเนินการ",
          bg: "bg-warn-soft text-body",
          icon: "⏳",
        };
      case "confirmed":
        return {
          text: "ยืนยันแล้ว",
          bg: "bg-new-soft text-new-ink",
          icon: "✅",
        };
      case "preparing":
        return {
          text: "กำลังเตรียม",
          bg: "bg-new-soft text-new-ink",
          icon: "👨‍🍳",
        };
      case "shipping":
        return {
          text: "กำลังจัดส่ง",
          bg: "bg-new-soft text-new-ink",
          icon: "🚚",
        };
      case "delivered":
        return {
          text: "จัดส่งแล้ว",
          bg: "bg-success-soft text-success",
          icon: "📦",
        };
      case "cancel_requested":
        return {
          text: "รอร้านพิจารณาคำขอยกเลิก",
          bg: "bg-warn-soft text-body",
          icon: "⏸️",
        };
      case "cancelled":
        return { text: "ยกเลิก", bg: "bg-danger-soft text-danger", icon: "❌" };
      default:
        return { text: status, bg: "bg-sand text-body", icon: "📋" };
    }
  };

  const formatDate = (dateStr: string) => {
    const dateObj = new Date(dateStr);

    // 1. ดึงเฉพาะส่วนวันที่ (ที่ทำงานได้ตรงเวลา)
    const datePart = dateObj.toLocaleString("th-TH", {
      day: "2-digit", // หรือ "numeric" ตามต้องการ
      month: "short",
      year: "numeric",
      timeZone: "Asia/Bangkok",
    });

    // 2. ดึงเฉพาะส่วนเวลา (ที่ทำงานได้ตรงเวลา)
    const timePart = dateObj.toLocaleString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    });

    // 3. นำมาต่อกัน
    return `${datePart} ${timePart}`;
  };

  // ✅ กรองตามช่วงเวลาที่เลือก (ดีฟอลต์ 30 วัน)
  const inDateRange = (orderDate: Date) => {
    if (dateRange === "all") return true;
    const now = new Date();
    if (dateRange === "custom") {
      if (customFrom && orderDate < new Date(`${customFrom}T00:00:00`))
        return false;
      if (customTo && orderDate > new Date(`${customTo}T23:59:59`))
        return false;
      return true;
    }
    let start: Date;
    if (dateRange === "today") {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
    } else if (dateRange === "7d") {
      start = new Date(now);
      start.setDate(start.getDate() - 7);
    } else if (dateRange === "30d") {
      start = new Date(now);
      start.setDate(start.getDate() - 30);
    } else if (dateRange === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (dateRange === "year") {
      start = new Date(now.getFullYear(), 0, 1);
    } else {
      return true;
    }
    return orderDate >= start;
  };

  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    if (!inDateRange(orderDate)) return false;
    if (order.orderType === "pos") return false;

    if (filterStatus === "all") return true;
    return order.orderStatus === filterStatus;
  });

  /*
   * ตัดหน้าฝั่ง client
   *
   * ตัวกรองสถานะกับช่วงวันที่ของหน้านี้ทำงานฝั่ง client ถ้าให้ server แบ่งหน้ามา
   * ตัวกรองจะทำงานแค่ในหน้าที่เห็น เลือก "ยกเลิก" แล้วอาจได้ 0 รายการ
   * ทั้งที่หน้าถัดไปมีอยู่ — กรองก่อนแล้วค่อยตัดหน้าจึงถูกกว่า
   *
   * ลูกค้าคนเดียวไม่มีทางมีออเดอร์ถึงหลักล้าน ดึง 500 ใบล่าสุดมาพอ
   */
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pagedOrders = filteredOrders.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );

  if (loading)
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full animate-spin"
            style={{
              borderWidth: 3,
              borderStyle: "solid",
              borderColor: "#a84a0e transparent transparent transparent",
            }}
          ></div>
          <p className="text-body text-sm font-medium">
            กำลังโหลดข้อมูล...
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-cream   py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/"
            className="text-brick hover:text-body flex items-center gap-2 mb-4"
          >
            ← กลับหน้าหลัก
          </Link>
          <h1 className="text-3xl font-bold text-ink">
            📋 รายการสั่งซื้อ
          </h1>
          <p className="text-brick mt-1">
            คำสั่งซื้อทั้งหมด {filteredOrders.length} รายการ
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="hidden md:block md:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <nav className="space-y-2">
                <Link
                  href="/user/profile"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sand text-body"
                >
                  <span>👤</span> ข้อมูลส่วนตัว
                </Link>
                <Link
                  href="/user/orders"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-warn-soft text-body font-medium"
                >
                  <span>📋</span> รายการสั่งซื้อ
                </Link>
                <Link
                  href="/user/search-order"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sand text-body"
                >
                  <span>🔍</span> ค้นหาคำสั่งซื้อ
                </Link>
                <Link
                  href="/user/reservations"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sand text-body"
                >
                  <span>📅</span> การจองคิว
                </Link>
                <Link
                  href="/user/favorites"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sand text-body"
                >
                  <span>❤️</span> รายการโปรด
                </Link>
                <Link
                  href="/user/settings"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sand text-body"
                >
                  <span>⚙️</span> ตั้งค่า
                </Link>
              </nav>
            </div>
          </div>

          <div className="md:col-span-3 space-y-4">
            {/* ✅ ช่วงเวลา */}
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink flex items-center gap-1 mr-1">
                  📅 ช่วงเวลา:
                </span>
                {[
                  { key: "today", label: "วันนี้" },
                  { key: "7d", label: "7 วัน" },
                  { key: "30d", label: "30 วัน" },
                  { key: "month", label: "เดือนนี้" },
                  { key: "year", label: "ปีนี้" },
                  { key: "all", label: "ทั้งหมด" },
                  { key: "custom", label: "กำหนดเอง" },
                ].map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setDateRange(r.key as typeof dateRange)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      dateRange === r.key
                        ? "bg-brick text-white shadow-md"
                        : "bg-sand text-ink hover:bg-line"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {dateRange === "custom" && (
                <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-line">
                  <label className="text-sm text-subtle flex items-center gap-2">
                    จาก
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brick"
                    />
                  </label>
                  <label className="text-sm text-subtle flex items-center gap-2">
                    ถึง
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brick"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all", label: "ทั้งหมด" },
                  { value: "pending", label: "⏳ รอดำเนินการ" },
                  { value: "confirmed", label: "✅ ยืนยันแล้ว" },
                  { value: "shipping", label: "🚚 กำลังจัดส่ง" },
                  { value: "delivered", label: "📦 คำสั่งซื้อเสร็จสิ้น" },
                  { value: "cancelled", label: "❌ ยกเลิก" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => {
                      setFilterStatus(filter.value);
                      setPage(0);
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filterStatus === filter.value ? "bg-brick text-white" : "bg-sand text-ink hover:bg-line"}`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-muted text-lg">ไม่มีคำสั่งซื้อ</p>
                <Link
                  href="/"
                  className="inline-block mt-4 px-6 py-3 bg-brick text-white rounded-xl hover:bg-brick-hover transition-colors"
                >
                  🛒 เลือกซื้อสินค้า
                </Link>
              </div>
            ) : (
              pagedOrders.map((order) => {
                const status = getStatusBadge(order.orderStatus);
                const payment = paymentStatusBadge(order.paymentStatus);
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    <div className="flex items-center justify-between p-4 bg-sand border-b">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{status.icon}</span>
                        <div>
                          <p className="font-semibold text-body">
                            คำสั่งซื้อ #{order.ordCode}
                          </p>
                          <p className="text-xs text-muted">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg}`}
                        >
                          {status.text}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${payment.className}`}
                        >
                          {payment.text}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted">
                            {paymentMethodLabel(order.paymentMethod)}
                          </p>
                          <p className="text-sm text-muted">
                            จัดส่งถึง: {order.receiverName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-brick">
                            ฿{formatPrice(order.total)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <button
                          onClick={() => fetchOrderDetail(order.id)}
                          className="flex-1 px-4 py-2 bg-warn-soft text-body rounded-lg hover:bg-warn-line transition-colors text-sm font-medium"
                        >
                          🔍 ดูรายละเอียด
                        </button>
                        {canCancel(order) && (
                          <button
                            onClick={() => startCancel(order)}
                            className="px-4 py-2 bg-danger-soft text-error rounded-lg hover:bg-danger-line transition-colors text-sm font-medium"
                          >
                            {isPaid(order.paymentStatus) ? "ขอยกเลิก" : "ยกเลิก"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {filteredOrders.length > 0 && (
              /* หน้านี้เป็นการ์ดเรียงกัน ไม่มีการ์ดครอบ จึงห่อเองให้แถบดูเข้าชุด */
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <Pagination
                  page={safePage}
                  totalPages={totalPages}
                  totalElements={filteredOrders.length}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(0);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 bg-brick rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">
                📋 คำสั่งซื้อ #{selectedOrder.ordCode}
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-brick-hover rounded-lg transition-colors text-white"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-12 text-center">
                <div className="w-10 h-10 border-4 border-brick border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted">กำลังโหลด...</p>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">สถานะ</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedOrder.orderStatus).bg}`}
                  >
                    {getStatusBadge(selectedOrder.orderStatus).icon}{" "}
                    {getStatusBadge(selectedOrder.orderStatus).text}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">วันที่สั่งซื้อ</span>
                  <span className="text-sm font-medium text-body">
                    {formatDate(selectedOrder.createdAt)}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-semibold text-body mb-3">
                    🛒 รายการสินค้า
                  </p>
                  <div className="space-y-2">
                    {orderItems.map((item) => {
                      const isPound = isPoundOption(item.selectedOption);
                      const { cancelled, active } = splitQty(item);
                      const allCancelled = active === 0;
                      const displayTotal = item.price * active;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            allCancelled ? "bg-sand" : "bg-warn-bg"
                          }`}
                        >
                          <div>
                            <p
                              className={`font-medium ${
                                allCancelled
                                  ? "text-muted line-through"
                                  : "text-body"
                              }`}
                            >
                              {item.productName}
                            </p>
                            {item.selectedOption && (
                              <span className="inline-block px-2 py-0.5 bg-new-soft text-new-ink text-xs rounded-full mt-0.5">
                                {item.selectedOption}
                              </span>
                            )}
                            {cancelled > 0 && (
                              <span className="inline-block px-2 py-0.5 bg-danger-soft text-error text-xs rounded-full mt-0.5 ml-1">
                                ยกเลิกแล้ว {cancelled}{" "}
                                {isPound ? "ออเดอร์" : "ชิ้น"}
                              </span>
                            )}
                            <p className="text-xs text-muted mt-0.5">
                              {allCancelled ? (
                                "ยกเลิกทั้งรายการแล้ว"
                              ) : (
                                <>
                                  ฿{formatPrice(item.price)} × {active}{" "}
                                  {isPound ? "ออเดอร์" : "ชิ้น"}
                                </>
                              )}
                            </p>
                          </div>
                          <p
                            className={`font-semibold ${
                              allCancelled ? "text-muted" : "text-brick"
                            }`}
                          >
                            ฿{formatPrice(displayTotal)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-ink">
                    <span>ยอดรวมสินค้า</span>
                    <span>฿{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-ink">
                    <span>ค่าจัดส่ง</span>
                    <span className="text-ok">
                      {selectedOrder.shipping > 0
                        ? `฿${formatPrice(selectedOrder.shipping)}`
                        : "ฟรี"}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span className="text-ink">ยอดรวมทั้งหมด</span>
                    <span className="text-brick">
                      ฿{formatPrice(selectedOrder.total)}
                    </span>
                  </div>
                  {(selectedOrder.refundedAmount ?? 0) > 0 && (
                    <div className="bg-danger-soft border border-danger-line rounded-lg px-3 py-2 mt-1">
                      <div className="flex justify-between text-sm text-error font-medium">
                        <span>คืนเงินให้คุณแล้ว</span>
                        <span>
                          ฿{formatPrice(selectedOrder.refundedAmount ?? 0)}
                        </span>
                      </div>
                      <p className="text-xs text-danger-line mt-0.5">
                        ยอดรวมด้านบนคือรายการที่เหลือหลังหักรายการที่ยกเลิกออกแล้ว
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-body mb-2">
                    💰 การชำระเงิน
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">วิธีชำระเงิน</span>
                    <span>
                      {paymentMethodLabel(selectedOrder.paymentMethod)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted">สถานะ</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentStatusBadge(selectedOrder.paymentStatus).className}`}
                    >
                      {paymentStatusBadge(selectedOrder.paymentStatus).text}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-body mb-2">
                    📦 ข้อมูลการจัดส่ง
                  </p>
                  <div className="bg-sand rounded-lg p-3 space-y-1 text-sm">
                    <p>
                      <span className="text-muted">ชื่อผู้รับ:</span>{" "}
                      <span className="font-medium">
                        {getCustomerName(selectedOrder)}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted">เบอร์โทร:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.receiverPhone}
                      </span>
                    </p>
                    {selectedOrder.orderType !== "dine-in" && (
                      <p>
                        <span className="text-muted">รับสินค้า:</span>{" "}
                        <span className="font-medium">{receiveSummary(selectedOrder)}</span>
                      </p>
                    )}
                    <p>
                      <span className="text-muted">ที่อยู่:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.receiverAddress}
                      </span>
                    </p>
                    {selectedOrder.note && (
                      <p>
                        <span className="text-muted">หมายเหตุ:</span>{" "}
                        <span className="font-medium">
                          {selectedOrder.note}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {canCancel(selectedOrder) && (
                  <button
                    onClick={() => startCancel(selectedOrder)}
                    className="w-full py-3 bg-danger-soft text-error rounded-xl hover:bg-danger-line transition-colors font-medium"
                  >
                    {isPaid(selectedOrder.paymentStatus)
                      ? "❌ ขอยกเลิกและคืนเงิน"
                      : "❌ ยกเลิกคำสั่งซื้อ"}
                  </button>
                )}
                {isAwaitingVerification(selectedOrder.paymentStatus) && (
                  <p className="text-xs text-center text-brick">
                    แจ้งโอนแล้ว รอร้านตรวจสอบยอด — หากต้องการยกเลิกกรุณาติดต่อร้าน
                  </p>
                )}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full py-3 bg-sand text-ink rounded-xl hover:bg-line transition-colors font-medium"
                >
                  ปิด
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {cancelTarget && (
        <CancelRequestModal
          orderId={cancelTarget.id}
          ordCode={cancelTarget.ordCode}
          items={cancelItems}
          onClose={() => setCancelTarget(null)}
          onSubmitted={async (_requestId, message) => {
            setCancelTarget(null);
            setSelectedOrder(null);
            await Swal.fire({
              title: "ส่งคำขอแล้ว",
              text: message,
              icon: "success",
              confirmButtonColor: "#a84a0e",
            });
            fetchOrders();
          }}
        />
      )}
    </div>
  );
}