"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

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
  tableNo?: string; // ← เปลี่ยนจาก note
  createdAt: string;
}

const STATUS_MAP: Record<string, { text: string; bg: string; icon: string }> = {
  pending: {
    text: "กำลังเตรียม",
    bg: "bg-amber-100 text-amber-700",
    icon: "⏳",
  },
  preparing: {
    text: "กำลังทำ",
    bg: "bg-orange-100 text-orange-700",
    icon: "👨‍🍳",
  },
  ready: { text: "พร้อมเสิร์ฟ", bg: "bg-blue-100 text-blue-700", icon: "🔔" },
  completed: {
    text: "เสร็จแล้ว",
    bg: "bg-green-100 text-green-700",
    icon: "✅",
  },
  cancelled: { text: "ยกเลิก", bg: "bg-red-100 text-red-700", icon: "❌" },
};

function getStatus(status: string) {
  return (
    STATUS_MAP[status] ?? {
      text: status,
      bg: "bg-gray-100 text-gray-700",
      icon: "📋",
    }
  );
}

function getTableNo(note?: string) {
  if (!note) return null;
  const match = note.match(/โต๊ะ\s*(\S+)/);
  return match ? match[1] : null;
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
  const [prevCount, setPrevCount] = useState(0);

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
          confirmButtonColor: "#f97316",
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
  }, [router]);

  // ✅ แก้ fetchOrders — เอา filter ออก
  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(
        "${process.env.NEXT_PUBLIC_API_URL}/api/dinein/admin/orders",
      );
      if (res.ok) {
        const data: Order[] = await res.json();
        const sorted = data.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        if (silent && sorted.length > prevCount && prevCount > 0) {
          try {
            const audio = new Audio(
              "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczFjlkp9/LpnQyHEBvruHLn2kvGT5wse7TpWcqFTpxsvLWpWUnEzlxtPfaqmMkETd0t/3grGAgDDR3u8U",
            );
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}
        }
        setPrevCount(sorted.length);
        setOrders(sorted);
      }
    } catch (e) {
      if (!silent) console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // ✅ แก้ fetchOrderDetail — เปลี่ยน URL และ parse ใหม่
  const fetchOrderDetail = async (orderId: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dinein/admin/orders/${orderId}`,
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
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#6b7280",
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
          headers: { "Content-Type": "application/json" },
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
        confirmButtonColor: "#f97316",
      });
    } finally {
      setUpdating(false);
    }
  };

  const cancelOrder = async (orderId: number) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "ยกเลิกออเดอร์?",
      text: "ไม่สามารถย้อนกลับได้",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ยกเลิกออเดอร์",
      cancelButtonText: "ไม่ยกเลิก",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dinein/admin/orders/${orderId}/cancel`,
        { method: "PUT" },
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
        confirmButtonColor: "#f97316",
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
            color: "bg-orange-500 hover:bg-orange-600 text-white",
          },
          {
            label: "❌ ยกเลิก",
            status: "cancelled",
            color: "bg-red-100 hover:bg-red-200 text-red-600",
          },
        ];
      case "preparing":
        return [
          {
            label: "🔔 พร้อมเสิร์ฟ",
            status: "ready",
            color: "bg-blue-500 hover:bg-blue-600 text-white",
          },
        ];
      case "ready":
        return [
          {
            label: "✅ เสร็จสิ้น",
            status: "completed",
            color: "bg-green-500 hover:bg-green-600 text-white",
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
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-amber-600 font-medium">กำลังโหลด...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-amber-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-800 flex items-center gap-3">
              <span className="text-4xl">🍽️</span> Restaurant Orders
            </h1>
            <p className="text-amber-600 mt-1">
              ออเดอร์สั่งในร้านทั้งหมด {orders.length} รายการ
            </p>
          </div>
          <button
            onClick={() => fetchOrders()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
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
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {[
            { key: "all", label: "ทั้งหมด", icon: "📋", color: "bg-gray-100" },
            {
              key: "pending",
              label: "รอเตรียม",
              icon: "⏳",
              color: "bg-amber-100",
            },
            {
              key: "preparing",
              label: "กำลังทำ",
              icon: "👨‍🍳",
              color: "bg-orange-100",
            },
            {
              key: "ready",
              label: "พร้อมเสิร์ฟ",
              icon: "🔔",
              color: "bg-blue-100",
            },
            {
              key: "completed",
              label: "เสร็จแล้ว",
              icon: "✅",
              color: "bg-green-100",
            },
            {
              key: "cancelled",
              label: "ยกเลิก",
              icon: "❌",
              color: "bg-red-100",
            },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilterStatus(item.key)}
              className={`p-3 rounded-xl text-center transition-all ${
                filterStatus === item.key
                  ? "ring-2 ring-amber-500 shadow-md"
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
              className="w-full px-4 py-3 pl-12 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400"
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
                <tr className="bg-amber-500">
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    #ID
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    โต๊ะ / ลูกค้า
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
                      className={`border-b border-amber-100 hover:bg-amber-50 ${index % 2 === 0 ? "bg-white" : "bg-amber-50/50"}`}
                    >
                      <td className="px-4 py-4 font-bold text-amber-800">
                        #{order.ordCode || order.id}
                      </td>
                      <td className="px-4 py-4">
                        {tNo && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full mb-1">
                            🪑 โต๊ะ {tNo}
                          </span>
                        )}
                        <p className="text-xs text-gray-500">{order.email}</p>
                      </td>
                      <td className="px-4 py-4 font-semibold text-amber-600">
                        ฿{formatPrice(order.total)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${st.bg}`}
                        >
                          {st.icon} {st.text}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => fetchOrderDetail(order.id)}
                            className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-xs font-medium"
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
              <p className="text-gray-500">ไม่พบออเดอร์</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 bg-amber-500 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">
                🍽️ ออเดอร์ #{selectedOrder.ordCode || selectedOrder.id}
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-amber-600 rounded-lg text-white"
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
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Table + Status */}
                <div className="flex items-center gap-2 flex-wrap">
                  {getTableNo(selectedOrder.tableNo) && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
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
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    🛒 รายการสินค้า
                  </p>
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-amber-100">
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
                          <p className="font-medium text-amber-700 text-sm">
                            {item.productName}
                          </p>
                          {item.selectedOption && (
                            <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full mt-0.5">
                              {item.selectedOption}
                            </span>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">
                            ฿{formatPrice(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold text-amber-600 text-sm">
                          ฿{formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-amber-800">ยอดรวมทั้งหมด</span>
                    <span className="text-amber-600">
                      ฿{formatPrice(selectedOrder.total)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    💰 ชำระเงินที่โต๊ะหลังทานเสร็จ
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 font-medium"
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
