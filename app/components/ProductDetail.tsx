"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  type: string;
  description: string;
  stockQuantity: number;
  isAvailable: boolean;
}

interface ProductDetailProps {
  category: string;
  categoryIcon: string;
  categoryLabel: string;
}

export default function ProductDetail({
  category,
  categoryIcon,
  categoryLabel,
}: ProductDetailProps) {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);

  // ตรวจสอบว่าสินค้าอยู่ใน favorites หรือไม่
  const checkFavorite = async (productId: number) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = user.id || user.userId;
      if (!userId) return;

      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/favorites/check/${userId}/${productId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setIsFavorite(data.isFavorite);
      }
    } catch (err) {
      // ไม่ต้อง handle
    }
  };

  const toggleFavorite = async () => {
    if (!product || togglingFav) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = user.id || user.userId;
    if (!userId) return;

    setTogglingFav(true);
    try {
      const response = await fetch(
        "https://bakery-backend-production-6fc9.up.railway.app/api/favorites/toggle",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userId,
            productId: product.id,
            productName: product.name,
            productImage: product.image,
            price: product.price,
            category: product.category,
            type: product.type,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        setIsFavorite(data.action === "added");
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    } finally {
      setTogglingFav(false);
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        // ดึงสินค้าทั้งหมดในหมวดนี้ แล้วหาจากชื่อ
        const productName = decodeURIComponent(params.name as string);
        const response = await fetch(
          `https://bakery-backend-production-6fc9.up.railway.app/api/products/category/${category}`,
        );

        if (response.ok) {
          const data = await response.json();
          const found = data.find(
            (item: Product) =>
              item.name.toLowerCase() === productName.toLowerCase(),
          );

          if (found) {
            setProduct(found);
            checkFavorite(found.id);
          } else {
            setError("ไม่พบสินค้า");
          }
        } else {
          setError("ไม่สามารถโหลดข้อมูลได้");
        }
      } catch (err) {
        setError("ไม่สามารถเชื่อมต่อ server ได้");
      } finally {
        setLoading(false);
      }
    };

    if (params.name) fetchProduct();
  }, [params.name, category]);

  const handleAddToCart = async () => {
    if (!product || adding || added) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    setAdding(true);
    setError("");

    try {
      const response = await fetch("https://bakery-backend-production-6fc9.up.railway.app/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          image: product.image,
          quantity: quantity,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAdded(true);
        setProduct((prev) =>
          prev
            ? { ...prev, stockQuantity: prev.stockQuantity - quantity }
            : null,
        );
        window.dispatchEvent(new Event("cartUpdated"));
        setTimeout(() => setAdded(false), 2000);
      } else {
        setError(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      setError("ไม่สามารถเชื่อมต่อ server ได้");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-amber-600 font-medium">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">ไม่พบสินค้า</h2>
          <p className="text-gray-500 mb-6">
            สินค้าที่คุณกำลังมองหาอาจถูกลบหรือไม่มีอยู่
          </p>
          <Link
            href={`/${category}`}
            className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium"
          >
            ← กลับหน้า {categoryLabel}
          </Link>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.stockQuantity <= 0 || !product.isAvailable;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-amber-600 transition-colors">
            หน้าหลัก
          </Link>
          <span>/</span>
          <Link
            href={`/${category}`}
            className="hover:text-amber-600 transition-colors"
          >
            {categoryIcon} {categoryLabel}
          </Link>
          <span>/</span>
          <span className="text-amber-700 font-medium">{product.name}</span>
        </nav>
      </div>

      {/* Product Detail */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Image */}
            <div className="relative">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-[400px] lg:h-full object-cover"
              />

              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="bg-red-600 text-white px-6 py-3 rounded-xl text-xl font-bold">
                    สินค้าหมด
                  </span>
                </div>
              )}

              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className="bg-amber-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                  {product.type}
                </span>
                <span className="bg-white/90 backdrop-blur text-gray-700 px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                  {categoryIcon} {product.category}
                </span>
              </div>

              {product.stockQuantity > 0 && product.stockQuantity <= 5 && (
                <div className="absolute top-4 right-4">
                  <span className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg animate-pulse">
                    เหลือ {product.stockQuantity} ชิ้น!
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-8 lg:p-10 flex flex-col">
              <h1 className="text-3xl lg:text-4xl font-bold text-amber-800 mb-3">
                {product.name}
              </h1>

              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl font-bold text-amber-600">
                  ฿{product.price.toLocaleString()}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isOutOfStock
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {isOutOfStock ? "สินค้าหมด" : "พร้อมขาย"}
                </span>
                {/* ปุ่มหัวใจ */}
                <button
                  onClick={toggleFavorite}
                  disabled={togglingFav}
                  className={`ml-auto w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md ${
                    isFavorite
                      ? "bg-red-50 hover:bg-red-100"
                      : "bg-gray-50 hover:bg-gray-100"
                  } disabled:opacity-50`}
                  title={
                    isFavorite ? "ลบออกจากรายการโปรด" : "เพิ่มเข้ารายการโปรด"
                  }
                >
                  <span className="text-2xl">{isFavorite ? "❤️" : "🤍"}</span>
                </button>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  📝 รายละเอียดสินค้า
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {product.description || "ไม่มีรายละเอียดเพิ่มเติม"}
                </p>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500 mb-1">หมวดหมู่</p>
                  <p className="font-semibold text-amber-600 capitalize">
                    {categoryIcon} {product.category}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500 mb-1">ประเภท</p>
                  <p className="font-semibold text-amber-600">{product.type}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500 mb-1">คงเหลือ</p>
                  <p
                    className={`font-semibold ${
                      product.stockQuantity <= 5
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {product.stockQuantity} ชิ้น
                  </p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500 mb-1">สถานะ</p>
                  <p
                    className={`font-semibold ${
                      isOutOfStock ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {isOutOfStock ? "❌ หมด" : "✅ พร้อมขาย"}
                  </p>
                </div>
              </div>

              {/* Add to Cart */}
              <div className="mt-auto">
                {error && (
                  <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-xl text-center text-sm">
                    ⚠️ {error}
                  </div>
                )}

                {!isOutOfStock && (
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-gray-700 font-medium">จำนวน:</span>
                    <div className="flex items-center border-2 border-amber-300 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-lg transition-colors"
                      >
                        −
                      </button>
                      <span className="px-6 py-2 font-bold text-gray-800 min-w-[60px] text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() =>
                          setQuantity(
                            Math.min(product.stockQuantity, quantity + 1),
                          )
                        }
                        className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-lg transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm text-gray-500">
                      (สูงสุด {product.stockQuantity} ชิ้น)
                    </span>
                  </div>
                )}

                <button
                  onClick={handleAddToCart}
                  disabled={adding || added || isOutOfStock}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                    added
                      ? "bg-green-500 text-white shadow-lg"
                      : adding || isOutOfStock
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl"
                  }`}
                >
                  {adding ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>กำลังเพิ่ม...</span>
                    </>
                  ) : added ? (
                    <>
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>เพิ่มลงตะกร้าแล้ว!</span>
                    </>
                  ) : isOutOfStock ? (
                    <span>สินค้าหมด</span>
                  ) : (
                    <>
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
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span>
                        เพิ่มลงตะกร้า — ฿
                        {(product.price * quantity).toLocaleString()}
                      </span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => router.back()}
                  className="w-full mt-3 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  ← ย้อนกลับ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}