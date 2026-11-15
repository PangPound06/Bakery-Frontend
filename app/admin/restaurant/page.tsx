"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { authHeaders } from "@/lib/auth";

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  selectedOption?: string | null;
  image?: string;
}

interface Order {
  id: number;
  ordCode: string;
  email: string;
  subtotal: number;
  total: number;
  orderStatus: string;
  tableNo?: string;
  /** หมายเหตุถึงครัวที่ลูกค้าพิมพ์ตอนส่งรอบนี้ (ไม่บังคับ) */
  note?: string | null;
  dineType?: string | null;
  createdAt: string;
}

const STATUS_MAP: Record<string, { text: string; bg: string; icon: string }> = {
  pending: {
    text: "กำลังเตรียม",
    bg: "bg-warn-soft text-body",
    icon: "⏳",
  },
  preparing: {
    text: "กำลังทำ",
    bg: "bg-warn-soft text-body",
    icon: "👨‍🍳",
  },
  ready: { text: "พร้อมเสิร์ฟ", bg: "bg-new-soft text-new-ink", icon: "🔔" },
  completed: {
    text: "เสร็จแล้ว",
    bg: "bg-success-soft text-success",
    icon: "✅",
  },
  cancelled: { text: "ยกเลิก", bg: "bg-danger-soft text-danger", icon: "❌" },
};

function getStatus(status: string) {
  return (
    STATUS_MAP[status] ?? {
      text: status,
      bg: "bg-sand text-body",
      icon: "📋",
    }
  );
}

function getTableNo(tableNo?: string) {
  if (!tableNo) return null;
  // รองรับทั้งค่าดิบ ("3") และรูปแบบเก่า ("โต๊ะ 3")
  const match = tableNo.match(/โต๊ะ\s*(\S+)/);
  return match ? match[1] : tableNo.trim() || null;
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function AdminRestaurantPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updating, setUpdating] = useState(false);
  // จำนวนออเดอร์รอบก่อน — ใช้ ref เพราะ interval ต้องเห็นค่าล่าสุดเสมอ
  const prevCountRef = useRef(0);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dinein/admin/orders`,
        { headers: authHeaders() },
      );
      if (res.ok) {
        const data: Order[] = await res.json();
        const sorted = data.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const prevCount = prevCountRef.current;
        if (silent && sorted.length > prevCount && prevCount > 0) {
          try {
            const audio = new Audio(
              "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczFjlkp9/LpnQyHEBvruHLn2kvGT5wse7TpWcqFTpxsvLWpWUnEzlxtPfaqmMkETd0t/3grGAgDDR3u8U",
            );
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {
            // เบราว์เซอร์บางตัวบล็อกเสียง — ไม่เป็นไร
          }
        }
        prevCountRef.current = sorted.length;
        setOrders(sorted);
      }
    } catch (e) {
      if (!silent) console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.replace("/login");
      return;
    }
    try {
      const user = JSON.parse(userData);
      if (!user.email?.endsWith("@empbakery.com")) {
        Swal.fire({
          icon: "error",
          title: "ไม่มีสิทธิ์เข้าถึง",
          confirmButtonColor: "#a84a0e",
        }).then(() => router.replace("/"));
        return;
      }
    } catch {
      router.replace("/login");
      return;
    }

    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 5000);
    return () => clearInterval(interval);
  }, [router, fetchOrders]);


  // ✅ แก้ fetchOrderDetail — เปลี่ยน URL และ parse ใหม่
  const fetchOrderDetail = async (orderId: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dinein/admin/orders/${orderId}`,
        { headers: authHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data.order);
        setOrderItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const updateStatus = async (orderId: number, orderStatus: string) => {
    const labelMap: Record<string, string> = {
      preparing: "เริ่มทำออเดอร์นี้?",
      ready: "พร้อมเสิร์ฟแล้ว?",
      completed: "ยืนยันเสร็จสิ้น?",
    };

    const result = await Swal.fire({
      icon: "question",
      title: labelMap[orderStatus] || "ยืนยันการเปลี่ยนสถานะ?",
      showCancelButton: true,
      confirmButtonColor: "#a84a0e",
      cancelButtonColor: "#6b5e52",
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    setUpdating(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dinein/admin/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ orderStatus }),
        },
      );
      const data = await res.json();
      if (data.success) {
        await Swal.fire({
          icon: "success",
          title: "อัพเดทสถานะสำเร็จ",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchOrders();
        if (selectedOrder?.id === orderId) fetchOrderDetail(orderId);
      }
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        confirmButtonColor: "#a84a0e",
      });
    } finally {
      setUpdating(false);
    }
  };

  // ✅ ลบข้อมูล dine-in ทั้งหมด (เฉพาะ tb_dinein_orders + tb_dinein_order_items)
  // ไม่กระทบหน้า Manage orders / Top Products
  const deleteAllDineIn = async () => {
    const result = await Swal.fire({
      icon: "warning",
      title: "ลบข้อมูล dine-in ทั้งหมด?",
      html:
        '<div class="text-sm text-subtle">จะลบออเดอร์สั่งในร้านทั้งหมดอย่างถาวร</div>' +
        '<div class="text-sm text-muted mt-2">ยอดขายที่ปิดบิลแล้วในหน้า Manage orders และ Top Products จะไม่ได้รับผลกระทบ</div>',
      input: "text",
      inputPlaceholder: 'พิมพ์ "ลบทั้งหมด" เพื่อยืนยัน',
      showCancelButton: true,
      confirmButtonColor: "#b3261e",
      cancelButtonColor: "#6b5e52",
      confirmButtonText: "ลบถาวร",
      cancelButtonText: "ยกเลิก",
      inputValidator: (value) =>
        value !== "ลบทั้งหมด" ? 'กรุณาพิมพ์ "ลบทั้งหมด" ให้ถูกต้อง' : null,
    });
    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dinein/admin/orders/all`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (res.ok && data.success) {
        await Swal.fire({
          icon: "success",
          title: "ลบข้อมูล dine-in ทั้งหมดแล้ว",
          text: `ลบ ${data.deletedOrders ?? 0} ออเดอร์`,
          timer: 1800,
          showConfirmButton: false,
        });
        setSelectedOrder(null);
        fetchOrders();
      } else {
        Swal.fire({
          icon: "error",
          title: "ลบไม่สำเร็จ",
          text: data.message || "เกิดข้อผิดพลาด",
        });
      }
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเชื่อมต่อได้",
      });
    }
  };

  const cancelOrder = async (orderId: number) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "ยกเลิกออเดอร์?",
      text: "ไม่สามารถย้อนกลับได้",
      showCancelButton: true,
      confirmButtonColor: "#b3261e",
      cancelButtonColor: "#6b5e52",
      confirmButtonText: "ยกเลิกออเดอร์",
      cancelButtonText: "ไม่ยกเลิก",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dinein/admin/orders/${orderId}/cancel`,
        { method: "PUT", headers: authHeaders() },
      );
      const data = await res.json();
      if (data.success) {
        await Swal.fire({
          icon: "success",
          title: "ยกเลิกออเดอร์แล้ว",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchOrders();
        if (selectedOrder?.id === orderId) setSelectedOrder(null);
      }
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        confirmButtonColor: "#a84a0e",
      });
    }
  };

  const getNextActions = (status: string) => {
    switch (status) {
      case "pending":
        return [
          {
            label: "👨‍🍳 เริ่มทำ",
            status: "preparing",
            color: "bg-brick hover:bg-brick-hover text-white",
          },
          {
            label: "❌ ยกเลิก",
            status: "cancelled",
            color: "bg-danger-soft hover:bg-danger-line text-error",
          },
        ];
      case "preparing":
        return [
          {
            label: "🔔 พร้อมเสิร์ฟ",
            status: "ready",
            color: "bg-ink hover:bg-ink text-white",
          },
        ];
      case "ready":
        return [
          {
            label: "✅ เสร็จสิ้น",
            status: "completed",
            color: "bg-ok hover:bg-ok text-white",
          },
        ];
      default:
        return [];
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchStatus =
      filterStatus === "all" || order.orderStatus === filterStatus;
    const matchSearch =
      searchTerm === "" ||
      order.id.toString().includes(searchTerm) ||
      (order.ordCode || "").toUpperCase().includes(searchTerm.toUpperCase()) ||
      order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.tableNo || "").includes(searchTerm);
    return matchStatus && matchSearch;
  });

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.orderStatus === "pending").length,
    preparing: orders.filter((o) => o.orderStatus === "preparing").length,
    ready: orders.filter((o) => o.orderStatus === "ready").length,
    completed: orders.filter((o) => o.orderStatus === "completed").length,
    cancelled: orders.filter((o) => o.orderStatus === "cancelled").length,
  };

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
    <div className="min-h-screen bg-warn-bg py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ink flex items-center gap-3">
              <span className="text-4xl">🍽️</span> Restaurant Orders
            </h1>
            <p className="text-brick mt-1">
              ออเดอร์สั่งในร้านทั้งหมด {orders.length} รายการ
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchOrders()}
              className="flex items-center gap-2 px-4 py-2 bg-brick text-white rounded-xl hover:bg-brick-hover transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              รีเฟรช
            </button>
            <button
              onClick={deleteAllDineIn}
              className="flex items-center gap-2 px-4 py-2 bg-error text-white rounded-xl hover:bg-error transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              ลบ dine-in ทั้งหมด
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {[
            { key: "all", label: "ทั้งหมด", icon: "📋", color: "bg-sand" },
            {
              key: "pending",
              label: "รอเตรียม",
              icon: "⏳",
              color: "bg-warn-soft",
            },
            {
              key: "preparing",
              label: "กำลังทำ",
              icon: "👨‍🍳",
              color: "bg-warn-soft",
            },
            {
              key: "ready",
              label: "พร้อมเสิร์ฟ",
              icon: "🔔",
              color: "bg-new-soft",
            },
            {
              key: "completed",
              label: "เสร็จแล้ว",
              icon: "✅",
              color: "bg-success-soft",
            },
            {
              key: "cancelled",
              label: "ยกเลิก",
              icon: "❌",
              color: "bg-danger-soft",
            },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilterStatus(item.key)}
              className={`p-3 rounded-xl text-center transition-all ${
                filterStatus === item.key
                  ? "ring-2 ring-brick shadow-md"
                  : "hover:shadow-md"
              } ${item.color}`}
            >
              <div className="text-2xl">{item.icon}</div>
              <div className="text-xs font-medium mt-1">{item.label}</div>
              <div className="text-lg font-bold">
                {counts[item.key as keyof typeof counts]}
              </div>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-md">
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหา Order ID, อีเมล, หมายเลขโต๊ะ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-warn-bg border border-line rounded-xl text-ink placeholder-faint focus:outline-none focus:ring-2 focus:ring-brick"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apricot"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-brick">
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    #ID
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    โต๊ะ
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    ลูกค้า
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    ยอดรวม
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    สถานะ
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    วันที่
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-white">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => {
                  const st = getStatus(order.orderStatus);
                  const tNo = getTableNo(order.tableNo);
                  const actions = getNextActions(order.orderStatus);
                  return (
                    <tr
                      key={order.id}
                      className={`border-b border-line hover:bg-warn-bg ${index % 2 === 0 ? "bg-white" : "bg-warn-bg/50"}`}
                    >
                      <td className="px-4 py-4 font-bold text-ink">
                        #{order.ordCode || order.id}
                      </td>
                      <td className="px-4 py-4">
                        {tNo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-warn-soft text-body text-xs font-semibold rounded-full">
                            🪑 โต๊ะ {tNo}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                        {order.note && (
                          <p className="mt-1 max-w-[220px] text-xs text-body break-words">
                            📝 {order.note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-body">{order.email}</p>
                      </td>
                      <td className="px-4 py-4 font-semibold text-brick">
                        ฿{formatPrice(order.total)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${st.bg}`}
                        >
                          {st.icon} {st.text}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-muted">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => fetchOrderDetail(order.id)}
                            className="px-3 py-1.5 bg-warn-soft text-body rounded-lg hover:bg-warn-line text-xs font-medium"
                          >
                            🔍 รายละเอียด
                          </button>
                          {actions.map((action, i) => (
                            <button
                              key={i}
                              disabled={updating}
                              onClick={() =>
                                action.status === "cancelled"
                                  ? cancelOrder(order.id)
                                  : updateStatus(order.id, action.status)
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${action.color}`}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🍽️</div>
              <p className="text-muted">ไม่พบออเดอร์</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 bg-brick rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">
                🍽️ ออเดอร์ #{selectedOrder.ordCode || selectedOrder.id}
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-brick-hover rounded-lg text-white"
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
                <div className="w-10 h-10 border-4 border-brick border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Table + Status */}
                <div className="flex items-center gap-2 flex-wrap">
                  {getTableNo(selectedOrder.tableNo) && (
                    <span className="px-3 py-1 bg-warn-soft text-body rounded-full text-sm font-semibold">
                      🪑 โต๊ะ {getTableNo(selectedOrder.tableNo)}
                    </span>
                  )}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatus(selectedOrder.orderStatus).bg}`}
                  >
                    {getStatus(selectedOrder.orderStatus).icon}{" "}
                    {getStatus(selectedOrder.orderStatus).text}
                  </span>
                </div>

                {selectedOrder.note && (
                  <div className="rounded-xl border border-line bg-warn-bg px-4 py-3">
                    <p className="text-xs font-semibold text-body">หมายเหตุถึงครัว</p>
                    <p className="mt-0.5 text-sm text-ink break-words">{selectedOrder.note}</p>
                  </div>
                )}

                {/* Action buttons */}
                {getNextActions(selectedOrder.orderStatus).length > 0 && (
                  <div className="flex gap-2">
                    {getNextActions(selectedOrder.orderStatus).map(
                      (action, i) => (
                        <button
                          key={i}
                          disabled={updating}
                          onClick={() =>
                            action.status === "cancelled"
                              ? cancelOrder(selectedOrder.id)
                              : updateStatus(selectedOrder.id, action.status)
                          }
                          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${action.color}`}
                        >
                          {action.label}
                        </button>
                      ),
                    )}
                  </div>
                )}

                {/* Items */}
                <div>
                  <p className="text-sm font-semibold text-body mb-3">
                    🛒 รายการสินค้า
                  </p>
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-warn-bg rounded-xl"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-line">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">
                              🍽️
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-body text-sm">
                            {item.productName}
                          </p>
                          {item.selectedOption && (
                            <span className="inline-block px-2 py-0.5 bg-new-soft text-new-ink text-xs rounded-full mt-0.5">
                              {item.selectedOption}
                            </span>
                          )}
                          <p className="text-xs text-muted mt-0.5">
                            ฿{formatPrice(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold text-brick text-sm">
                          ฿{formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-ink">ยอดรวมทั้งหมด</span>
                    <span className="text-brick">
                      ฿{formatPrice(selectedOrder.total)}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    💰 ชำระเงินที่โต๊ะหลังทานเสร็จ
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 py-3 bg-sand text-ink rounded-xl hover:bg-line font-medium"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}