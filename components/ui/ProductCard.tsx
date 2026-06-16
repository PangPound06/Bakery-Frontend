"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TiltCard from "@/components/ui/TiltCard";

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
  const [currentStock, setCurrentStock] = useState(stockQuantity);

  const isFresh =
    currentStock === FRESH_STOCK_VALUE || stockQuantity === FRESH_STOCK_VALUE;
  const displayStock = isFresh ? FRESH_DISPLAY_LIMIT : currentStock;
  const isOutOfStock = isFresh ? false : currentStock <= 0 || !isAvailable;
  const productOptions = parseOptions(options);
  const hasOptions = productOptions.length > 0;

  return (
    <>
      <TiltCard>
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

        <div className="p-4 sm:p-5 flex flex-col flex-grow">
          <h3 className="text-base sm:text-base font-bold text-amber-800 mb-2 line-clamp-2 h-14">
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

          <div className="mt-auto pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-lg sm:text-xl font-extrabold text-amber-600 leading-none whitespace-nowrap">
                ฿{formatPrice(price)}
              </span>
              {isFresh ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded-full whitespace-nowrap">
                  🥤 ทำสด
                </span>
              ) : (
                <span
                  className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${currentStock <= 5 ? "text-red-600 bg-red-50" : "text-emerald-700 bg-emerald-50"}`}
                >
                  เหลือ {displayStock} ชิ้น
                </span>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/${category}/${name.replace(/\s+/g, "-")}`);
                }}
                className="w-full py-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 bg-amber-500 text-white hover:bg-amber-600 shadow-md hover:shadow-lg"
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
      </TiltCard>
    </>
  );
}