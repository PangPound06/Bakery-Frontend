"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CartLayout from "@/components/cart/CartLayout";
import { formatPrice, shippingFeeFor } from "@/components/cart/cartUtils";
import { useCart } from "@/components/cart/useCart";
import { CART_PAGE, currentCartMode } from "@/lib/cart";
import { useOrderMode } from "@/lib/useOrderMode";

/**
 * ตะกร้าสั่งกลับบ้าน (ออนไลน์) → ไปชำระเงินที่ /checkout
 *
 * ทานในร้านสั่งที่หน้า /dine-in — ลูกค้าที่อยู่โหมดทานในร้านถูกพาไปหน้านั้น
 */
export default function OnlineCartPage() {
  const router = useRouter();
  const mode = useOrderMode();
  const state = useCart("online");

  // อยู่โหมดทานในร้าน → ตะกร้าทานในร้าน (อ่าน localStorage ตรงๆ — รอบ hydrate hook ยังได้ค่าของ server)
  useEffect(() => {
    const current = currentCartMode();
    if (current !== "online") router.replace(CART_PAGE[current]);
  }, [mode, router]);

  const cart = state.cart;

  return (
    <CartLayout
      state={state}
      emptyText="เลือกซื้อสินค้าที่คุณชื่นชอบได้เลย!"
      emptyAction="เลือกซื้อสินค้า"
      summary={cart && <OnlineSummary subtotal={cart.totalAmount} totalItems={cart.totalItems} />}
    />
  );
}

function OnlineSummary({ subtotal, totalItems }: { subtotal: number; totalItems: number }) {
  const router = useRouter();
  const shipping = shippingFeeFor(subtotal);

  return (
    <>
      <h2 className="text-base sm:text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
        <span>📋</span> สรุปคำสั่งซื้อ
      </h2>
      <div className="space-y-2 sm:space-y-3 border-b border-amber-100 pb-4 mb-4">
        <Row label="จำนวนสินค้า" value={`${totalItems} รายการ`} />
        <Row label="ยอดรวมสินค้า" value={`฿${formatPrice(subtotal)}`} />
        <div className="flex justify-between text-amber-700 text-sm sm:text-base">
          <span>ค่าจัดส่ง</span>
          {shipping === 0 ? (
            <span className="text-green-500 font-medium">ฟรี</span>
          ) : (
            <span className="text-red-500 font-medium">฿{shipping}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 text-right">{shippingHint(subtotal)}</p>
      </div>
      <div className="flex justify-between text-lg sm:text-xl font-bold text-amber-900 mb-5">
        <span>ยอดรวมทั้งหมด</span>
        <span className="text-orange-500">฿{formatPrice(subtotal + shipping)}</span>
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
    </>
  );
}

/** บอกว่าสั่งเพิ่มอีกเท่าไรค่าส่งจะลดลง — ขั้นเดียวกับ shippingFeeFor */
const shippingHint = (subtotal: number) => {
  if (subtotal < 100) return `สั่งเพิ่ม ฿${formatPrice(100 - subtotal)} ลดค่าส่งเหลือ ฿20`;
  if (subtotal <= 500) return `สั่งเพิ่ม ฿${formatPrice(501 - subtotal)} ได้รับค่าส่งฟรี`;
  return "🎉 คุณได้รับค่าส่งฟรี!";
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-amber-700 text-sm sm:text-base">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
