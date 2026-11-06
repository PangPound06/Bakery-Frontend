"use client";

import type { ActiveIntent } from "@/lib/paymentIntent";
import CardPaymentPanel from "./CardPaymentPanel";
import PromptPayPanel from "./PromptPayPanel";
import TransferPaymentPanel from "./TransferPaymentPanel";

interface Props {
  intent: ActiveIntent;
  /** Stripe ได้เงิน (QR) / ฟอร์มบัตรผ่าน / แจ้งโอนแล้ว — ผู้ใช้ไปถามสถานะจริงต่อ */
  onDone: () => void;
  /** ยกเลิกแล้ว (order ถูกลบที่ backend) */
  onCancel: () => void;
}

/** เลือก panel ตามวิธีจ่าย — ใช้ทั้งหน้า checkout และหน้าเรียกเก็บบิลในร้าน */
export default function PaymentPanel({ intent, onDone, onCancel }: Props) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (intent.method === "transfer" && intent.qrImageUrl) {
    return (
      <TransferPaymentPanel
        orderId={intent.orderId}
        ordCode={intent.ordCode}
        qrImageUrl={intent.qrImageUrl}
        total={intent.total}
        promptPayId={intent.promptPayId}
        accountName={intent.accountName}
        expiresInSeconds={intent.expiresInSeconds ?? 30 * 60}
        apiUrl={apiUrl}
        onSubmitted={onDone}
        onCancel={onCancel}
      />
    );
  }
  if (intent.method === "promptpay" && intent.qrImageUrl) {
    return (
      <PromptPayPanel
        orderId={intent.orderId}
        ordCode={intent.ordCode}
        qrImageUrl={intent.qrImageUrl}
        hostedUrl={intent.hostedUrl}
        testMode={intent.testMode}
        total={intent.total}
        apiUrl={apiUrl}
        onPaid={onDone}
        onCancel={onCancel}
      />
    );
  }
  if (intent.method === "card" && intent.clientSecret) {
    return (
      <CardPaymentPanel
        orderId={intent.orderId}
        ordCode={intent.ordCode}
        clientSecret={intent.clientSecret}
        total={intent.total}
        apiUrl={apiUrl}
        onPaid={onDone}
        onCancel={onCancel}
      />
    );
  }
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
      <p className="text-red-600">ข้อมูลการชำระเงินไม่ครบ</p>
      <button onClick={onCancel} className="mt-4 text-amber-600 font-medium">
        ← กลับไปเริ่มใหม่
      </button>
    </div>
  );
}
