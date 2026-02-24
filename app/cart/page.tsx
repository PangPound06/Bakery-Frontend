"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";

interface CartItem {
  id: number;
  email: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
  category: string;
  image: string;
  stock: number;
}

interface CartResponse {
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
}

export default function CartPage() {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const router = useRouter();

  const API_URL =
    "https://bakery-backend-production-6fc9.up.railway.app/api/cart";

  const getToken = () => {
    if (typeof window !== "undefined") return localStorage.getItem("token");
    return null;
  };

  const getShippingFee = (total: number) => {
    if (total < 100) return 50;
    if (total <= 500) return 20;
    return 0;
  };

  const fetchCart = async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }
      if (response.ok) setCart(await response.json());
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (cartId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const token = getToken();
    if (!token) return;
    setUpdating(cartId);
    try {
      const response = await fetch(`${API_URL}/${cartId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      if (response.ok) fetchCart();
    } catch (error) {
      console.error("Error updating quantity:", error);
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (cartId: number) => {
    const token = getToken();
    if (!token) return;
    const result = await Swal.fire({
      title: "ลบสินค้า?",
      text: "ต้องการลบสินค้านี้ออกจากตะกร้าหรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;
    try {
      const response = await fetch(`${API_URL}/${cartId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) fetchCart();
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const clearCart = async () => {
    const token = getToken();
    if (!token) return;
    const result = await Swal.fire({
      title: "ล้างตะกร้า?",
      text: "ต้องการลบสินค้าทั้งหมดออกจากตะกร้าหรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ล้างตะกร้า",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;
    try {
      const response = await fetch(`${API_URL}/clear`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) fetchCart();
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-orange-600 font-medium">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 overflow-x-hidden">
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-amber-900 flex items-center gap-2">
              <span className="text-3xl sm:text-4xl">🛒</span>
              ตะกร้าสินค้า
            </h1>
            <p className="text-amber-700 mt-1 text-sm sm:text-base">
              {cart?.totalItems || 0} รายการในตะกร้า
            </p>
          </div>
          {cart && cart.items.length > 0 && (
            <button
              onClick={clearCart}
              className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-200 text-sm whitespace-nowrap"
            >
              <svg
                className="w-4 h-4 flex-shrink-0"
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
              ล้างตะกร้า
            </button>
          )}
        </div>

        {/* Empty Cart */}
        {(!cart || cart.items.length === 0) && (
          <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center border border-amber-100">
            <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">🛒</div>
            <h2 className="text-xl sm:text-2xl font-semibold text-amber-900 mb-2">
              ตะกร้าของคุณว่างเปล่า
            </h2>
            <p className="text-amber-600 mb-6 text-sm sm:text-base">
              เลือกซื้อสินค้าที่คุณชื่นชอบได้เลย!
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full font-medium hover:shadow-lg transition-all"
            >
              เลือกซื้อสินค้า
            </button>
          </div>
        )}

        {/* Cart Items */}
        {cart && cart.items.length > 0 && (
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-8">
            {/* Items List */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-md border border-amber-100 p-3 sm:p-4"
                >
                  {/* Top: Image + Name + Price */}
                  <div className="flex gap-3">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-amber-50 flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          🧁
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full mb-1 capitalize">
                        {item.category}
                      </span>
                      <h3 className="font-semibold text-amber-900 text-sm sm:text-base leading-tight line-clamp-2">
                        {item.productName}
                      </h3>
                      <p className="text-orange-500 font-bold text-sm sm:text-base mt-0.5">
                        ฿{item.price.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Bottom: Qty + Subtotal + Stock + Delete */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-amber-50">
                    {/* Quantity */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        disabled={updating === item.id || item.quantity <= 1}
                        className="w-8 h-8 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center disabled:opacity-50 transition-colors text-amber-700 flex-shrink-0"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 12H4"
                          />
                        </svg>
                      </button>
                      <span className="w-7 text-center font-semibold text-amber-900 text-base">
                        {updating === item.id ? (
                          <span className="inline-block w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          item.quantity
                        )}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        disabled={
                          updating === item.id || item.quantity >= item.stock
                        }
                        className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center disabled:opacity-50 transition-colors flex-shrink-0"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="text-right">
                        <p className="font-bold text-base sm:text-lg text-amber-900 leading-tight">
                          ฿{item.subtotal.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          คงเหลือ: {item.stock}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                      >
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5"
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
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:sticky lg:top-8 border border-amber-100">
                <h2 className="text-base sm:text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                  <span>📋</span> สรุปคำสั่งซื้อ
                </h2>

                <div className="space-y-2 sm:space-y-3 border-b border-amber-100 pb-4 mb-4">
                  <div className="flex justify-between text-amber-700 text-sm sm:text-base">
                    <span>จำนวนสินค้า</span>
                    <span>{cart.totalItems} ชิ้น</span>
                  </div>
                  <div className="flex justify-between text-amber-700 text-sm sm:text-base">
                    <span>ยอดรวมสินค้า</span>
                    <span>฿{cart.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-amber-700 text-sm sm:text-base">
                    <span>ค่าจัดส่ง</span>
                    {getShippingFee(cart.totalAmount) === 0 ? (
                      <span className="text-green-500 font-medium">ฟรี</span>
                    ) : (
                      <span className="text-red-500 font-medium">
                        ฿{getShippingFee(cart.totalAmount)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 text-right">
                    {cart.totalAmount < 100 &&
                      `สั่งเพิ่ม ฿${100 - cart.totalAmount} ลดค่าส่งเหลือ ฿20`}
                    {cart.totalAmount >= 100 &&
                      cart.totalAmount <= 500 &&
                      `สั่งเพิ่ม ฿${501 - cart.totalAmount} ได้รับค่าส่งฟรี`}
                    {cart.totalAmount > 500 && "🎉 คุณได้รับค่าส่งฟรี!"}
                  </p>
                </div>

                <div className="flex justify-between text-lg sm:text-xl font-bold text-amber-900 mb-5">
                  <span>ยอดรวมทั้งหมด</span>
                  <span className="text-orange-500">
                    ฿
                    {(
                      cart.totalAmount + getShippingFee(cart.totalAmount)
                    ).toLocaleString()}
                  </span>
                </div>

                <Link
                  href="/checkout"
                  className="w-full py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold text-sm sm:text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>💳</span> ดำเนินการชำระเงิน
                </Link>

                <button
                  onClick={() => router.push("/")}
                  className="w-full py-2.5 sm:py-3 mt-3 border-2 border-orange-500 text-orange-500 rounded-xl font-medium hover:bg-orange-50 transition-colors text-sm sm:text-base"
                >
                  เลือกซื้อสินค้าเพิ่ม
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* About Section */}
      <section className="w-full max-w-6xl mx-auto mt-10 sm:mt-16 px-3 sm:px-6 py-8 sm:py-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-amber-800 mb-3 sm:mb-4">
          Baked with Love ❤️
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
          ขนมอบ เครื่องดื่ม และของหวานทุกชิ้นที่ My Bakery
          รังสรรค์ขึ้นด้วยความใส่ใจ ความรัก และส่วนผสมที่ดีที่สุด
          เป้าหมายของเราคือการทำให้ทุกคำที่ลิ้มลอง และทุกจิบ
          เป็นช่วงเวลาแห่งความสุข
        </p>
      </section>
    </div>
  );
}