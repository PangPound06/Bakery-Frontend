"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import CartItemCard from "./CartItemCard";
import type { useCart } from "./useCart";

interface Props {
  /** ผลจาก useCart ของหน้านั้น */
  state: ReturnType<typeof useCart>;
  /** ป้ายต่อท้ายจำนวนรายการ เช่น "🪑 โต๊ะ 5 · สั่งในร้าน" */
  badge?: ReactNode;
  emptyText: string;
  emptyAction: string;
  /** กล่องสรุปด้านขวา — ต่างกันระหว่างสั่งกลับบ้าน / ทานในร้าน */
  summary: ReactNode;
}

const TRASH_PATH =
  "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16";

/** โครงหน้าตะกร้าที่ใช้ร่วมกัน: หัวข้อ, ตะกร้าว่าง, รายการสินค้า และช่องสำหรับกล่องสรุป */
export default function CartLayout({ state, badge, emptyText, emptyAction, summary }: Props) {
  const router = useRouter();
  const { cart, loading, updatingId, updateQuantity, removeItem, clearAll } = state;

  if (loading) return <CartLoader />;

  const items = cart?.items ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 overflow-x-hidden">
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-amber-900 flex items-center gap-2">
              <span className="text-3xl sm:text-4xl">🛒</span> ตะกร้าสินค้า
            </h1>
            <p className="text-amber-700 mt-1 text-sm sm:text-base">
              {cart?.totalItems || 0} รายการในตะกร้า
              {badge && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                  {badge}
                </span>
              )}
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-200 text-sm whitespace-nowrap"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TRASH_PATH} />
              </svg>
              ล้างตะกร้า
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center border border-amber-100">
            <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">🛒</div>
            <h2 className="text-xl sm:text-2xl font-semibold text-amber-900 mb-2">ตะกร้าของคุณว่างเปล่า</h2>
            <p className="text-amber-600 mb-6 text-sm sm:text-base">{emptyText}</p>
            <button
              onClick={() => router.push("/")}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full font-medium hover:shadow-lg transition-all"
            >
              {emptyAction}
            </button>
          </div>
        ) : (
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-8">
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {items.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  allItems={items}
                  updating={updatingId === item.id}
                  onQuantity={(q) => updateQuantity(item.id, q)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:sticky lg:top-8 border border-amber-100">
                {summary}
              </div>
            </div>
          </div>
        )}
      </div>

      <section className="w-full max-w-6xl mx-auto mt-10 sm:mt-16 px-3 sm:px-6 py-8 sm:py-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-amber-800 mb-3 sm:mb-4">Baked with Love ❤️</h2>
        <p className="text-amber-800 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
          ขนมอบ เครื่องดื่ม และของหวานทุกชิ้นที่ Pound Bakery รังสรรค์ขึ้นด้วยความใส่ใจ ความรัก และส่วนผสมที่ดีที่สุด
          เป้าหมายของเราคือการทำให้ทุกคำที่ลิ้มลอง และทุกจิบ เป็นช่วงเวลาแห่งความสุข
        </p>
      </section>
    </div>
  );
}

function CartLoader() {
  return (
    <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-full animate-spin"
          style={{ borderWidth: 3, borderStyle: "solid", borderColor: "#f59e0b transparent transparent transparent" }}
        />
        <p className="text-amber-700 text-sm font-medium">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );
}
