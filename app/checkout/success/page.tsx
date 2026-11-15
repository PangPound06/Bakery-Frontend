"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ButtonLink, Spinner, StateCard } from "@/components/ds";
import CheckoutSteps from "@/components/checkout/CheckoutSteps";
import { formatBaht } from "@/lib/dineIn";
import { PAYMENT_STATUS } from "@/lib/payment";
import { formatReceiveAt, fulfillmentLabel } from "@/lib/receive";

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
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <SuccessInner />
    </Suspense>
  );
}

function SuccessInner() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("checking");
  const [ordCode, setOrdCode] = useState("");
  const [total, setTotal] = useState<number | null>(null);
  const [receive, setReceive] = useState<Receive | null>(null);
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
          if (data.orderType === "online")
            setReceive({
              fulfillment: data.fulfillment,
              receiveAt: data.receiveAt ?? null,
              address: data.receiverAddress ?? null,
            });

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

  const done = phase !== "checking";

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <main className="mx-auto max-w-[560px] px-4 pt-8 pb-28 sm:pt-12">
        <CheckoutSteps current={3} />
        <div role="status" aria-live="polite">
          {phase === "checking" && (
            <div className="flex flex-col items-center gap-4 rounded-[32px] border border-line bg-white px-6 py-14 text-center">
              <Spinner className="size-10 text-brick" />
              <h1 className="m-0 font-display text-2xl font-bold">กำลังตรวจสอบการชำระเงิน</h1>
              <p className="m-0 text-subtle">กรุณารอสักครู่ อย่าเพิ่งปิดหน้านี้</p>
            </div>
          )}
          {phase === "paid" && (
            <StateCard tone="done" title="ชำระเงินสำเร็จ">
              <OrderFacts ordCode={ordCode} total={total} totalLabel="ยอดชำระ" receive={receive} />
              <p className="m-0 mt-3">
                {receive?.fulfillment === "pickup"
                  ? "ร้านจะเตรียมสินค้าให้ทันเวลาที่เลือก ติดตามสถานะได้ที่หน้าคำสั่งซื้อของฉัน"
                  : "ร้านจะเตรียมและจัดส่งตามเวลาที่เลือก ติดตามสถานะได้ที่หน้าคำสั่งซื้อของฉัน"}
              </p>
            </StateCard>
          )}
          {phase === "verifying" && (
            <StateCard tone="warning" title="แจ้งโอนแล้ว รอร้านตรวจยอด">
              <OrderFacts ordCode={ordCode} total={total} totalLabel="ยอดโอน" receive={receive} />
              <p className="m-0 mt-3">เมื่อร้านยืนยันแล้ว สถานะจะเปลี่ยนเป็น &quot;ชำระแล้ว&quot; ในหน้าคำสั่งซื้อของฉัน ไม่ต้องแจ้งซ้ำ</p>
            </StateCard>
          )}
          {phase === "pending" && (
            <StateCard tone="warning" title="กำลังรอการยืนยันจากธนาคาร">
              {ordCode && <OrderFacts ordCode={ordCode} total={null} totalLabel="" receive={null} />}
              <p className="m-0 mt-3">ถ้าชำระเงินแล้ว สถานะจะอัปเดตเองในหน้าคำสั่งซื้อของฉัน</p>
            </StateCard>
          )}
          {phase === "failed" && (
            <StateCard tone="danger" title="การชำระเงินไม่สำเร็จ">
              คำสั่งซื้อถูกยกเลิกและยังไม่มีการเรียกเก็บเงิน สินค้ายังอยู่ในตะกร้า สั่งใหม่ได้ทุกเมื่อ
            </StateCard>
          )}
          {phase === "notfound" && (
            <StateCard tone="danger" title="ไม่พบคำสั่งซื้อนี้">
              ลองตรวจสอบที่หน้าคำสั่งซื้อของฉัน
            </StateCard>
          )}
        </div>

        {done && (
          <div className="mt-5 flex flex-col gap-2.5">
            {phase === "failed" ? (
              <ButtonLink href="/cart" size="lg" block>
                กลับไปที่ตะกร้า
              </ButtonLink>
            ) : (
              <ButtonLink href="/user/orders" size="lg" block>
                ดูคำสั่งซื้อของฉัน
              </ButtonLink>
            )}
            <ButtonLink href="/" variant="secondary" block>
              กลับหน้าหลัก
            </ButtonLink>
          </div>
        )}
      </main>
    </div>
  );
}

interface Receive {
  fulfillment?: string | null;
  receiveAt: string | null;
  /** มารับที่ร้าน = "รับที่ร้าน: <สาขา>" */
  address: string | null;
}

/** เลขคำสั่งซื้อ ยอด และการรับสินค้า */
function OrderFacts({
  ordCode,
  total,
  totalLabel,
  receive,
}: {
  ordCode: string;
  total: number | null;
  totalLabel: string;
  receive: Receive | null;
}) {
  const rows: [string, string][] = [["เลขคำสั่งซื้อ", ordCode || "-"]];
  if (total !== null) rows.push([totalLabel, formatBaht(total)]);
  if (receive) {
    rows.push([fulfillmentLabel(receive.fulfillment), formatReceiveAt(receive.receiveAt)]);
    if (receive.fulfillment === "pickup" && receive.address) rows.push(["สาขา", receive.address.replace(/^รับที่ร้าน:\s*/, "")]);
  }
  return (
    <dl className="m-0 flex flex-col gap-2 rounded-2xl bg-sand px-4 py-3.5">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="text-muted">{label}</dt>
          <dd className="m-0 text-right font-semibold text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
