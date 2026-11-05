"use client";

import { useEffect, useState } from "react";
import { authHeaders } from "@/lib/auth";
import SlipPicker from "./SlipPicker";

/**
 * TransferPaymentPanel — โอนเข้าพร้อมเพย์ของร้านตรง แล้วแอดมินตรวจยอดเอง
 *
 * ═══ ต่างจาก PromptPayPanel (Stripe) ยังไง ═══
 * QR นี้สร้างจากเลขพร้อมเพย์ของร้าน เงินเข้าบัญชีร้านทันที ไม่ผ่าน Stripe
 * แต่ไม่มีใครบอกระบบอัตโนมัติว่าเงินเข้าแล้ว ลูกค้าจึงต้องกด "แจ้งโอนแล้ว"
 * แล้วรอแอดมินเช็กยอดในแอปธนาคารก่อน order จะเป็น "ชำระแล้ว"
 *
 * การกดแจ้งโอนไม่ได้ยืนยันการจ่ายเงิน — แค่หยุดเวลาหมดอายุและส่งเรื่องให้แอดมิน
 * ต้องแนบสลิปที่มี QR ของธนาคารทุกครั้ง (ตรวจในเบราว์เซอร์ และ backend ตรวจซ้ำ)
 */

interface Props {
  orderId: number;
  ordCode: string;
  /** รูป QR แบบ data URL — สแกนด้วยแอปธนาคารจริงได้ */
  qrImageUrl: string;
  total: number;
  /** เลขพร้อมเพย์ของร้านแบบซ่อนบางส่วน ให้ลูกค้าเทียบกับที่แอปธนาคารแสดง */
  promptPayId?: string;
  accountName?: string;
  expiresInSeconds: number;
  apiUrl?: string;
  /** แจ้งโอนสำเร็จ (หรือแจ้งไปแล้วก่อนหน้า) → ไปหน้ารอตรวจสอบ */
  onSubmitted: () => void;
  onCancel: () => void;
}

const formatPrice = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

export default function TransferPaymentPanel({
  orderId,
  ordCode,
  qrImageUrl,
  total,
  promptPayId,
  accountName,
  expiresInSeconds,
  apiUrl,
  onSubmitted,
  onCancel,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState(expiresInSeconds);
  /** สลิปที่ผ่านการตรวจ QR แล้วเท่านั้น */
  const [slip, setSlip] = useState<File | null>(null);
  const [busy, setBusy] = useState<"submit" | "cancel" | null>(null);
  const [error, setError] = useState("");

  const expired = secondsLeft <= 0;

  useEffect(() => {
    if (expired) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, expired]);

  const handleSubmit = async () => {
    if (!slip) return;
    setBusy("submit");
    setError("");
    try {
      const form = new FormData();
      form.append("slip", slip);
      // ไม่ตั้ง Content-Type เอง — เบราว์เซอร์ใส่ boundary ของ multipart ให้
      const res = await fetch(`${apiUrl}/api/checkout/transfer/${orderId}/submit`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        onSubmitted();
        return;
      }
      setError(data.error || "แจ้งโอนไม่สำเร็จ กรุณาลองใหม่");
    } catch {
      setError("เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่");
    }
    setBusy(null);
  };

  const handleCancel = async () => {
    setBusy("cancel");
    try {
      const res = await fetch(`${apiUrl}/api/checkout/cancel/${orderId}`, {
        method: "POST",
        headers: authHeaders(),
      });
      // 409 = แจ้งโอนไปแล้ว ยกเลิกเองไม่ได้ → ไปหน้ารอตรวจสอบแทน
      if (res.status === 409) {
        onSubmitted();
        return;
      }
    } catch {
      /* ยกเลิกไม่สำเร็จก็ไม่เป็นไร order จะหมดอายุเองตามเวลา */
    }
    onCancel();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-amber-800 mb-1">โอนผ่านพร้อมเพย์</h2>
        <p className="text-sm text-gray-500">
          สแกน QR ด้วยแอปธนาคาร โอนแล้วกด &quot;แจ้งโอนแล้ว&quot; ด้านล่าง
        </p>
      </div>

      {/* ═══ ยอดเงิน ═══ */}
      <div className="text-center mb-5">
        <p className="text-4xl font-bold text-amber-600">฿{formatPrice(total)}</p>
        {ordCode && <p className="text-xs text-gray-400 mt-1">คำสั่งซื้อ {ordCode}</p>}
      </div>

      {/* ═══ QR ═══ */}
      <div className="flex flex-col items-center mb-5">
        <div
          className={`relative rounded-2xl border-2 p-4 bg-white ${
            expired ? "border-gray-200" : "border-amber-200"
          }`}
        >
          <img
            src={qrImageUrl}
            alt="QR พร้อมเพย์ของร้าน"
            width={260}
            height={260}
            className={`w-[260px] h-[260px] object-contain ${expired ? "opacity-20 grayscale" : ""}`}
          />
          {expired && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/85 px-6 text-center">
              <span className="text-4xl mb-2">⏰</span>
              <p className="font-semibold text-gray-700">หมดเวลาโอนแล้ว</p>
              <p className="text-xs text-gray-500 mt-1">ถ้าโอนไปแล้ว กดแจ้งโอนทันที หรือติดต่อร้าน</p>
            </div>
          )}
        </div>

        {/* มือถือสแกนหน้าจอตัวเองไม่ได้ — บันทึกรูปแล้วเลือกจากแกลเลอรีในแอปธนาคารแทน */}
        <a
          href={qrImageUrl}
          download={`promptpay-${ordCode || orderId}.png`}
          className="mt-3 text-sm font-medium text-amber-600 underline hover:text-amber-700"
        >
          บันทึกรูป QR (สำหรับสแกนจากแกลเลอรี)
        </a>

        {(promptPayId || accountName) && (
          <p className="mt-2 text-xs text-gray-500 text-center">
            พร้อมเพย์ {promptPayId}
            {accountName ? ` · ${accountName}` : ""}
          </p>
        )}
      </div>

      {!expired && (
        <p className="text-center text-sm text-amber-700 font-medium mb-5">
          กรุณาโอนและแจ้งภายใน {mmss(secondsLeft)} นาที
        </p>
      )}

      {/* ═══ สลิป (บังคับ) ═══ */}
      <div className="bg-amber-50 rounded-xl p-4 mb-5">
        <p className="text-sm font-semibold text-amber-800 mb-1">
          แนบสลิป <span className="text-red-500">*</span>
        </p>
        <p className="text-xs text-amber-700 mb-3">
          ใช้รูปสลิปจากแอปธนาคาร (JPG/PNG) ที่เห็น QR Code ชัดเจน
        </p>
        <SlipPicker disabled={busy !== null} onValidSlipChange={setSlip} />
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      {/* ═══ ปุ่ม ═══ */}
      <button
        onClick={handleSubmit}
        disabled={!slip || busy !== null}
        className="w-full py-4 mb-3 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {busy === "submit" ? "กำลังแจ้งโอน..." : "✅ แจ้งโอนแล้ว"}
      </button>
      {!slip && (
        <p className="-mt-1 mb-3 text-xs text-center text-gray-500">แนบสลิปที่มี QR Code ก่อนจึงจะแจ้งโอนได้</p>
      )}
      <button
        onClick={handleCancel}
        disabled={busy !== null}
        className="w-full py-3 rounded-xl font-semibold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {busy === "cancel" ? "กำลังยกเลิก..." : "ยกเลิก (ยังไม่ได้โอน)"}
      </button>

      <p className="text-xs text-gray-400 text-center mt-3">
        ร้านจะยืนยันคำสั่งซื้อหลังตรวจพบยอดโอนในบัญชี
      </p>
    </div>
  );
}
