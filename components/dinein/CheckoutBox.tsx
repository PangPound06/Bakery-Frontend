"use client";

import { Button, ChoiceCard } from "@/components/ds";
import { formatBaht } from "@/lib/dineIn";
import type { CheckoutMethod } from "@/lib/paymentIntent";

/** วิธีจ่ายบิล — สามแบบแรกจ่ายเองผ่านระบบ ส่วน staff เรียกพนักงานมาเก็บเงินที่โต๊ะ */
export type BillMethod = CheckoutMethod | "staff";

const METHODS: { value: BillMethod; title: string; description: string }[] = [
  { value: "promptpay", title: "QR พร้อมเพย์ · ยืนยันอัตโนมัติ", description: "สแกนจ่าย ระบบรู้เองเมื่อเงินเข้า ไม่ต้องแนบสลิป" },
  { value: "card", title: "บัตรเครดิต / เดบิต", description: "กรอกบัตรผ่าน Stripe" },
  { value: "transfer", title: "โอนพร้อมเพย์ · ร้านยืนยัน", description: "โอนเข้าบัญชีร้าน แนบสลิป แล้วรอร้านตรวจยอด" },
  { value: "staff", title: "ชำระกับพนักงาน", description: "เงินสดหรือ QR ที่เครื่องของร้าน" },
];

interface Props {
  total: number;
  /** จำนวนรอบที่ครัวยังทำไม่เสร็จ — มากกว่า 0 เช็กบิลไม่ได้ */
  cooking: number;
  /** ยังไม่ได้สั่งอะไรเลย */
  empty: boolean;
  method: BillMethod | null;
  onMethod: (method: BillMethod) => void;
  onCheck: () => void;
}

/** กล่องพื้นมืด "เช็กบิล" — เลือกวิธีชำระแล้วกดเช็กบิล (ปุ่มหลักของหน้า) */
export default function CheckoutBox({ total, cooking, empty, method, onMethod, onCheck }: Props) {
  const locked = cooking > 0 || empty;
  const label = empty ? "ยังไม่มีรายการ" : cooking > 0 ? `รอครัวอีก ${cooking} รอบ` : method ? "เช็กบิล" : "เลือกวิธีชำระก่อน";

  return (
    <div className="flex flex-col gap-4 rounded-[32px] bg-ink p-6 text-cream motion-safe:animate-rise sm:p-7">
      <h2 className="m-0 font-display text-[26px] font-bold">เช็กบิล</h2>
      <div className="flex items-baseline justify-between">
        <span className="text-mist">ยอดชำระ</span>
        <span className="text-[30px] font-bold">{formatBaht(total)}</span>
      </div>
      {cooking > 0 && (
        <p className="m-0 rounded-2xl bg-ink-soft px-4 py-3.5 text-sm leading-relaxed text-apricot">
          ยังมีรอบที่ครัวกำลังทำ เช็กบิลได้เมื่อทุกรอบเสร็จแล้ว
        </p>
      )}
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 p-0 text-sm text-mist">ชำระด้วย</legend>
        <div role="radiogroup" aria-label="วิธีชำระเงิน" className="flex flex-col gap-2">
          {METHODS.map((m) => (
            <ChoiceCard
              key={m.value}
              tone="dark"
              checked={method === m.value}
              onSelect={() => onMethod(m.value)}
              disabled={locked}
              title={m.title}
              description={m.description}
            />
          ))}
        </div>
      </fieldset>
      <p className="m-0 text-[13px] text-mist">เมื่อเช็กบิลแล้วจะสั่งอาหารเพิ่มไม่ได้</p>
      <Button variant="primaryOnDark" size="lg" block disabled={locked || !method} onClick={onCheck}>
        {label}
      </Button>
    </div>
  );
}
