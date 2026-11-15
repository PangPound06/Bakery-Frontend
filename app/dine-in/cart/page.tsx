"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import CartLayout from "@/components/cart/CartLayout";
import { formatPrice } from "@/components/cart/cartUtils";
import { useCart } from "@/components/cart/useCart";
import { authHeaders, getTableNo } from "@/lib/auth";
import { CART_PAGE, currentCartMode } from "@/lib/cart";
import { DINING_SESSION_CHANGED, formatDuration, useBuffetTimer, type BuffetTimer } from "@/lib/diningSession";
import { useOrderMode, useStoredValue } from "@/lib/useOrderMode";

/**
 * ตะกร้าทานในร้าน → ส่งเข้าครัว (จ่ายเงินทีหลังตอนเรียกเก็บบิล)
 *
 * ราคาและรายการคิดที่ backend จากตะกร้าทานในร้าน หน้านี้ส่งแค่เลขโต๊ะกับประเภทการทาน
 * บุฟเฟต์หมดเวลาแล้วปุ่มสั่งกดไม่ได้ (backend ปฏิเสธด้วยอยู่แล้ว)
 */
export default function DineInCartPage() {
  const router = useRouter();
  const mode = useOrderMode();
  const tableNo = useStoredValue("tableNo");
  const dineType = useStoredValue("dineType");
  const state = useCart("dinein");
  const buffet = useBuffetTimer(dineType === "buffet", tableNo);

  // ไม่ได้อยู่โหมดทานในร้าน → ตะกร้าออนไลน์ / ยังไม่ได้เลือกโต๊ะ → หน้าเลือกโหมด
  // อ่าน localStorage ตรงๆ ใน effect — ค่าจาก hook รอบ hydrate ยังเป็นค่าว่างของฝั่ง server
  useEffect(() => {
    const current = currentCartMode();
    if (current !== "dinein") router.replace(CART_PAGE[current]);
    else if (!getTableNo()) router.replace("/order-mode");
  }, [mode, router]);

  const cart = state.cart;

  return (
    <CartLayout
      state={state}
      badge={`🪑 โต๊ะ ${tableNo} · สั่งในร้าน`}
      emptyText="เลือกเมนูที่อยากทานได้เลย!"
      emptyAction="เลือกเมนูเพิ่ม"
      summary={
        cart && (
          <DineInSummary
            tableNo={tableNo}
            dineType={dineType}
            subtotal={cart.totalAmount}
            totalItems={cart.totalItems}
            buffet={buffet}
            onFailed={state.refresh}
          />
        )
      }
    />
  );
}

interface SummaryProps {
  tableNo: string;
  dineType: string;
  subtotal: number;
  totalItems: number;
  buffet: BuffetTimer | null;
  /** ส่งไม่สำเร็จ — ราคา/stock อาจเปลี่ยน ให้โหลดตะกร้าใหม่ */
  onFailed: () => void;
}

function DineInSummary({ tableNo, dineType, subtotal, totalItems, buffet, onFailed }: SummaryProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const buffetOver = buffet?.expired ?? false;

  const submit = async () => {
    if (submitting || buffetOver) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dinein/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        // ประเภทการทานใช้เฉพาะออเดอร์แรก — backend ล็อกตามมื้อและตัดสินเรื่องเวลาบุฟเฟต์เอง
        body: JSON.stringify({ tableNo, dineType: dineType || "alacarte" }),
      });
      const data = await res.json().catch(() => ({}));
      // ออเดอร์แรกของบุฟเฟต์ = เริ่มนับเวลา / ถูกปฏิเสธเพราะหมดเวลา = โหลดเวลาใหม่
      window.dispatchEvent(new Event(DINING_SESSION_CHANGED));

      if (!res.ok || !data.success) {
        Swal.fire("เกิดข้อผิดพลาด", data.message || "ไม่สามารถสั่งได้", "error");
        onFailed();
        return;
      }

      await Swal.fire({
        title: "ส่งรายการเข้าครัวแล้ว! 🍳",
        html: `
          <div style="text-align:center">
            <p style="color:#78716C;margin-bottom:8px">โต๊ะ ${tableNo} · ${totalItems} รายการ · ฿${formatPrice(data.total ?? subtotal)}</p>
            <p style="color:#16A34A;font-weight:600">ร้านกำลังทำอาหารให้คุณ</p>
          </div>
        `,
        icon: "success",
        confirmButtonColor: "#f97316",
        confirmButtonText: "สั่งเพิ่ม",
        timer: 3000,
        showConfirmButton: true,
      });
      router.push("/"); // กลับไปหน้าเมนูเพื่อสั่งเพิ่ม
    } catch (error) {
      console.error("ส่งออเดอร์เข้าครัวไม่สำเร็จ:", error);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🪑</span>
        <div>
          <h2 className="text-base sm:text-xl font-bold text-amber-900">สั่งในร้าน</h2>
          <p className="text-xs text-amber-600">
            โต๊ะ {tableNo}
            {dineType === "buffet" ? " · 🍱 Buffet" : " · 🍜 A la carte"}
          </p>
        </div>
      </div>

      <div className="space-y-2 border-b border-amber-100 pb-4 mb-4">
        <div className="flex justify-between text-amber-700 text-sm sm:text-base">
          <span>จำนวนรายการ</span>
          <span>{totalItems} รายการ</span>
        </div>
        <div className="flex justify-between text-amber-700 text-sm sm:text-base">
          <span>ยอดรวม</span>
          <span>฿{formatPrice(subtotal)}</span>
        </div>
      </div>

      <div className="flex justify-between text-lg sm:text-xl font-bold text-amber-900 mb-1">
        <span>ยอดรวมทั้งหมด</span>
        <span className="text-orange-500">฿{formatPrice(subtotal)}</span>
      </div>
      <p className="text-xs text-gray-400 mb-5 text-right">💰 ชำระเงินที่โต๊ะหลังทานเสร็จ</p>

      {buffet && (
        <p className={`text-xs mb-3 text-center font-medium ${buffetOver ? "text-red-600" : "text-amber-700"}`}>
          {buffet.notStarted
            ? `🍱 บุฟเฟต์สั่งได้ ${buffet.totalMinutes} นาที เริ่มนับเมื่อสั่งรอบแรก`
            : buffetOver
              ? `หมดเวลาสั่งบุฟเฟต์ ${buffet.totalMinutes} นาทีแล้ว — เรียกเก็บเงินได้ที่หน้าออเดอร์`
              : `⏱ เหลือเวลาสั่งบุฟเฟต์ ${formatDuration(buffet.secondsLeft)}`}
        </p>
      )}

      <button
        onClick={submit}
        disabled={submitting || buffetOver}
        className="w-full py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold text-sm sm:text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {buffetOver ? (
          <>⏱ หมดเวลาบุฟเฟต์แล้ว</>
        ) : submitting ? (
          <>
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            กำลังส่ง...
          </>
        ) : (
          <>
            <span>🍳</span> สั่ง {totalItems} รายการ
          </>
        )}
      </button>

      <button
        onClick={() => router.push("/")}
        className="w-full py-2.5 sm:py-3 mt-3 border-2 border-orange-500 text-orange-500 rounded-xl font-medium hover:bg-orange-50 transition-colors text-sm sm:text-base"
      >
        เลือกเมนูเพิ่ม
      </button>
    </>
  );
}
