"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink, Dialog, Spinner, StateCard } from "@/components/ds";
import PaymentPanel from "@/components/checkout/PaymentPanel";
import BillRounds, { billTotalOf } from "@/components/dinein/BillRounds";
import BuffetTimerChip from "@/components/dinein/BuffetTimerChip";
import CheckoutBox, { type BillMethod } from "@/components/dinein/CheckoutBox";
import { dineTypeLabel } from "@/components/dinein/DineInTopBar";
import { useDineSession } from "@/components/dinein/useDineSession";
import { authHeaders } from "@/lib/auth";
import { useBuffetTimer } from "@/lib/diningSession";
import { BUFFET_MINUTES, endDineSession, formatBaht, isRoundDone } from "@/lib/dineIn";
import { toActiveIntent, type ActiveIntent, type CheckoutMethod } from "@/lib/paymentIntent";
import { pollPaymentStatus } from "@/lib/paymentStatus";

const POLL_MS = 2000;
/** รอแอดมินตรวจยอดโอน — ไม่ต้องถามถี่ */
const VERIFY_POLL_MS = 5000;

/**
 * ขั้นตอนเช็กบิล
 *
 * review → (ยืนยัน) → creating → paying → confirming → paid
 *                                              └→ verifying (โอนรอร้านตรวจ) → paid
 * staff = เรียกพนักงานมาเก็บเงิน (ไม่ออกบิลในระบบ)
 */
type Phase =
  | { kind: "review" }
  | { kind: "staff" }
  | { kind: "creating" }
  | { kind: "error"; message: string }
  | { kind: "paying"; intent: ActiveIntent }
  | { kind: "confirming"; intent: ActiveIntent }
  | { kind: "verifying"; intent: ActiveIntent }
  | { kind: "ended" }
  | { kind: "paid"; ordCode: string; total: number; tableNo: string };

/**
 * ออเดอร์ของโต๊ะและเช็กบิล
 *
 * ยอดเงินคิดที่ server (POST /api/dinein/request-bill) — หน้านี้ส่งแค่โต๊ะ ประเภท จำนวนคน และวิธีจ่าย
 * เช็กบิลได้เมื่อครัวทำครบทุกรอบ (backend ตอบ 409 ด้วยถ้ายังไม่ครบ) จ่ายเงินผ่าน PaymentPanel ชุดเดียวกับ checkout ออนไลน์
 */
export default function DineInBillPage() {
  const [phase, setPhase] = useState<Phase>({ kind: "review" });
  const [method, setMethod] = useState<BillMethod | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const paid = phase.kind === "paid";
  const session = useDineSession(!paid);
  const { tableNo, dineType, pax, rounds, reloadRounds } = session;
  const buffet = dineType === "buffet";
  const timer = useBuffetTimer(buffet && !paid, tableNo);
  const closed = timer?.expired ?? false;
  /** React strict mode เรียกซ้ำได้ — กันออกบิลซ้อน */
  const requesting = useRef(false);

  // จ่ายแล้ว → จบมื้อ (ทำหลัง render ที่เป็น paid แล้ว จึงไม่ถูกพาออกจากหน้า)
  useEffect(() => {
    if (paid) endDineSession();
  }, [paid]);

  const cooking = rounds.filter((r) => !isRoundDone(r)).length;
  const total = billTotalOf(rounds, buffet, pax);

  const requestBill = async (payWith: CheckoutMethod) => {
    if (requesting.current) return;
    requesting.current = true;
    setPhase({ kind: "creating" });
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dinein/request-bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ tableNo, dineType, buffetPax: buffet ? pax : 1, paymentMethod: payWith }),
      });
      if (res.status === 401) return session.toLogin();
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setPhase({ kind: "error", message: data.message || "เช็กบิลไม่สำเร็จ กรุณาลองใหม่" });
        return;
      }
      setPhase({ kind: "paying", intent: toActiveIntent(payWith, data) });
    } catch {
      setPhase({ kind: "error", message: "เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่" });
    } finally {
      requesting.current = false;
    }
  };

  const confirm = () => {
    setConfirmOpen(false);
    if (!method) return;
    if (method === "staff") setPhase({ kind: "staff" });
    else void requestBill(method);
  };

  const backToReview = useCallback(() => {
    setPhase({ kind: "review" });
    void reloadRounds();
  }, [reloadRounds]);

  const closeConfirm = useCallback(() => setConfirmOpen(false), []);

  // ─── หลัง panel จบ: ถามสถานะจริงจาก backend จนได้เงิน ───
  const watching = phase.kind === "confirming" || phase.kind === "verifying" ? phase.intent : null;
  useEffect(() => {
    if (!watching) return;
    let stopped = false;
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      let delay = POLL_MS;
      try {
        const { state, ordCode } = await pollPaymentStatus(watching.orderId);
        if (stopped) return;
        if (state === "paid") {
          setPhase({ kind: "paid", ordCode: ordCode || watching.ordCode, total: watching.total, tableNo });
          return;
        }
        if (state === "ended") {
          setPhase({ kind: "ended" });
          return;
        }
        if (state === "verifying") {
          setPhase((p) => (p.kind === "verifying" ? p : { kind: "verifying", intent: watching }));
          delay = VERIFY_POLL_MS;
        }
      } catch {
        /* network สะดุด — ลองใหม่รอบหน้า */
      }
      if (!stopped) timerId = setTimeout(poll, delay);
    };

    timerId = setTimeout(poll, 0);
    return () => {
      stopped = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [watching, tableNo]);

  const shownTable = phase.kind === "paid" ? phase.tableNo : tableNo;
  const canOrderMore = phase.kind === "review" && !closed;

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <main className="mx-auto flex max-w-[1180px] flex-wrap items-start gap-8 px-4 pt-8 pb-28 sm:px-6 lg:pt-12 lg:pb-24">
        <section className="min-w-0 flex-[999_1_520px]" aria-labelledby="bill-title">
          <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
            {shownTable && <span className="rounded-full bg-ink px-3.5 py-1.5 font-bold text-cream">โต๊ะ {shownTable}</span>}
            {!paid && <span className="text-sm text-muted">{dineTypeLabel(dineType, pax)} · อัปเดตอัตโนมัติ</span>}
            {timer && <BuffetTimerChip timer={timer} tone="light" />}
          </div>
          <h1 id="bill-title" className="m-0 mb-6 font-display text-[32px] font-bold sm:text-[52px] lg:mb-7">
            ออเดอร์ของโต๊ะ
          </h1>

          {paid ? (
            <p className="text-muted">ชำระเงินเรียบร้อยแล้ว ขอบคุณที่ทานที่ Pound Bakery</p>
          ) : !session.roundsLoaded ? (
            <div className="flex justify-center py-16 text-brick">
              <Spinner className="size-8" />
            </div>
          ) : rounds.length === 0 ? (
            <div className="flex flex-col items-start gap-4 rounded-[28px] border border-line bg-white p-7">
              <p className="m-0 text-lg">ยังไม่ได้ส่งรายการเข้าครัว</p>
              <ButtonLink href="/dine-in" variant="secondary">
                ไปเลือกเมนู
              </ButtonLink>
            </div>
          ) : (
            <>
              <BillRounds rounds={rounds} buffet={buffet} pax={pax} />
              {session.roundsError && (
                <p role="alert" className="mt-3 text-sm text-error">
                  อัปเดตสถานะจากครัวไม่สำเร็จ กำลังลองใหม่…
                </p>
              )}
              {canOrderMore && (
                <ButtonLink href="/dine-in" variant="secondary" className="mt-4.5">
                  + สั่งเพิ่ม
                </ButtonLink>
              )}
              {phase.kind === "review" && closed && (
                <p className="mt-4.5 text-sm text-danger">
                  หมดเวลาสั่งบุฟเฟต์ {BUFFET_MINUTES} นาทีแล้ว สั่งเพิ่มไม่ได้ · เช็กบิลได้ตามปกติ
                </p>
              )}
            </>
          )}
        </section>

        <aside className="w-full min-w-0 lg:sticky lg:top-24 lg:w-auto lg:flex-[1_1_380px]" aria-label="เช็กบิล">
          {phase.kind === "review" && session.roundsLoaded && (
            <CheckoutBox
              total={total}
              cooking={cooking}
              empty={rounds.length === 0}
              method={method}
              onMethod={setMethod}
              onCheck={() => setConfirmOpen(true)}
            />
          )}

          {phase.kind === "creating" && <Waiting text="กำลังออกบิล…" />}
          {phase.kind === "confirming" && <Waiting text="กำลังยืนยันการชำระเงิน…" />}

          {phase.kind === "paying" && (
            <PaymentPanel
              intent={phase.intent}
              onDone={() => setPhase({ kind: "confirming", intent: phase.intent })}
              onCancel={backToReview}
            />
          )}

          {phase.kind === "staff" && (
            <StateCard
              tone="success"
              title="เรียกพนักงานเพื่อชำระเงิน"
              actions={
                <Button variant="ghost" onClick={backToReview}>
                  ← เลือกวิธีชำระอื่น
                </Button>
              }
            >
              ยกมือหรือแจ้งพนักงานได้เลย พนักงานจะมาเก็บเงินสดหรือ QR ที่โต๊ะ {tableNo}
            </StateCard>
          )}

          {phase.kind === "verifying" && (
            <StateCard tone="warning" title="แจ้งโอนแล้ว รอร้านตรวจยอด">
              บิล {phase.intent.ordCode} · ร้านกำลังตรวจยอดในบัญชี เมื่อยืนยันแล้วหน้านี้จะเปลี่ยนเป็นชำระเรียบร้อยเอง ไม่ต้องแจ้งซ้ำ
            </StateCard>
          )}

          {phase.kind === "ended" && (
            <StateCard
              tone="danger"
              title="การชำระเงินไม่สำเร็จหรือหมดเวลา"
              actions={
                <Button variant="secondary" block onClick={backToReview}>
                  กลับไปเช็กบิลใหม่
                </Button>
              }
            >
              ถ้ายังไม่ได้ชำระเงิน เลือกวิธีชำระแล้วเช็กบิลใหม่ได้เลย
            </StateCard>
          )}

          {phase.kind === "error" && (
            <StateCard
              tone="danger"
              title="เช็กบิลไม่สำเร็จ"
              actions={
                <Button variant="secondary" block onClick={backToReview}>
                  กลับไปหน้าเช็กบิล
                </Button>
              }
            >
              {phase.message}
            </StateCard>
          )}

          {phase.kind === "paid" && (
            <StateCard
              tone="done"
              title="ชำระเงินเรียบร้อย"
              actions={
                <ButtonLink href="/" size="lg" block>
                  กลับหน้าหลัก
                </ButtonLink>
              }
            >
              บิล {phase.ordCode} · {formatBaht(phase.total)} ขอบคุณที่ทานที่ Pound Bakery
            </StateCard>
          )}
        </aside>
      </main>

      <Dialog
        open={confirmOpen}
        onClose={closeConfirm}
        title="ยืนยันเช็กบิล?"
        footer={
          <>
            <Button variant="secondary" onClick={closeConfirm}>
              ยังก่อน
            </Button>
            <Button onClick={confirm}>ยืนยันเช็กบิล</Button>
          </>
        }
      >
        <p className="m-0 rounded-2xl bg-danger-soft px-4 py-3.5 text-[15px] leading-relaxed text-danger">
          เช็กบิลแล้วจะสั่งอาหารเพิ่มที่โต๊ะนี้ไม่ได้
        </p>
      </Dialog>
    </div>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 rounded-[32px] bg-ink px-6 py-14 text-center text-cream">
      <Spinner className="size-8 text-apricot" />
      <p className="m-0">{text}</p>
    </div>
  );
}
