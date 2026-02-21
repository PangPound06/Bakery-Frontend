"use client";

import { useState } from "react";
import Link from "next/link";

interface OrderItem {
  productName: string;
  price: number;
  quantity: number;
}

interface Order {
  id: number;
  email: string;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
}

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
      const numericPart = searchInput
        .trim()
        .replace("ORD", "")
        .replace(/^0+/, "");

      const res = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/orders/search/${numericPart}`,
      );
      const data = await res.json();

      if (data.success) {
        setOrder(data.order);
        setItems(data.items || []);
      } else {
        setError(data.message || "ไม่พบคำสั่งซื้อ");
      }
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return {
          text: "⏳ รอดำเนินการ",
          color: "text-yellow-600 bg-yellow-50",
        };
      case "confirmed":
        return { text: "✅ ยืนยันแล้ว", color: "text-blue-600 bg-blue-50" };
      case "preparing":
        return {
          text: "👨‍🍳 กำลังเตรียม",
          color: "text-indigo-600 bg-indigo-50",
        };
      case "shipping":
        return {
          text: "🚚 กำลังจัดส่ง",
          color: "text-purple-600 bg-purple-50",
        };
      case "delivered":
        return { text: "📦 จัดส่งแล้ว", color: "text-green-600 bg-green-50" };
      case "cancelled":
        return { text: "❌ ยกเลิก", color: "text-red-600 bg-red-50" };
      default:
        return { text: status, color: "text-gray-600 bg-gray-50" };
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-800">
            🔍 ค้นหาคำสั่งซื้อ
          </h1>
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

          {/* Main Content */}
          <div className="md:col-span-3 space-y-4">
            {/* Search Box */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                กรอกหมายเลขคำสั่งซื้อ
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="เช่น ORD00000029"
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

            {/* Result */}
            {order && (
              <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-amber-800">
                    ORD{String(order.id).padStart(8, "0")}
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusText(order.orderStatus).color}`}
                  >
                    {getStatusText(order.orderStatus).text}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    🛒 รายการสินค้า
                  </p>
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between p-3 bg-amber-50 rounded-lg text-sm"
                      >
                        <span>
                          {item.productName} x{item.quantity}
                        </span>
                        <span className="font-medium text-amber-600">
                          ฿{(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3 flex justify-between font-bold">
                  <span>ยอดรวม</span>
                  <span className="text-amber-600">
                    ฿{order.total.toLocaleString()}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                  <p>
                    <span className="text-gray-500">ผู้รับ:</span>{" "}
                    {order.receiverName}
                  </p>
                  <p>
                    <span className="text-gray-500">โทร:</span>{" "}
                    {order.receiverPhone}
                  </p>
                  <p>
                    <span className="text-gray-500">ที่อยู่:</span>{" "}
                    {order.receiverAddress}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
