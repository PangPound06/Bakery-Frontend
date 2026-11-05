"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

/**
 * CardPaymentPanel — ช่องกรอกบัตรของ Stripe ฝังในหน้าเว็บเรา
 *
 * ═══ เลขบัตรไม่ผ่าน server ของเรา ═══
 * PaymentElement เป็น iframe ที่ Stripe เป็นเจ้าของ
 * เลขบัตรวิ่งจากเบราว์เซอร์ลูกค้าไป Stripe โดยตรง
 * โค้ดของเราแตะไม่ได้แม้แต่ตัวเดียว จึงไม่ติด PCI-DSS
 *
 * ═══ client_secret คืออะไร ═══
 * กุญแจชั่วคราวที่ผูกกับ PaymentIntent ใบเดียว ใช้ยืนยันการจ่ายได้อย่างเดียว
 * ไม่สามารถเอาไปดูข้อมูลอื่นหรือสร้างรายการใหม่ได้ จึงส่งมาที่ browser ได้
 *
 * ═══ ทำไมยังต้องรอ webhook ═══
 * confirmPayment() สำเร็จแค่บอกว่า "ฝั่งเบราว์เซอร์ผ่าน"
 * แต่ JavaScript แก้ได้จากฝั่งลูกค้า เลยไม่ใช่หลักฐาน
 * เราเลยพาไปหน้า success ที่จะถาม backend ต่อว่า webhook ยืนยันแล้วหรือยัง
 */

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

interface Props {
  orderId: number;
  ordCode: string;
  clientSecret: string;
  total: number;
  apiUrl?: string;
  onPaid: () => void;
  onCancel: () => void;
}

const formatPrice = (n: number) =>
  n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function CardPaymentPanel(props: Props) {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
        <p className="text-red-600 font-medium mb-2">
          ยังไม่ได้ตั้งค่า Stripe publishable key
        </p>
        <p className="text-sm text-gray-500">
          เพิ่ม NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ใน .env.local
          แล้วรีสตาร์ท dev server
        </p>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        locale: "th",
        appearance: {
          theme: "flat",
          variables: {
            colorPrimary: "#f59e0b",
            colorBackground: "#ffffff",
            colorText: "#374151",
            borderRadius: "10px",
            fontSizeBase: "15px",
          },
        },
      }}
    >
      <CardForm {...props} />
    </Elements>
  );
}

function CardForm({
  orderId,
  ordCode,
  total,
  apiUrl,
  onPaid,
  onCancel,
}: Props) {
  const stripe = useStripe();
  const elements = useElements();

  const [submitting, setSubmitting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setError("");
    setSubmitting(true);

    // redirect: "if_required" = ถ้าบัตรไม่ต้องยืนยัน 3D Secure ก็จบในหน้านี้เลย
    // ถ้าต้องยืนยัน Stripe จะเปิด modal ให้เอง แล้วกลับมาที่นี่
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message || "การชำระเงินไม่สำเร็จ กรุณาลองใหม่");
      setSubmitting(false);
      return;
    }

    if (
      paymentIntent?.status === "succeeded" ||
      paymentIntent?.status === "processing"
    ) {
      // ยังไม่ถือว่าจบ — หน้า success จะถาม backend ว่า webhook ยืนยันแล้วหรือยัง
      onPaid();
      return;
    }

    setError("สถานะการชำระเงินไม่ชัดเจน กรุณาตรวจสอบที่หน้าคำสั่งซื้อของฉัน");
    setSubmitting(false);
  };

  const handleCancel = async () => {
    setCanceling(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/checkout/cancel/${orderId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // 409 = ตัดเงินบัตรไปแล้วก่อนกดยกเลิก → ไปหน้าสำเร็จแทน
      if (res.status === 409) {
        onPaid();
        return;
      }
    } catch {
      /* ยกเลิกไม่สำเร็จก็ไม่เป็นไร order จะหมดอายุเอง */
    }
    onCancel();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-amber-800 mb-1">
          ชำระด้วยบัตร
        </h2>
        <p className="text-sm text-gray-500">
          กรอกข้อมูลบัตรเครดิตหรือเดบิตของคุณ
        </p>
      </div>

      <div className="text-center mb-6">
        <p className="text-4xl font-bold text-amber-600">
          ฿{formatPrice(total)}
        </p>
        {ordCode && (
          <p className="text-xs text-gray-400 mt-1">คำสั่งซื้อ {ordCode}</p>
        )}
      </div>

      {/* ═══ ช่องกรอกบัตร (iframe ของ Stripe) ═══ */}
      <div className="mb-5 min-h-[180px]">
        <PaymentElement onReady={() => setReady(true)} />
        {!ready && (
          <div className="flex items-center justify-center py-8 gap-2 text-sm text-gray-400">
            <span
              className="w-4 h-4 rounded-full animate-spin"
              style={{
                borderWidth: 2,
                borderStyle: "solid",
                borderColor: "#f59e0b transparent transparent transparent",
              }}
            />
            กำลังโหลดช่องกรอกบัตร...
          </div>
        )}
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 mb-4 text-xs text-gray-400">
        <span>🔒</span>
        <span>ข้อมูลบัตรถูกส่งตรงไปยัง Stripe ไม่ผ่านเซิร์ฟเวอร์ของร้าน</span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!stripe || !ready || submitting || canceling}
        className={`w-full py-4 rounded-xl font-semibold text-white transition-colors ${
          !stripe || !ready || submitting || canceling
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-amber-500 hover:bg-amber-600"
        }`}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span
              className="w-5 h-5 rounded-full animate-spin"
              style={{
                borderWidth: 2,
                borderStyle: "solid",
                borderColor: "#fff transparent transparent transparent",
              }}
            />
            กำลังดำเนินการ...
          </span>
        ) : (
          `ชำระเงิน ฿${formatPrice(total)}`
        )}
      </button>

      <button
        onClick={handleCancel}
        disabled={submitting || canceling}
        className="w-full mt-3 py-3 rounded-xl font-semibold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {canceling ? "กำลังยกเลิก..." : "← เปลี่ยนวิธีชำระเงิน"}
      </button>
    </div>
  );
}