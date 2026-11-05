"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PAYMENT_STATUS } from "@/lib/payment";

/**
 * หน้าหลังชำระเงิน
 *
 * ═══ เรื่องสำคัญที่สุดของหน้านี้ ═══
 * การที่ลูกค้า "มาถึงหน้านี้" ไม่ได้แปลว่าจ่ายเงินสำเร็จ
 * ใครก็พิมพ์ /checkout/success?order_id=123 เข้ามาเองได้
 *
 * สถานะจริงมาจาก webhook ของ Stripe → backend → DB เท่านั้น
 * หน้านี้จึงแค่ "ถาม backend ซ้ำๆ" ว่า order นั้นเป็น paid หรือยัง
 *
 * ═══ ทำไมต้อง poll ═══
 * บัตรเครดิตมักจะ paid ก่อนลูกค้าถูก redirect กลับมาด้วยซ้ำ
 * แต่ PromptPay ยืนยันแบบ asynchronous — อาจช้ากว่าไม่กี่วินาที
 * เลยถามซ้ำทุก 2 วินาที สูงสุดประมาณ 40 วินาที
 *
 * โอนพร้อมเพย์ (แอดมินยืนยัน) จะหยุดที่ "verifying" — รอร้านตรวจยอด อาจเป็นหลักนาทีถึงชั่วโมง
 */

type Phase = "checking" | "paid" | "verifying" | "pending" | "failed" | "notfound";

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 20; // ~40 วินาที

/** useSearchParams() ต้องอยู่ใต้ <Suspense> ไม่งั้น `next build` จะ error */
export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-amber-50" />}>
      <SuccessInner />
    </Suspense>
  );
}

function SuccessInner() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("checking");
  const [ordCode, setOrdCode] = useState("");
  const [total, setTotal] = useState<number | null>(null);
  const attempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const orderId =
      searchParams.get("order_id") || localStorage.getItem("lastOrderId");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const token = localStorage.getItem("token");

    const poll = async () => {
      if (!orderId) {
        setPhase("notfound");
        return;
      }
      attempts.current += 1;

      try {
        const res = await fetch(`${apiUrl}/api/checkout/status/${orderId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.status === 404 || res.status === 401) {
          setPhase("notfound");
          return;
        }

        const data = await res.json();
        if (data.success) {
          if (data.ordCode) setOrdCode(data.ordCode);
          if (typeof data.total === "number") setTotal(data.total);

          if (
            data.paymentStatus === PAYMENT_STATUS.PAID ||
            data.paymentStatus === PAYMENT_STATUS.VERIFYING
          ) {
            setPhase(data.paymentStatus === PAYMENT_STATUS.PAID ? "paid" : "verifying");
            // ตะกร้าถูกล้างที่ backend แล้ว (ได้เงิน / แจ้งโอน) — บอก UI ให้รีเฟรช
            window.dispatchEvent(new Event("cartUpdated"));
            localStorage.removeItem("lastOrderId");
            return;
          }

          if (
            data.paymentStatus === PAYMENT_STATUS.FAILED ||
            data.paymentStatus === PAYMENT_STATUS.EXPIRED
          ) {
            setPhase("failed");
            return;
          }
        }
      } catch {
        /* network สะดุด — ลองใหม่รอบหน้า */
      }

      // ยังไม่ paid → ลองอีกครั้ง
      if (attempts.current < MAX_ATTEMPTS) {
        timer.current = setTimeout(poll, POLL_INTERVAL_MS);
      } else {
        setPhase("pending");
      }
    };

    poll();

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {phase === "checking" && <Checking />}
          {phase === "paid" && <Paid ordCode={ordCode} total={total} />}
          {phase === "verifying" && <Verifying ordCode={ordCode} total={total} />}
          {phase === "pending" && <Pending ordCode={ordCode} />}
          {phase === "failed" && <Failed />}
          {phase === "notfound" && <NotFound />}

          {phase !== "checking" && (
            <div className="space-y-3 mt-6">
              <Link
                href="/user/orders"
                className="block w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
              >
                📋 ดูคำสั่งซื้อของฉัน
              </Link>
              <Link
                href="/"
                className="block w-full py-3 border-2 border-amber-500 text-amber-600 hover:bg-amber-50 font-semibold rounded-xl transition-colors"
              >
                🏠 กลับหน้าหลัก
              </Link>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            🧁 Pound Bakery - อบสดใหม่ทุกวัน ส่งตรงถึงบ้านคุณ
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── สถานะย่อย ──────────────────────────────────────────────

function Checking() {
  return (
    <>
      <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-amber-50">
        <div
          className="w-12 h-12 rounded-full animate-spin"
          style={{
            borderWidth: 3,
            borderStyle: "solid",
            borderColor: "#f59e0b transparent transparent transparent",
          }}
        />
      </div>
      <h1 className="text-2xl font-bold text-amber-700 mb-2">
        กำลังตรวจสอบการชำระเงิน
      </h1>
      <p className="text-amber-800 text-sm">
        กรุณารอสักครู่ อย่าเพิ่งปิดหน้านี้
      </p>
    </>
  );
}

function Paid({ ordCode, total }: { ordCode: string; total: number | null }) {
  return (
    <>
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-6xl">✅</span>
      </div>
      <h1 className="text-3xl font-bold text-amber-700 mb-2">ชำระเงินสำเร็จ!</h1>
      <p className="text-amber-800 mb-6">ขอบคุณที่สั่งซื้อสินค้ากับเรา</p>

      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <p className="text-sm text-gray-500 mb-1">หมายเลขคำสั่งซื้อ</p>
        <p className="text-xl font-bold text-amber-600">{ordCode || "-"}</p>
        {total !== null && (
          <p className="text-sm text-gray-600 mt-2">
            ยอดชำระ ฿
            {total.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>

      <div className="bg-amber-50 rounded-xl p-4 text-left">
        <h3 className="font-semibold text-amber-700 mb-2">📦 ขั้นตอนถัดไป</h3>
        <ul className="text-sm text-amber-800 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>คุณจะได้รับอีเมลยืนยันคำสั่งซื้อ</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>เราจะเตรียมสินค้าและจัดส่งให้เร็วที่สุด</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>ติดตามสถานะได้ที่หน้า &quot;คำสั่งซื้อของฉัน&quot;</span>
          </li>
        </ul>
      </div>
    </>
  );
}

function Verifying({ ordCode, total }: { ordCode: string; total: number | null }) {
  return (
    <>
      <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-6xl">🧾</span>
      </div>
      <h1 className="text-2xl font-bold text-amber-700 mb-2">ได้รับแจ้งโอนแล้ว</h1>
      <p className="text-gray-600 text-sm mb-6">
        ร้านกำลังตรวจสอบยอดโอน เมื่อยืนยันแล้ว สถานะจะเปลี่ยนเป็น &quot;ชำระแล้ว&quot;
        ในหน้า &quot;คำสั่งซื้อของฉัน&quot;
      </p>
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-sm text-gray-500 mb-1">หมายเลขคำสั่งซื้อ</p>
        <p className="text-xl font-bold text-amber-600">{ordCode || "-"}</p>
        {total !== null && (
          <p className="text-sm text-gray-600 mt-2">
            ยอดโอน ฿{total.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>
    </>
  );
}

function Pending({ ordCode }: { ordCode: string }) {
  return (
    <>
      <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-6xl">⏳</span>
      </div>
      <h1 className="text-2xl font-bold text-amber-700 mb-2">
        กำลังรอการยืนยัน
      </h1>
      <p className="text-gray-600 text-sm mb-4">
        ธนาคารอาจใช้เวลาสักครู่ในการยืนยัน หากคุณชำระเงินเรียบร้อยแล้ว
        สถานะจะอัปเดตเองในหน้า &quot;คำสั่งซื้อของฉัน&quot;
      </p>
      {ordCode && (
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-1">หมายเลขคำสั่งซื้อ</p>
          <p className="text-lg font-bold text-amber-600">{ordCode}</p>
        </div>
      )}
    </>
  );
}

function Failed() {
  return (
    <>
      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-6xl">❌</span>
      </div>
      <h1 className="text-2xl font-bold text-red-600 mb-2">
        การชำระเงินไม่สำเร็จ
      </h1>
      <p className="text-gray-600 text-sm">
        คำสั่งซื้อถูกยกเลิกและยังไม่มีการเรียกเก็บเงิน
        คุณสามารถสั่งซื้อใหม่ได้ทุกเมื่อ
      </p>
      <Link
        href="/cart"
        className="inline-block mt-4 text-amber-600 hover:text-amber-700 font-medium"
      >
        ← กลับไปที่ตะกร้า
      </Link>
    </>
  );
}

function NotFound() {
  return (
    <>
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-6xl">🔍</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-700 mb-2">
        ไม่พบคำสั่งซื้อนี้
      </h1>
      <p className="text-gray-600 text-sm">
        ลองตรวจสอบที่หน้า &quot;คำสั่งซื้อของฉัน&quot;
      </p>
    </>
  );
}
