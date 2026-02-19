"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Link from "next/link";

interface CartItem {
  id: number;
  email: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
  category: string;
  image: string;
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

  const API_URL = "https://bakery-backend-production-6fc9.up.railway.app/api/cart";

  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  };

  // ดึงข้อมูลตะกร้า
  const fetchCart = async () => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setCart(data);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  // อัพเดทจำนวนสินค้า
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

      if (response.ok) {
        fetchCart();
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
    } finally {
      setUpdating(null);
    }
  };

  // ลบสินค้าจากตะกร้า
  const removeItem = async (cartId: number) => {
    const token = getToken();
    if (!token) return;

    if (!confirm("ต้องการลบสินค้านี้ออกจากตะกร้าหรือไม่?")) return;

    try {
      const response = await fetch(`${API_URL}/${cartId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchCart();
      }
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  // ล้างตะกร้าทั้งหมด
  const clearCart = async () => {
    const token = getToken();
    if (!token) return;

    if (!confirm("ต้องการล้างตะกร้าทั้งหมดหรือไม่?")) return;

    try {
      const response = await fetch(`${API_URL}/clear`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchCart();
      }
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-900 flex items-center gap-3">
              <span className="text-4xl">🛒</span>
              ตะกร้าสินค้า
            </h1>
            <p className="text-amber-700 mt-1">
              {cart?.totalItems || 0} รายการในตะกร้า
            </p>
          </div>
          {cart && cart.items.length > 0 && (
            <button
              onClick={clearCart}
              className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 border border-red-200"
            >
              <svg
                className="w-5 h-5"
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
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-amber-100">
            <div className="text-8xl mb-6">🛒</div>
            <h2 className="text-2xl font-semibold text-amber-900 mb-2">
              ตะกร้าของคุณว่างเปล่า
            </h2>
            <p className="text-amber-600 mb-6">
              เลือกซื้อสินค้าที่คุณชื่นชอบได้เลย!
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full font-medium hover:shadow-lg transform hover:scale-105 transition-all"
            >
              เลือกซื้อสินค้า
            </button>
          </div>
        )}

        {/* Cart Items */}
        {cart && cart.items.length > 0 && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Items List */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-4 flex gap-4 border border-amber-100"
                >
                  {/* Product Image */}
                  <div className="w-28 h-28 rounded-xl overflow-hidden bg-amber-50 flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        🧁
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <span className="inline-block px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded-full mb-1 capitalize">
                        {item.category}
                      </span>
                      <h3 className="font-semibold text-amber-900 text-lg">
                        {item.productName}
                      </h3>
                      <p className="text-orange-500 font-bold">
                        ฿{item.price.toLocaleString()}
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={updating === item.id || item.quantity <= 1}
                          className="w-9 h-9 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-amber-700"
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
                              d="M20 12H4"
                            />
                          </svg>
                        </button>
                        <span className="w-12 text-center font-semibold text-amber-900 text-lg">
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
                          disabled={updating === item.id}
                          className="w-9 h-9 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center disabled:opacity-50 transition-colors"
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
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <p className="font-bold text-lg text-amber-900">
                          ฿{item.subtotal.toLocaleString()}
                        </p>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <svg
                            className="w-5 h-5"
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
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8 border border-amber-100">
                <h2 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                  <span>📋</span> สรุปคำสั่งซื้อ
                </h2>

                <div className="space-y-3 border-b border-amber-100 pb-4 mb-4">
                  <div className="flex justify-between text-amber-700">
                    <span>จำนวนสินค้า</span>
                    <span>{cart.totalItems} ชิ้น</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>ยอดรวมสินค้า</span>
                    <span>฿{cart.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>ค่าจัดส่ง</span>
                    <span className="text-green-500 font-medium">ฟรี</span>
                  </div>
                </div>

                <div className="flex justify-between text-xl font-bold text-amber-900 mb-6">
                  <span>ยอดรวมทั้งหมด</span>
                  <span className="text-orange-500">
                    ฿{cart.totalAmount.toLocaleString()}
                  </span>
                </div>

                <Link
                  href="/checkout"
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold text-lg hover:shadow-lg transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <span>💳</span>
                  ดำเนินการชำระเงิน
                </Link>

                <button
                  onClick={() => router.push("/")}
                  className="w-full py-3 mt-3 border-2 border-orange-500 text-orange-500 rounded-xl font-medium hover:bg-orange-50 transition-colors"
                >
                  เลือกซื้อสินค้าเพิ่ม
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ☕ About Section - Responsive */}
      <section className="container mx-auto mt-12 sm:mt-16 md:mt-20 px-4 sm:px-6 py-8 sm:py-10 md:py-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-amber-800 mb-3 sm:mb-4">
          Baked with Love ❤️
        </h2>
        <p className="text-gray-600 max-w-3xl mx-auto leading-relaxed text-sm sm:text-base px-2">
          Every pastry, drink, and dessert at My Bakery is crafted with care,
          passion, and the finest ingredients. Our goal is to make every bite
          and sip a moment of happiness. Whether it's cupcakes for celebrations,
          coffee for energy, or cakes for special occasions — we've got you
          covered.
        </p>
      </section>
    </div>
  );
}
