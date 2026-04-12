"use client";

import { useState } from "react";
import Link from "next/link";

interface OrderItem {
  id?: number;
  productName: string;
  price: number;
  quantity: number;
  selectedOption?: string | null;
}

interface Order {
  id: number;
  ordCode?: string;
  email: string;
  subtotal: number;
  shipping: number;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  note?: string;
}

const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ✅ ใช้แค่ isPoundOption เพื่อแสดง badge — Backend แปลง quantity ให้แล้ว
const isPoundOption = (opt?: string | null) => opt?.includes("ปอนด์") ?? false;

export default function SearchOrderPage() {
  const [searchInput, setSearchInput] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!searchInput.trim()) {
      setError("กรุณากรอกหมายเลขคำสั่งซื้อ");
      return;
    }
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const res = await fetch(
        `http://localhost:8080/api/orders/search/${searchInput.trim()}`,
      );
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
        setItems(data.items || []);
      } else setError(data.message || "ไม่พบคำสั่งซื้อ");
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
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
      case "cash":
        return "💵 เงินสด";
      default:
        return method;
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const ordCode = order
    ? order.ordCode ||
      `ORD${String((order.id * 104729) % 1000000).padStart(6, "0")}${order.id}`
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/"
            className="text-amber-600 hover:text-amber-700 flex items-center gap-2 mb-4"
          >
            ← กลับหน้าหลัก
          </Link>
          <h1 className="text-3xl font-bold text-amber-800">
            🔍 ค้นหาคำสั่งซื้อ
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="hidden md:block md:col-span-1">
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
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700"
                >
                  <span>📋</span> รายการสั่งซื้อ
                </Link>
                <Link
                  href="/user/search-order"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-100 text-amber-700 font-medium"
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

          <div className="md:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <label className="block text-sm font-medium text-amber-700 mb-2">
                กรอกหมายเลขคำสั่งซื้อ
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="เช่น ORD123456789"
                  className="flex-1 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-amber-800 placeholder-amber-300"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                >
                  {loading ? "⏳" : "ค้นหา"}
                </button>
              </div>
              {error && <p className="text-red-500 text-sm mt-2">⚠️ {error}</p>}
            </div>

            {order && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="flex items-center justify-between p-5 bg-amber-500">
                  <h2 className="text-lg font-bold text-white">
                    📋 คำสั่งซื้อ #{ordCode}
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.orderStatus).bg}`}
                  >
                    {getStatusBadge(order.orderStatus).icon}{" "}
                    {getStatusBadge(order.orderStatus).text}
                  </span>
                </div>

                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">วันที่สั่งซื้อ</span>
                    <span className="font-medium text-amber-700">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      🛒 รายการสินค้า
                    </p>
                    <div className="space-y-2">
                      {items.map((item, i) => {
                        const isPound = isPoundOption(item.selectedOption);
                        // ✅ ใช้ item.quantity ตรงๆ — Backend แปลงให้แล้ว
                        const displayTotal = item.price * item.quantity;
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-amber-700">
                                {item.productName}
                              </p>
                              {item.selectedOption && (
                                <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full mt-0.5">
                                  {item.selectedOption}
                                </span>
                              )}
                              <p className="text-xs text-gray-500 mt-0.5">
                                ฿{formatPrice(item.price)} × {item.quantity}{" "}
                                {isPound ? "ออเดอร์" : "ชิ้น"}
                              </p>
                            </div>
                            <p className="font-semibold text-amber-600">
                              ฿{formatPrice(displayTotal)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm text-amber-800">
                      <span>ยอดรวมสินค้า</span>
                      <span>฿{formatPrice(order.subtotal ?? order.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-amber-800">
                      <span>ค่าจัดส่ง</span>
                      <span
                        className={
                          order.shipping > 0 ? "text-red-500" : "text-green-600"
                        }
                      >
                        {order.shipping > 0
                          ? `฿${order.shipping.toLocaleString()}`
                          : "ฟรี"}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span className="text-amber-800">ยอดรวมทั้งหมด</span>
                      <span className="text-amber-600">
                        ฿{formatPrice(order.total)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      💰 การชำระเงิน
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">วิธีชำระเงิน</span>
                      <span>{getPaymentMethodText(order.paymentMethod)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-500">สถานะ</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentBadge(order.paymentStatus).bg}`}
                      >
                        {getPaymentBadge(order.paymentStatus).text}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      📦 ข้อมูลการจัดส่ง
                    </p>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                      <p>
                        <span className="text-gray-500">ชื่อผู้รับ:</span>{" "}
                        <span className="font-medium">
                          {order.receiverName}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-500">เบอร์โทร:</span>{" "}
                        <span className="font-medium">
                          {order.receiverPhone}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-500">ที่อยู่:</span>{" "}
                        <span className="font-medium">
                          {order.receiverAddress}
                        </span>
                      </p>
                      {order.note && (
                        <p>
                          <span className="text-gray-500">หมายเหตุ:</span>{" "}
                          <span className="font-medium">{order.note}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
