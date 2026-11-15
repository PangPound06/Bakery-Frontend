"use client";

import { useEffect, useRef, useState } from "react";
import { pollPaymentStatus } from "@/lib/paymentStatus";

/**
 * PromptPayPanel — แสดง QR ที่ Stripe ออกให้ ในหน้าเว็บของเราเอง
 *
 * ═══ QR มาจากไหน ═══
 * backend เรียก Stripe สร้าง PaymentIntent แบบ promptpay แล้ว confirm ทันที
 * Stripe คืน URL รูป PNG กลับมา เราเอามาใส่ img ตรงๆ ไม่ต้องวาดเอง
 *
 * ═══ รู้ได้ยังไงว่าจ่ายแล้ว ═══
 * ถาม backend ซ้ำๆ ทุก 2 วินาที ว่า order นั้นเป็น paid หรือยัง
 * ซึ่ง backend จะเป็น paid ก็ต่อเมื่อ webhook ของ Stripe ยืนยันมาแล้วเท่านั้น
 * ไม่มีทางที่หน้านี้จะ "ตัดสินเอง" ว่าจ่ายสำเร็จ
 */

interface Props {
  orderId: number;
  ordCode: string;
  qrImageUrl: string;
  /** หน้าของ Stripe — ใน test mode ใช้กดจำลองการจ่ายเงินได้ */
  hostedUrl?: string;
  /** backend ใช้คีย์ sk_test อยู่ (Stripe sandbox) */
  testMode?: boolean;
  total: number;
  apiUrl?: string;
  onPaid: () => void;
  onCancel: () => void;
}

const POLL_MS = 2000;
/** PromptPay QR ของ Stripe มีอายุประมาณ 10 นาที */
const EXPIRE_SECONDS = 10 * 60;

const formatPrice = (n: number) =>
  n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const mmss = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

export default function PromptPayPanel({
  orderId,
  ordCode,
  qrImageUrl,
  hostedUrl,
  testMode = false,
  total,
  apiUrl,
  onPaid,
  onCancel,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState(EXPIRE_SECONDS);
  const [failed, setFailed] = useState("");
  const [canceling, setCanceling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopped = useRef(false);

  // ─── นับถอยหลัง ───
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  // ─── ถามสถานะซ้ำๆ ───
  useEffect(() => {
    const poll = async () => {
      if (stopped.current) return;

      try {
        const { state } = await pollPaymentStatus(orderId);
        if (state === "paid") {
          stopped.current = true;
          onPaid();
          return;
        }
        // QR หมดอายุ / จ่ายไม่สำเร็จ → backend ลบรอบนี้ทิ้งแล้ว
        if (state === "ended") {
          stopped.current = true;
          setFailed("การชำระเงินไม่สำเร็จหรือหมดเวลาแล้ว กรุณาเริ่มใหม่อีกครั้ง");
          return;
        }
      } catch {
        /* network สะดุด — ลองใหม่รอบหน้า */
      }

      timer.current = setTimeout(poll, POLL_MS);
    };

    poll();

    return () => {
      stopped.current = true;
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleCancel = async () => {
    setCanceling(true);
    stopped.current = true;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/checkout/cancel/${orderId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // 409 = ลูกค้าสแกนจ่ายไปแล้วก่อนกดยกเลิก → ไปหน้าสำเร็จแทน
      if (res.status === 409) {
        onPaid();
        return;
      }
    } catch {
      /* ยกเลิกไม่สำเร็จก็ไม่เป็นไร order จะหมดอายุเองใน 30 นาที */
    }
    onCancel();
  };

  const expired = secondsLeft <= 0;

  return (
    <div className="bg-white rounded-[28px] border border-line p-6 md:p-8">
      <div className="text-center mb-6">
        <h2 className="font-display text-[28px] font-bold text-ink mb-1">
          สแกนเพื่อชำระเงิน
        </h2>
        <p className="text-sm text-muted">
          เปิดแอปธนาคารของคุณแล้วสแกน QR ด้านล่าง
        </p>
      </div>

      {/* ═══ ยอดเงิน ═══ */}
      <div className="text-center mb-5">
        <p className="text-4xl font-bold text-ink">
          ฿{formatPrice(total)}
        </p>
        {ordCode && (
          <p className="text-xs text-muted mt-1">คำสั่งซื้อ {ordCode}</p>
        )}
      </div>

      {/* ═══ QR ═══ */}
      <div className="flex justify-center mb-5">
        <div
          className={`relative rounded-2xl border-2 p-4 bg-white ${
            expired || failed ? "border-line" : "border-warn-line"
          }`}
        >
          <img
            src={qrImageUrl}
            alt="PromptPay QR Code"
            width={260}
            height={260}
            className={`w-[260px] h-[260px] object-contain transition ${
              expired || failed ? "opacity-20 grayscale" : ""
            }`}
          />

          {(expired || failed) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/85 px-6 text-center">
              <span className="text-4xl mb-2">⏰</span>
              <p className="font-semibold text-body">
                {failed ? "ชำระเงินไม่สำเร็จ" : "QR หมดอายุแล้ว"}
              </p>
              <p className="text-xs text-muted mt-1">
                กดปุ่มด้านล่างเพื่อเริ่มใหม่
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ ลิงก์จำลองการจ่ายเงิน (test mode เท่านั้น) ═══
          ใน test mode ข้อมูลใน QR ไม่ใช่ payload ของ PromptPay จริง
          แอปธนาคารจะอ่านไม่ออก ต้องกดลิงก์นี้แทน
          แสดงตาม testMode ที่ backend ส่งมา — ใช้คีย์โหมดจริงเมื่อไหร่ลิงก์จะหายเอง */}
      {hostedUrl && testMode && (
        <div className="mb-5 rounded-xl border border-dashed border-line-strong bg-sand p-3 text-center">
          <p className="text-xs text-muted mb-1">โหมดทดสอบ</p>
          <a
            href={hostedUrl}
            className="text-sm font-medium text-brick underline hover:text-brick-hover"
          >
            เปิดหน้าจำลองการชำระเงินของ Stripe →
          </a>
        </div>
      )}

      {/* ═══ สถานะ ═══ */}
      {!expired && !failed && (
        <div className="flex items-center justify-center gap-2 mb-5 text-sm">
          <span
            className="w-4 h-4 rounded-full animate-spin"
            style={{
              borderWidth: 2,
              borderStyle: "solid",
              borderColor: "#a84a0e transparent transparent transparent",
            }}
          />
          <span className="text-warn-ink font-medium">
            รอการชำระเงิน · QR หมดอายุใน {mmss(secondsLeft)}
          </span>
        </div>
      )}

      {failed && (
        <div className="mb-5 bg-danger-soft border border-danger-line text-error px-4 py-3 rounded-2xl text-sm text-center">
          {failed}
        </div>
      )}

      {/* ═══ วิธีสแกน ═══ */}
      {!expired && !failed && (
        <div className="bg-warn-bg rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-ink mb-2">
            วิธีชำระเงิน
          </p>
          <ol className="text-sm text-warn-ink space-y-1 list-decimal list-inside">
            <li>เปิดแอปธนาคารของคุณ เลือกเมนูสแกน</li>
            <li>สแกน QR ด้านบน ตรวจสอบยอดให้ตรง</li>
            <li>ยืนยันการโอน แล้วรอสักครู่</li>
          </ol>
          <p className="text-xs text-brick mt-3">
            หน้านี้จะเปลี่ยนเองอัตโนมัติเมื่อได้รับเงิน ไม่ต้องกดอะไรเพิ่ม
            และไม่ต้องอัปโหลดสลิป
          </p>
        </div>
      )}

      {/* ═══ ปุ่ม ═══ */}
      <button
        onClick={handleCancel}
        disabled={canceling}
        className="w-full min-h-12 rounded-full font-semibold border-[1.5px] border-ink text-ink hover:bg-ink/5 transition-colors disabled:opacity-50"
      >
        {canceling
          ? "กำลังยกเลิก..."
          : expired || failed
            ? "← กลับไปเริ่มใหม่"
            : "ยกเลิกการชำระเงิน"}
      </button>

      <p className="text-xs text-muted text-center mt-3">
        อย่าปิดหน้านี้จนกว่าการชำระเงินจะเสร็จสิ้น
      </p>
    </div>
  );
}