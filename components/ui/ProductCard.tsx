"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProductOption {
  name: string;
  extraPrice: number;
}

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
  options?: string | null; // ✅ JSON string
}

interface ProductCardProps extends Product {
  onAddToCart?: (product: Product) => void;
  onStockUpdate?: () => void;
}

const FRESH_STOCK_VALUE = 9999;
const FRESH_DISPLAY_LIMIT = 10;

const parseOptions = (optionsStr?: string | null): ProductOption[] => {
  if (!optionsStr) return [];
  try {
    return JSON.parse(optionsStr);
  } catch {
    return [];
  }
};

const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
  options,
  onAddToCart,
  onStockUpdate,
}: ProductCardProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStock, setCurrentStock] = useState(stockQuantity);

  // ✅ Options modal state
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ProductOption | null>(
    null,
  );

  const isFresh =
    currentStock === FRESH_STOCK_VALUE || stockQuantity === FRESH_STOCK_VALUE;
  const displayStock = isFresh ? FRESH_DISPLAY_LIMIT : currentStock;
  const isOutOfStock = isFresh ? false : currentStock <= 0 || !isAvailable;
  const productOptions = parseOptions(options);
  const hasOptions = productOptions.length > 0;

  const doAddToCart = async (option: ProductOption | null) => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setAdding(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:8080/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: id,
          name,
          price: price + (option?.extraPrice ?? 0),
          category,
          image: img,
          quantity: 1,
          selectedOption: option ? option.name : null, // ✅ ส่ง selectedOption
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setAdding(false);
        setAdded(true);
        if (!isFresh) setCurrentStock((prev) => prev - 1);
        window.dispatchEvent(new Event("cartUpdated"));
        if (onStockUpdate) onStockUpdate();
        setTimeout(() => setAdded(false), 1000);
        if (onAddToCart)
          onAddToCart({
            id,
            name,
            type,
            category,
            price,
            img,
            description,
            stockQuantity: isFresh ? FRESH_STOCK_VALUE : currentStock - 1,
            isAvailable,
          });
      } else {
        setAdding(false);
        setError(data.error || "เกิดข้อผิดพลาด");
        setTimeout(() => setError(null), 3000);
      }
    } catch {
      setAdding(false);
      setError("ไม่สามารถเชื่อมต่อ server ได้");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleConfirmOption = () => {
    if (hasOptions && !selectedOption) return; // บังคับเลือก
    setShowOptionsModal(false);
    doAddToCart(selectedOption);
  };

  return (
    <>
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
          {!isFresh && currentStock > 0 && currentStock <= 5 && (
            <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-md">
              เหลือ {currentStock} ชิ้น
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col flex-grow">
          <h3 className="text-lg font-bold text-amber-800 mb-2 line-clamp-2 h-14">
            {name}
          </h3>
          <div className="h-10 mb-3">
            {description ? (
              <p className="text-gray-500 text-sm line-clamp-2">
                {description}
              </p>
            ) : (
              <div className="h-full"></div>
            )}
          </div>

          {/* ✅ แสดง options badges */}
          {hasOptions && (
            <div className="flex flex-wrap gap-1 mb-3">
              {productOptions.map((o) => (
                <span
                  key={o.name}
                  className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full border border-purple-200"
                >
                  {o.name}
                  {o.extraPrice > 0 ? ` +฿${o.extraPrice}` : ""}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold text-amber-600">
                ฿{formatPrice(price)}
              </span>
              {isFresh ? (
                <span className="text-xs text-teal-600 font-semibold">
                  🥤 ทำสด
                </span>
              ) : (
                <span
                  className={`text-xs ${currentStock <= 5 ? "text-red-500 font-semibold" : "text-gray-500"}`}
                >
                  คงเหลือ: {displayStock} ชิ้น
                </span>
              )}
            </div>

            {error && (
              <div className="mb-3 p-2 bg-red-100 text-red-600 text-sm rounded-lg text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/${category}/${name.replace(/\s+/g, "-")}`);
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

      {/* ✅ Options Modal */}
      {showOptionsModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowOptionsModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-amber-500 text-white px-6 py-4 rounded-t-2xl">
              <h3 className="font-bold text-lg">เลือกตัวเลือก</h3>
              <p className="text-amber-100 text-sm mt-0.5">{name}</p>
            </div>
            <div className="p-5 space-y-2">
              {productOptions.map((o) => (
                <button
                  key={o.name}
                  type="button"
                  onClick={() => setSelectedOption(o)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                    selectedOption?.name === o.name
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 hover:border-amber-300"
                  }`}
                >
                  <span className="font-medium text-amber-700">{o.name}</span>
                  <span
                    className={`text-sm font-semibold ${o.extraPrice > 0 ? "text-green-600" : "text-gray-500"}`}
                  >
                    {o.extraPrice > 0
                      ? `฿${formatPrice(price + o.extraPrice)} (+฿${formatPrice(o.extraPrice)})`
                      : `฿${formatPrice(price)}`}
                  </span>
                </button>
              ))}
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setShowOptionsModal(false)}
                className="flex-1 py-3 bg-gray-100 text-amber-800 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmOption}
                disabled={!selectedOption}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ✅ เพิ่มลงตะกร้า
                {selectedOption &&
                  ` — ฿${formatPrice(price + selectedOption.extraPrice)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
