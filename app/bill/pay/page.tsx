"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import PaymentPanel from "@/components/checkout/PaymentPanel";
import { authHeaders } from "@/lib/auth";
import { toActiveIntent, type ActiveIntent, type CheckoutMethod } from "@/lib/paymentIntent";
import { pollPaymentStatus } from "@/lib/paymentStatus";

/**
 * จ่ายบิลทานในร้าน — QR PromptPay / บัตร / โอนพร้อมเพย์ (แอดมินยืนยัน)
 *
 * ใช้ PaymentPanel ชุดเดียวกับหน้า checkout ออนไลน์ ทั้ง à la carte และบุฟเฟต์
 *
 * ═══ ยอดเงินมาจากไหน ═══
 * POST /api/dinein/request-bill — backend รวมยอดออเดอร์ที่เสิร์ฟแล้ว หรือคิดราคาบุฟเฟต์ × จำนวนคนเอง
 * หน้านี้ส่งแค่โต๊ะ ประเภทการทาน จำนวนคน และวิธีจ่าย ไม่ส่งตัวเลขราคา
 *
 * ═══ รู้ได้ยังไงว่าจ่ายแล้ว ═══
 * หลัง panel จบ (สแกนแล้ว / ฟอร์มบัตรผ่าน / แจ้งโอน) ถามสถานะจาก backend ซ้ำจนเป็น paid
 * โอนพร้อมเพย์จะค้างที่ "รอร้านตรวจสอบยอด" จนแอดมินกดยืนยัน
 */

const METHODS: readonly CheckoutMethod[] = ["promptpay", "card", "transfer"];
const POLL_MS = 2000;
/** รอแอดมินตรวจยอดโอน — ไม่ต้องถามถี่ */
const VERIFY_POLL_MS = 5000;

type Phase =
  | { kind: "creating" }
  | { kind: "error"; message: string }
  | { kind: "paying"; intent: ActiveIntent }
  | { kind: "confirming"; intent: ActiveIntent }
  | { kind: "verifying"; intent: ActiveIntent }
  | { kind: "ended" };

const DINE_SESSION_KEYS = ["dineType", "buffetPrice", "buffetPax"];

export default function BillPayPage() {
  return (
    <Suspense fallback={<Spinner text="กำลังโหลด..." />}>
      <BillPayContent />
    </Suspense>
  );
}

function BillPayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>({ kind: "creating" });
  const [tableNo, setTableNo] = useState("");
  /** React strict mode เรียก effect สองรอบ — กันออกบิลซ้ำ */
  const requested = useRef(false);

  // ─── ออกบิล ───
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    const method = searchParams.get("method") as CheckoutMethod | null;
    if (!method || !METHODS.includes(method)) {
      router.replace("/bill");
      return;
    }
    if (!localStorage.getItem("token")) {
      router.replace("/login");
      return;
    }

    const table = localStorage.getItem("tableNo") || "";
    const dineType = localStorage.getItem("dineType") || "alacarte";

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dinein/request-bill`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        tableNo: table,
        dineType,
        buffetPax: dineType === "buffet" ? Number(localStorage.getItem("buffetPax") || 1) : 1,
        paymentMethod: method,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        setTableNo(table);
        if (!res.ok || !data.success) {
          setPhase({ kind: "error", message: data.message || "เรียกเก็บบิลไม่สำเร็จ" });
          return;
        }
        setPhase({ kind: "paying", intent: toActiveIntent(method, data) });
      })
      .catch(() => setPhase({ kind: "error", message: "เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่" }));
  }, [router, searchParams]);

  // ─── หลัง panel จบ: ถามสถานะจริงจนได้เงิน ───
  const watching = phase.kind === "confirming" || phase.kind === "verifying" ? phase.intent : null;
  useEffect(() => {
    if (!watching) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      let delay = POLL_MS;
      try {
        const { state, ordCode } = await pollPaymentStatus(watching.orderId);
        if (stopped) return;
        if (state === "paid") {
          DINE_SESSION_KEYS.forEach((k) => localStorage.removeItem(k));
          await Swal.fire({
            icon: "success",
            title: "ชำระเงินสำเร็จ",
            text: `บิล ${ordCode || watching.ordCode} ชำระเรียบร้อยแล้ว`,
            confirmButtonColor: "#f97316",
            confirmButtonText: "เรียบร้อย",
          });
          router.replace("/order-detail");
          return;
        }
        if (state === "ended") {
          setPhase({ kind: "ended" });
          return;
        }
        if (state === "verifying") {
          // setState ใน callback ของ timer ไม่ใช่ใน effect ตรงๆ
          setPhase((p) => (p.kind === "verifying" ? p : { kind: "verifying", intent: watching }));
          delay = VERIFY_POLL_MS;
        }
      } catch {
        /* network สะดุด — ลองใหม่รอบหน้า */
      }
      if (!stopped) timer = setTimeout(poll, delay);
    };

    timer = setTimeout(poll, 0);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [watching, router]);

  const backToBill = () => router.replace("/bill");

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <h1 className="font-semibold text-gray-800">ชำระเงิน</h1>
        {tableNo && <span className="ml-auto text-sm font-medium text-amber-700">🪑 โต๊ะ {tableNo}</span>}
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {phase.kind === "creating" && <Spinner text="กำลังออกบิล..." />}

        {phase.kind === "error" && (
          <Notice icon="⚠️" title={phase.message} actionLabel="กลับไปหน้าบิล" onAction={backToBill} />
        )}

        {phase.kind === "paying" && (
          <PaymentPanel
            intent={phase.intent}
            onDone={() => setPhase({ kind: "confirming", intent: phase.intent })}
            onCancel={backToBill}
          />
        )}

        {phase.kind === "confirming" && <Spinner text="กำลังยืนยันการชำระเงิน..." />}

        {phase.kind === "verifying" && (
          <Notice
            icon="🧾"
            title="แจ้งโอนแล้ว รอร้านตรวจสอบยอด"
            detail={`บิล ${phase.intent.ordCode} · หน้านี้จะเปลี่ยนเองเมื่อร้านยืนยัน ไม่ต้องแจ้งซ้ำ`}
          />
        )}

        {phase.kind === "ended" && (
          <Notice
            icon="⏰"
            title="การชำระเงินไม่สำเร็จหรือหมดเวลาแล้ว"
            detail="ถ้ายังไม่ได้ชำระเงิน กดเรียกบิลใหม่ได้เลย"
            actionLabel="เรียกบิลใหม่"
            onAction={backToBill}
          />
        )}
      </div>
    </div>
  );
}

function Spinner({ text }: { text: string }) {
  return (
    <div className="py-20 text-center">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-amber-700">{text}</p>
    </div>
  );
}

function Notice({
  icon,
  title,
  detail,
  actionLabel,
  onAction,
}: {
  icon: string;
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-8 text-center">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="text-gray-800 font-semibold mb-1">{title}</p>
      {detail && <p className="text-sm text-gray-500 mb-4">{detail}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
