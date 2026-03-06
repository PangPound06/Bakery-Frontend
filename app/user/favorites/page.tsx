"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FavoriteItem {
  id: number;
  userId: number;
  productId: number;
  productName: string;
  productImage: string;
  price: number;
  category: string;
  type: string;
}

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchFavorites();
  }, [router]);

  const fetchFavorites = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.id && !user.userId) return;

      const userId = user.id || user.userId;
      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/favorites/user/${userId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setFavorites(data);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (productId: number) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = user.id || user.userId;

      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/favorites/${userId}/${productId}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (data.success) {
        setFavorites((prev) =>
          prev.filter((item) => item.productId !== productId),
        );
      }
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  };

  const addToCart = async (item: FavoriteItem) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://bakery-backend-production-6fc9.up.railway.app/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: item.productId,
          name: item.productName,
          price: item.price,
          category: item.category,
          image: item.productImage,
          quantity: 1,
        }),
      });

      if (response.ok) {
        alert("เพิ่มลงตะกร้าแล้ว! 🛒");
        window.dispatchEvent(new Event("cartUpdated"));
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
    }
  };

  const getImageUrl = (img: string) => {
    if (!img) return "";
    if (img.startsWith("http")) return img;
    return `https://bakery-backend-production-6fc9.up.railway.app${img}`;
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
          <h1 className="text-3xl font-bold text-amber-800">❤️ รายการโปรด</h1>
          <p className="text-amber-600 mt-1">
            สินค้าที่คุณชอบ {favorites.length} รายการ
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
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
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700"
                >
                  <span>🔍</span> ค้นหาคำสั่งซื้อ
                </Link>
                <Link
                  href="/user/favorites"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-100 text-amber-700 font-medium"
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

          {/* Main */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💔</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    ยังไม่มีรายการโปรด
                  </h3>
                  <p className="text-gray-500 mb-4">
                    กดหัวใจ ❤️ ที่หน้ารายละเอียดสินค้าเพื่อเพิ่มเข้ารายการโปรด
                  </p>
                  <Link
                    href="/"
                    className="inline-block px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                  >
                    🛒 ดูสินค้าทั้งหมด
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {favorites.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="relative">
                        <img
                          src={getImageUrl(item.productImage)}
                          alt={item.productName}
                          className="w-full h-40 object-cover"
                        />
                        <button
                          onClick={() => removeFavorite(item.productId)}
                          className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition-colors"
                          title="ลบออกจากรายการโปรด"
                        >
                          ❤️
                        </button>
                        <div className="absolute top-2 left-2 flex gap-1">
                          <span className="px-2 py-1 bg-amber-500 text-white text-xs rounded-full">
                            {item.category}
                          </span>
                          {item.type && (
                            <span className="px-2 py-1 bg-white/90 text-gray-700 text-xs rounded-full">
                              {item.type}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-800 mb-1">
                          {item.productName}
                        </h3>
                        <p className="text-lg font-bold text-amber-600 mb-3">
                          ฿{item.price?.toLocaleString()}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => addToCart(item)}
                            className="flex-1 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
                          >
                            🛒 เพิ่มลงตะกร้า
                          </button>
                          <Link
                            href={`/${item.category}/${encodeURIComponent(item.productName)}`}
                            className="px-4 py-2 border border-amber-400 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium"
                          >
                            ดูสินค้า
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}