"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchOrders();
  }, [router]);

  const fetchOrders = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.email) return;

      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/orders/user?email=${user.email}`,
      );
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
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
      console.error("Error fetching order detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm("ต้องการยกเลิกคำสั่งซื้อนี้หรือไม่?")) return;

    try {
      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/orders/${orderId}/cancel`,
        { method: "PUT" },
      );
      const data = await response.json();
      if (data.success) {
        alert("ยกเลิกคำสั่งซื้อสำเร็จ");
        fetchOrders();
        setSelectedOrder(null);
      } else {
        alert(data.message || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      alert("ไม่สามารถยกเลิกได้");
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

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case "qr_promptpay":
        return "📱 QR PromptPay";
      case "card":
        return "💳 บัตรเครดิต/เดบิต";
      default:
        return method;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok", // ← เพิ่มบรรทัดนี้
    });
  };

  const filteredOrders = orders.filter((order) => {
    if (filterStatus === "all") return true;
    return order.orderStatus === filterStatus;
  });

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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-amber-600 hover:text-amber-700 flex items-center gap-2 mb-4"
          >
            ← กลับหน้าหลัก
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">
            📋 รายการสั่งซื้อ
          </h1>
          <p className="text-gray-500 mt-1">
            คำสั่งซื้อทั้งหมด {orders.length} รายการ
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <nav className="space-y-2">
                <Link
                  href="/user/profile"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700"
                >
                  <span>👤</span> ข้อมูลส่วนตัว
                </Link>
                <Link
                  href="/user/orders"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-100 text-amber-700 font-medium"
                >
                  <span>📋</span> รายการสั่งซื้อ
                </Link>
                <Link
                  href="/user/search-order"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700"
                >
                  <span>🔍</span> ค้นหาคำสั่งซื้อ
                </Link>
                <Link
                  href="/user/favorites"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700"
                >
                  <span>❤️</span> รายการโปรด
                </Link>
                <Link
                  href="/user/settings"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700"
                >
                  <span>⚙️</span> ตั้งค่า
                </Link>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3 space-y-4">
            {/* Filter */}
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all", label: "ทั้งหมด" },
                  { value: "pending", label: "⏳ รอดำเนินการ" },
                  { value: "confirmed", label: "✅ ยืนยันแล้ว" },
                  { value: "shipping", label: "🚚 กำลังจัดส่ง" },
                  { value: "delivered", label: "📦 จัดส่งแล้ว" },
                  { value: "cancelled", label: "❌ ยกเลิก" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setFilterStatus(filter.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterStatus === filter.value
                        ? "bg-amber-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-500 text-lg">ไม่มีคำสั่งซื้อ</p>
                <Link
                  href="/"
                  className="inline-block mt-4 px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
                >
                  🛒 เลือกซื้อสินค้า
                </Link>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const status = getStatusBadge(order.orderStatus);
                const payment = getPaymentBadge(order.paymentStatus);

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    {/* Order Header */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{status.icon}</span>
                        <div>
                          <p className="font-semibold text-gray-800">
                            คำสั่งซื้อ #ORD{String(order.id).padStart(8, "0")}
                          </p>
                          <p className="text-xs text-gray-500">
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
                          className={`px-3 py-1 rounded-full text-xs font-medium ${payment.bg}`}
                        >
                          {payment.text}
                        </span>
                      </div>
                    </div>

                    {/* Order Body */}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">
                            {getPaymentMethodText(order.paymentMethod)}
                          </p>
                          <p className="text-sm text-gray-500">
                            จัดส่งถึง: {order.receiverName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-amber-600">
                            ฿{order.total.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <button
                          onClick={() => fetchOrderDetail(order.id)}
                          className="flex-1 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
                        >
                          🔍 ดูรายละเอียด
                        </button>
                        {(order.orderStatus === "pending" ||
                          order.orderStatus === "confirmed") && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                          >
                            ยกเลิก
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 bg-amber-500 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">
                📋 คำสั่งซื้อ #{selectedOrder.id}
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-amber-600 rounded-lg transition-colors text-white"
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
                <p className="text-gray-500">กำลังโหลด...</p>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">สถานะ</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      getStatusBadge(selectedOrder.orderStatus).bg
                    }`}
                  >
                    {getStatusBadge(selectedOrder.orderStatus).icon}{" "}
                    {getStatusBadge(selectedOrder.orderStatus).text}
                  </span>
                </div>

                {/* Date */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">วันที่สั่งซื้อ</span>
                  <span className="text-sm font-medium text-gray-800">
                    {formatDate(selectedOrder.createdAt)}
                  </span>
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

                {/* Price Summary */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>ยอดรวมสินค้า</span>
                    <span>฿{selectedOrder.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>ค่าจัดส่ง</span>
                    <span className="text-green-600">
                      {selectedOrder.shipping > 0
                        ? `฿${selectedOrder.shipping.toLocaleString()}`
                        : "ฟรี"}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>ยอดรวมทั้งหมด</span>
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
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">วิธีชำระเงิน</span>
                    <span>
                      {getPaymentMethodText(selectedOrder.paymentMethod)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-500">สถานะ</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        getPaymentBadge(selectedOrder.paymentStatus).bg
                      }`}
                    >
                      {getPaymentBadge(selectedOrder.paymentStatus).text}
                    </span>
                  </div>
                </div>

                {/* Shipping Info */}
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

                {/* Cancel Button */}
                {(selectedOrder.orderStatus === "pending" ||
                  selectedOrder.orderStatus === "confirmed") && (
                  <button
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    className="w-full py-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors font-medium"
                  >
                    ❌ ยกเลิกคำสั่งซื้อ
                  </button>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  ปิด
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
