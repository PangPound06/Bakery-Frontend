"use client";

import type { CartItem } from "@/types/cart";
import { canIncrease, FRESH_STOCK, formatPrice, isPoundOption } from "./cartUtils";

interface Props {
  item: CartItem;
  /** ทุกแถวในตะกร้า — ใช้นับสินค้าทำสดรวมทุกตัวเลือก */
  allItems: CartItem[];
  updating: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}

const TRASH_PATH =
  "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16";

/** สินค้า 1 แถวในตะกร้า พร้อมปุ่มเพิ่ม/ลดจำนวนและลบ */
export default function CartItemCard({ item, allItems, updating, onQuantity, onRemove }: Props) {
  const isPound = isPoundOption(item.selectedOption);

  return (
    <div className="bg-white rounded-2xl shadow-md border border-amber-100 p-3 sm:p-4">
      <div className="flex gap-3">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-amber-50 flex-shrink-0">
          {item.image ? (
            <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🧁</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full mb-1 capitalize">
            {item.category}
          </span>
          <h3 className="font-semibold text-amber-900 text-sm sm:text-base leading-tight line-clamp-2">
            {item.productName}
          </h3>
          {item.selectedOption && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
              {item.selectedOption}
            </span>
          )}
          <p className="text-orange-500 font-bold text-sm sm:text-base mt-0.5">฿{formatPrice(item.price)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-amber-50">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => onQuantity(item.quantity - 1)}
            disabled={updating || item.quantity <= 1 || isPound}
            aria-label="ลดจำนวน"
            className="w-8 h-8 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center disabled:opacity-50 transition-colors text-amber-700 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>

          <span className="w-14 text-center font-semibold text-amber-900 text-base">
            {updating ? (
              <span className="inline-block w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>
                {item.quantity}
                {isPound && <span className="text-xs text-gray-400 ml-0.5">ออเดอร์</span>}
              </span>
            )}
          </span>

          <button
            onClick={() => onQuantity(item.quantity + 1)}
            disabled={updating || !canIncrease(item, allItems)}
            aria-label="เพิ่มจำนวน"
            className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center disabled:opacity-50 transition-colors flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right">
            <p className="font-bold text-base sm:text-lg text-amber-900 leading-tight">฿{formatPrice(item.subtotal)}</p>
            <p className="text-xs text-gray-400">
              {item.stock === FRESH_STOCK ? "🥤 ทำสด" : `คงเหลือ: ${item.stock}`}
            </p>
          </div>
          <button
            onClick={onRemove}
            aria-label="ลบสินค้า"
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TRASH_PATH} />
            </svg>
          </button>
        </div>
      </div>

      {isPound && (
        <p className="text-[10px] text-gray-400 mt-2 text-right">* ต้องการเปลี่ยนจำนวน กลับไปหน้าสินค้าและเลือกใหม่</p>
      )}
    </div>
  );
}
