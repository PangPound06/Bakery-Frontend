"use client";

import { useId } from "react";
import { Button, cx, QuantityStepper } from "@/components/ds";
import { isPoundOption } from "@/components/cart/cartUtils";
import { BUFFET_MINUTES, formatBaht, MAX_NOTE_LENGTH } from "@/lib/dineIn";
import type { CartItem } from "@/types/cart";
import { rowCanIncrease } from "./menu";

interface Props {
  roundNo: number;
  items: CartItem[];
  subtotal: number;
  buffet: boolean;
  /** หมดเวลาบุฟเฟต์ — สั่งเพิ่มไม่ได้ */
  closed: boolean;
  note: string;
  onNoteChange: (note: string) => void;
  /** กำลังแก้รายการในรอบ */
  busy: boolean;
  sending: boolean;
  error: string;
  onQuantity: (item: CartItem, quantity: number) => void;
  onSend: () => void;
  /** แสดงในแผ่นเลื่อนขึ้นบนมือถือ — มีปุ่มปิดแทนป้าย "ยังไม่ได้ส่ง" */
  onClose?: () => void;
}

/** กล่องพื้นมืด "รอบที่ n" — รายการที่ยังไม่ส่ง หมายเหตุถึงครัว และปุ่มส่งเข้าครัว (ปุ่มหลักของหน้า) */
export default function RoundPanel({
  roundNo,
  items,
  subtotal,
  buffet,
  closed,
  note,
  onNoteChange,
  busy,
  sending,
  error,
  onQuantity,
  onSend,
  onClose,
}: Props) {
  const noteId = useId();
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const canSend = count > 0 && !closed && !busy;
  const sendLabel = closed ? "หมดเวลาบุฟเฟต์แล้ว" : count > 0 ? `ส่งเข้าครัว · ${count} รายการ` : "ยังไม่มีรายการ";

  return (
    <div className={cx("flex flex-col gap-4 bg-ink p-6 text-cream sm:p-7", onClose ? "rounded-t-[28px]" : "rounded-[32px]")}>
      {onClose && <span aria-hidden="true" className="-mt-2 h-[5px] w-10 self-center rounded-full bg-ink-edge" />}
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 font-display text-[26px] font-bold">รอบที่ {roundNo}</h2>
        {onClose ? (
          <Button variant="ghostOnDark" size="sm" onClick={onClose}>
            ปิด
          </Button>
        ) : (
          <span className="text-sm text-mist">ยังไม่ได้ส่ง</span>
        )}
      </div>

      {closed && (
        <p className="m-0 rounded-2xl bg-danger/40 px-4 py-3.5 text-sm leading-relaxed text-danger-line">
          หมดเวลาสั่งบุฟเฟต์ {BUFFET_MINUTES} นาทีแล้ว สั่งเพิ่มไม่ได้ · รายการที่ส่งไปแล้วยังทำต่อตามปกติ
        </p>
      )}

      {items.length === 0 ? (
        <p className="m-0 rounded-[18px] border-[1.5px] border-dashed border-ink-edge p-5 text-center text-[15px] text-mist">
          กด + ที่เมนูเพื่อเพิ่มรายการในรอบนี้
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {items.map((item) => {
            const pound = isPoundOption(item.selectedOption);
            const detail = [item.selectedOption, buffet ? "รวมในบุฟเฟต์" : formatBaht(item.subtotal)]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={item.id} className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold break-words">{item.productName}</span>
                  <span className="block text-[13px] text-faint">{detail}</span>
                </span>
                {pound ? (
                  // เค้กปอนด์เปลี่ยนจำนวนไม่ได้ (นับเป็นชิ้นใน stock) — เอาออกแล้วเลือกใหม่
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-mist">× {item.quantity}</span>
                    <Button variant="secondaryOnDark" size="sm" disabled={busy} onClick={() => onQuantity(item, 0)}>
                      เอาออก
                    </Button>
                  </span>
                ) : (
                  <QuantityStepper
                    tone="dark"
                    label={item.productName}
                    value={item.quantity}
                    onDecrease={() => onQuantity(item, item.quantity - 1)}
                    onIncrease={() => onQuantity(item, item.quantity + 1)}
                    decreaseDisabled={busy}
                    increaseDisabled={busy || closed || !rowCanIncrease(item, items)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <label htmlFor={noteId} className="flex flex-col gap-1.5 text-[13px] text-mist">
        <span className="flex justify-between">
          <span>หมายเหตุถึงครัว (ไม่บังคับ)</span>
          <span aria-hidden="true">
            {note.length}/{MAX_NOTE_LENGTH}
          </span>
        </span>
        <input
          id={noteId}
          type="text"
          value={note}
          maxLength={MAX_NOTE_LENGTH}
          onChange={(e) => onNoteChange(e.target.value)}
          disabled={closed}
          placeholder="เช่น ไม่หวาน แยกจาน"
          className="h-[46px] rounded-xl border border-ink-edge bg-ink-soft px-3.5 text-[15px] text-cream placeholder:text-muted focus:border-apricot focus:outline-none disabled:opacity-50"
        />
      </label>

      <div className="flex items-baseline justify-between border-t border-ink-line pt-3.5">
        <span className="text-mist">{count} รายการ</span>
        <span className="text-[22px] font-bold">{buffet ? "รวมในบุฟเฟต์" : formatBaht(subtotal)}</span>
      </div>

      {error && (
        <p role="alert" className="m-0 rounded-2xl bg-ink-soft px-4 py-3 text-sm text-apricot">
          {error}
        </p>
      )}

      <Button variant="primaryOnDark" size="lg" block disabled={!canSend} loading={sending} onClick={onSend}>
        {sendLabel}
      </Button>
    </div>
  );
}
