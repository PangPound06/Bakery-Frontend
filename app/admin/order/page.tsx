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
}

interface Order {
  id: number;
  email: string;
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  note: string;
  slipImage: string;
  createdAt: string;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [slipModal, setSlipModal] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const [prevOrderCount, setPrevOrderCount] = useState(0);

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
          text: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
          confirmButtonColor: "#f97316",
        }).then(() => router.replace("/"));
        return;
      }
    } catch {
      router.replace("/login");
      return;
    }

    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders(true);
    }, 2000);

    return () => clearInterval(interval);
  }, [router]);

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(
        "https://bakery-backend-production-6fc9.up.railway.app/api/orders/all",
      );
      if (response.ok) {
        const data = await response.json();

        if (silent && data.length > prevOrderCount && prevOrderCount > 0) {
          try {
            const audio = new Audio(
              "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczFjlkp9/LpnQyHEBvruHLn2kvGT5wse7TpWcqFTpxsvLWpWUnEzlxtPfaqmMkETd0t/3grGAgDDR3u8U",
            );
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}

          if (Notification.permission === "granted") {
            new Notification("🛒 คำสั่งซื้อใหม่!", {
              body: `มีคำสั่งซื้อใหม่เข้ามา (ทั้งหมด ${data.length} รายการ)`,
            });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
          }
        }

        setPrevOrderCount(data.length);
        setOrders(data);
      }
    } catch (error) {
      if (!silent) console.error("Error fetching orders:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchOrderDetail = async (orderId: number) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/orders/${orderId}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedOrder(data.order);
          setOrderItems(data.items || []);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const updateOrderStatus = async (
    orderId: number,
    orderStatus: string,
    paymentStatus?: string,
  ) => {
    setUpdating(true);
    try {
      const body: any = { orderStatus };
      if (paymentStatus) body.paymentStatus = paymentStatus;

      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      const data = await response.json();
      if (data.success) {
        await Swal.fire({
          icon: "success",
          title: "อัพเดทสถานะสำเร็จ",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          fetchOrderDetail(orderId);
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: data.message || "ไม่สามารถอัพเดทสถานะได้",
          confirmButtonColor: "#f97316",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถอัพเดทสถานะได้",
        confirmButtonColor: "#f97316",
      });
    } finally {
      setUpdating(false);
    }
  };

  const cancelOrder = async (orderId: number) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "ยกเลิกคำสั่งซื้อ?",
      text: "Stock จะถูกคืนอัตโนมัติ ต้องการยกเลิกหรือไม่?",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ยกเลิกคำสั่งซื้อ",
      cancelButtonText: "ไม่ยกเลิก",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/orders/${orderId}/cancel`,
        { method: "PUT" },
      );
      const data = await response.json();
      if (data.success) {
        await Swal.fire({
          icon: "success",
          title: "ยกเลิกสำเร็จ",
          text: "ยกเลิกคำสั่งซื้อสำเร็จ (Stock คืนแล้ว)",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          fetchOrderDetail(orderId);
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: data.message || "ไม่สามารถยกเลิกได้",
          confirmButtonColor: "#f97316",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถยกเลิกได้",
        confirmButtonColor: "#f97316",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return {
          text: "รอดำเนินการ",
          bg: "bg-yellow-100 text-yellow-700",
          icon: "⏳",
        };
      case "confirmed":
        return {
          text: "ยืนยันแล้ว",
          bg: "bg-blue-100 text-blue-700",
          icon: "✅",
        };
      case "preparing":
        return {
          text: "กำลังเตรียม",
          bg: "bg-indigo-100 text-indigo-700",
          icon: "👨‍🍳",
        };
      case "shipping":
        return {
          text: "กำลังจัดส่ง",
          bg: "bg-purple-100 text-purple-700",
          icon: "🚚",
        };
      case "delivered":
        return {
          text: "จัดส่งแล้ว",
          bg: "bg-green-100 text-green-700",
          icon: "📦",
        };
      case "cancelled":
        return { text: "ยกเลิก", bg: "bg-red-100 text-red-700", icon: "❌" };
      default:
        return { text: status, bg: "bg-gray-100 text-gray-700", icon: "📋" };
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return { text: "ชำระแล้ว", bg: "bg-green-100 text-green-700" };
      case "pending":
        return { text: "รอตรวจสอบ", bg: "bg-yellow-100 text-yellow-700" };
      case "failed":
        return { text: "ล้มเหลว", bg: "bg-red-100 text-red-700" };
      default:
        return { text: status, bg: "bg-gray-100 text-gray-700" };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(
      dateStr + (dateStr.endsWith("Z") || dateStr.includes("+") ? "" : "Z"),
    );
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    });
  };

  const getNextStatusActions = (order: Order) => {
    const actions: {
      label: string;
      orderStatus: string;
      paymentStatus?: string;
      color: string;
    }[] = [];
    switch (order.orderStatus) {
      case "pending":
        actions.push({
          label: "✅ ยืนยันคำสั่งซื้อ",
          orderStatus: "confirmed",
          paymentStatus: "paid",
          color: "bg-blue-500 hover:bg-blue-600 text-white",
        });
        actions.push({
          label: "❌ ยกเลิก",
          orderStatus: "cancelled",
          color: "bg-red-100 hover:bg-red-200 text-red-600",
        });
        break;
      case "confirmed":
        actions.push({
          label: "👨‍🍳 เตรียมสินค้า",
          orderStatus: "preparing",
          color: "bg-indigo-500 hover:bg-indigo-600 text-white",
        });
        break;
      case "preparing":
        actions.push({
          label: "🚚 จัดส่ง",
          orderStatus: "shipping",
          color: "bg-purple-500 hover:bg-purple-600 text-white",
        });
        break;
      case "shipping":
        actions.push({
          label: "📦 จัดส่งสำเร็จ",
          orderStatus: "delivered",
          color: "bg-green-500 hover:bg-green-600 text-white",
        });
        break;
    }
    return actions;
  };

  const filteredOrders = orders.filter((order) => {
    const matchStatus =
      filterStatus === "all" || order.orderStatus === filterStatus;
    const matchSearch =
      searchTerm === "" ||
      order.id.toString().includes(searchTerm) ||
      order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.receiverName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.orderStatus === "pending").length,
    confirmed: orders.filter((o) => o.orderStatus === "confirmed").length,
    preparing: orders.filter((o) => o.orderStatus === "preparing").length,
    shipping: orders.filter((o) => o.orderStatus === "shipping").length,
    delivered: orders.filter((o) => o.orderStatus === "delivered").length,
    cancelled: orders.filter((o) => o.orderStatus === "cancelled").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-amber-600 font-medium">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-800 flex items-center gap-3">
              <span className="text-4xl">📦</span>Manage orders
            </h1>
            <p className="text-amber-600 mt-1">
              คำสั่งซื้อทั้งหมด {orders.length} รายการ
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { key: "all", label: "ทั้งหมด", icon: "📋", color: "bg-gray-100" },
            {
              key: "pending",
              label: "รอดำเนินการ",
              icon: "⏳",
              color: "bg-yellow-100",
            },
            {
              key: "confirmed",
              label: "ยืนยันแล้ว",
              icon: "✅",
              color: "bg-blue-100",
            },
            {
              key: "preparing",
              label: "กำลังเตรียม",
              icon: "👨‍🍳",
              color: "bg-indigo-100",
            },
            {
              key: "shipping",
              label: "กำลังจัดส่ง",
              icon: "🚚",
              color: "bg-purple-100",
            },
            {
              key: "delivered",
              label: "จัดส่งแล้ว",
              icon: "📦",
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
              className={`p-3 rounded-xl text-center transition-all ${filterStatus === item.key ? "ring-2 ring-amber-500 shadow-md" : "hover:shadow-md"} ${item.color}`}
            >
              <div className="text-2xl">{item.icon}</div>
              <div className="text-xs font-medium mt-1">{item.label}</div>
              <div className="text-lg font-bold">
                {statusCounts[item.key as keyof typeof statusCounts]}
              </div>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-md">
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหา Order ID, อีเมล, ชื่อผู้รับ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-400"
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
                    ลูกค้า
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    ยอดรวม
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    ชำระเงิน
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
                  const status = getStatusBadge(order.orderStatus);
                  const payment = getPaymentBadge(order.paymentStatus);
                  const nextActions = getNextStatusActions(order);

                  return (
                    <tr
                      key={order.id}
                      className={`border-b border-amber-100 hover:bg-amber-50 ${index % 2 === 0 ? "bg-white" : "bg-amber-50/50"}`}
                    >
                      <td className="px-4 py-4 font-bold text-amber-800">
                        #{order.id}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-800 text-sm">
                          {order.receiverName || "-"}
                        </p>
                        <p className="text-xs text-gray-500">{order.email}</p>
                      </td>
                      <td className="px-4 py-4 font-semibold text-amber-600">
                        ฿{order.total.toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${payment.bg}`}
                          >
                            {payment.text}
                          </span>
                          {order.slipImage && (
                            <button
                              onClick={() => {
                                const url = order.slipImage.startsWith("http")
                                  ? order.slipImage
                                  : `https://bakery-backend-production-6fc9.up.railway.app${order.slipImage}`;
                                setSlipModal(url);
                              }}
                              className="block text-xs text-blue-600 hover:underline"
                            >
                              🧾 ดูสลิป
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg}`}
                        >
                          {status.icon} {status.text}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => fetchOrderDetail(order.id)}
                            className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-xs font-medium"
                          >
                            🔍 รายละเอียด
                          </button>
                          {nextActions.map((action, i) => (
                            <button
                              key={i}
                              onClick={() =>
                                action.orderStatus === "cancelled"
                                  ? cancelOrder(order.id)
                                  : updateOrderStatus(
                                      order.id,
                                      action.orderStatus,
                                      action.paymentStatus,
                                    )
                              }
                              disabled={updating}
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
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500">ไม่พบคำสั่งซื้อ</p>
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
                📋 คำสั่งซื้อ #ORD{String(selectedOrder.id).padStart(8, "0")}
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
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Status + Actions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-500">สถานะปัจจุบัน</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedOrder.orderStatus).bg}`}
                    >
                      {getStatusBadge(selectedOrder.orderStatus).icon}{" "}
                      {getStatusBadge(selectedOrder.orderStatus).text}
                    </span>
                  </div>
                  {getNextStatusActions(selectedOrder).length > 0 && (
                    <div className="flex gap-2">
                      {getNextStatusActions(selectedOrder).map((action, i) => (
                        <button
                          key={i}
                          onClick={() =>
                            action.orderStatus === "cancelled"
                              ? cancelOrder(selectedOrder.id)
                              : updateOrderStatus(
                                  selectedOrder.id,
                                  action.orderStatus,
                                  action.paymentStatus,
                                )
                          }
                          disabled={updating}
                          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${action.color}`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    🛒 รายการสินค้า
                  </p>
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-800">
                            {item.productName}
                          </p>
                          <p className="text-xs text-gray-500">
                            ฿{item.price.toLocaleString()} x {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold text-amber-600">
                          ฿{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>ยอดรวมสินค้า</span>
                    <span>฿{selectedOrder.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>ค่าจัดส่ง</span>
                    <span
                      className={
                        selectedOrder.shipping > 0
                          ? "text-red-500"
                          : "text-green-600"
                      }
                    >
                      {selectedOrder.shipping > 0
                        ? `฿${selectedOrder.shipping.toLocaleString()}`
                        : "ฟรี"}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>ยอดรวม</span>
                    <span className="text-amber-600">
                      ฿{selectedOrder.total.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Payment */}
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    💰 การชำระเงิน
                  </p>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">วิธีชำระเงิน</span>
                      <span>
                        {selectedOrder.paymentMethod === "qr_promptpay"
                          ? "📱 QR PromptPay"
                          : "💳 บัตร"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">สถานะ</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentBadge(selectedOrder.paymentStatus).bg}`}
                      >
                        {getPaymentBadge(selectedOrder.paymentStatus).text}
                      </span>
                    </div>
                  </div>
                  {selectedOrder.slipImage && (
                    <button
                      onClick={() => {
                        const url = selectedOrder.slipImage.startsWith("http")
                          ? selectedOrder.slipImage
                          : `https://bakery-backend-production-6fc9.up.railway.app${selectedOrder.slipImage}`;
                        setSlipModal(url);
                      }}
                      className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium w-full"
                    >
                      🧾 ดูสลิปการโอนเงิน
                    </button>
                  )}
                </div>

                {/* Shipping */}
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    📦 ข้อมูลการจัดส่ง
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                    <p>
                      <span className="text-gray-500">ชื่อผู้รับ:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.receiverName}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500">เบอร์โทร:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.receiverPhone}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500">ที่อยู่:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.receiverAddress}
                      </span>
                    </p>
                    {selectedOrder.note && (
                      <p>
                        <span className="text-gray-500">หมายเหตุ:</span>{" "}
                        <span className="font-medium">
                          {selectedOrder.note}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-medium"
                >
                  ปิด
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slip Image Modal */}
      {slipModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setSlipModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-4 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                🧾 สลิปการโอนเงิน
              </h3>
              <button
                onClick={() => setSlipModal(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <img
              src={slipModal}
              alt="Payment Slip"
              className="w-full rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "";
                (e.target as HTMLImageElement).alt = "ไม่สามารถโหลดรูปสลิปได้";
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
