"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Product {
  id: number;
  name: string;
  type: string;
  category: string;
  price: number;
  img: string;
  description?: string;
  stockQuantity?: number;
  isAvailable?: boolean;
}

interface ProductCardProps extends Product {
  onAddToCart?: (product: Product) => void;
  onStockUpdate?: () => void;
}

export default function ProductCard({
  id,
  name,
  type,
  category,
  price,
  img,
  description,
  stockQuantity = 10,
  isAvailable = true,
  onAddToCart,
  onStockUpdate,
}: ProductCardProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStock, setCurrentStock] = useState(stockQuantity);

  const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (adding || added || currentStock <= 0) return;

    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setAdding(true);
    setError(null);

    try {
      const response = await fetch("https://bakery-backend-production-6fc9.up.railway.app/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: id,
          name: name,
          price: price,
          category: category,
          image: img,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAdding(false);
        setAdded(true);

        setCurrentStock((prev) => prev - 1);
        window.dispatchEvent(new Event("cartUpdated"));

        if (onStockUpdate) {
          onStockUpdate();
        }

        setTimeout(() => setAdded(false), 1000);

        if (onAddToCart) {
          onAddToCart({
            id,
            name,
            type,
            category,
            price,
            img,
            description,
            stockQuantity: currentStock - 1,
            isAvailable,
          });
        }
      } else {
        setAdding(false);
        setError(data.error || "เกิดข้อผิดพลาด");
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error("Error:", error);
      setAdding(false);
      setError("ไม่สามารถเชื่อมต่อ server ได้");
      setTimeout(() => setError(null), 3000);
    }
  };

  const isOutOfStock = currentStock <= 0 || !isAvailable;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group flex flex-col h-full">
      <div className="relative overflow-hidden h-56 shrink-0">
        <img
          src={img}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold">
              สินค้าหมด
            </span>
          </div>
        )}

        <div className="absolute top-3 left-3 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md">
          {type}
        </div>

        {currentStock > 0 && currentStock <= 5 && (
          <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-md">
            เหลือ {currentStock} ชิ้น
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 h-14">
          {name}
        </h3>

        <div className="h-10 mb-3">
          {description ? (
            <p className="text-gray-600 text-sm line-clamp-2">{description}</p>
          ) : (
            <div className="h-full"></div>
          )}
        </div>

        <div className="mt-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-amber-600">฿{price}</span>
            <span
              className={`text-xs ${
                currentStock <= 5
                  ? "text-red-500 font-semibold"
                  : "text-gray-500"
              }`}
            >
              คงเหลือ: {currentStock} ชิ้น
            </span>
          </div>

          {error && (
            <div className="mb-3 p-2 bg-red-100 text-red-600 text-sm rounded-lg text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={handleAddToCart}
              disabled={adding || added || isOutOfStock}
              className={`w-full py-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                added
                  ? "bg-green-500 text-white shadow-lg"
                  : adding || isOutOfStock
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg"
              }`}
            >
              {adding ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>กำลังเพิ่ม...</span>
                </>
              ) : added ? (
                <>
                  <svg
                    className="w-5 h-5"
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
                  <span>เพิ่มแล้ว</span>
                </>
              ) : isOutOfStock ? (
                <span>สินค้าหมด</span>
              ) : (
                <>
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
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span>เพิ่มลงตะกร้า</span>
                </>
              )}
            </button>

            {/* ✅ ปุ่ม View Details ลิงก์ไปหน้ารายละเอียด */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/${category}/${encodeURIComponent(name)}`);
              }}
              className="w-full py-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 border-2 border-amber-400 text-amber-700 hover:bg-amber-50 shadow-md hover:shadow-lg"
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span>View Details</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
