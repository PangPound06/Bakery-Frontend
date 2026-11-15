"use client";

import { useState } from "react";
import { PencilIcon, TrashIcon } from "./icons";
import { formatPrice, splitQty } from "./orderUtils";
import type { OrderItem } from "./types";

interface Props {
  item: OrderItem;
  /** order ยังไม่จ่าย — แก้จำนวน/ลบได้ */
  editable: boolean;
  /** order จ่ายแล้ว — ตัดออกได้ผ่านการคืนเงินเท่านั้น */
  refundable: boolean;
  /** quantity เป็นจำนวน "ออเดอร์" */
  onSaveQuantity: (item: OrderItem, quantity: number) => Promise<void>;
  onRemove: (item: OrderItem) => void;
  onRefund: (item: OrderItem) => void;
}

const ICON_BUTTON = "p-1.5 rounded-lg transition-colors";

export default function OrderItemRow({ item, editable, refundable, onSaveQuantity, onRemove, onRefund }: Props) {
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const { cancelled, active } = splitQty(item);
  const allCancelled = active === 0;
  // รายการที่คืนเงินไปแล้วห้ามแก้ — ยอดจะไม่ตรงกับที่คืนไป
  const canEdit = editable && cancelled === 0;

  const startEditing = () => {
    setQuantity(active);
    setEditing(true);
  };

  const save = async () => {
    await onSaveQuantity(item, quantity);
    setEditing(false);
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg gap-2 ${allCancelled ? "bg-sand" : "bg-warn-bg"}`}
    >
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${allCancelled ? "text-muted line-through" : "text-body"}`}>
          {item.productName}
        </p>
        {item.selectedOption && (
          <span className="inline-block px-2 py-0.5 bg-new-soft text-new-ink text-xs rounded-full mt-0.5">
            {item.selectedOption}
          </span>
        )}
        {cancelled > 0 && (
          <span className="inline-block px-2 py-0.5 bg-danger-soft text-error text-xs rounded-full mt-0.5 ml-1">
            คืนเงินแล้ว {cancelled}
          </span>
        )}
        {editing ? (
          <QuantityStepper value={quantity} unitPrice={item.price} onChange={setQuantity} />
        ) : (
          <p className="text-xs text-muted mt-0.5">
            {allCancelled ? "ยกเลิกทั้งรายการแล้ว" : `฿${formatPrice(item.price)} x ${active}`}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            <button
              onClick={save}
              className="px-3 py-1.5 bg-ok hover:bg-ok text-white rounded-lg text-xs font-bold"
            >
              ✓ บันทึก
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 bg-sand hover:bg-line text-subtle rounded-lg text-xs font-medium"
            >
              ยกเลิก
            </button>
          </>
        ) : (
          <>
            <p className={`font-semibold ${allCancelled ? "text-muted" : "text-brick"}`}>
              ฿{formatPrice(item.price * active)}
            </p>
            {canEdit && (
              <>
                <button
                  onClick={startEditing}
                  className={`${ICON_BUTTON} bg-warn-soft text-brick hover:bg-warn-line`}
                  title="แก้ไขจำนวน"
                >
                  <PencilIcon />
                </button>
                <button
                  onClick={() => onRemove(item)}
                  className={`${ICON_BUTTON} bg-danger-soft text-error hover:bg-danger-line`}
                  title="ลบสินค้านี้"
                >
                  <TrashIcon />
                </button>
              </>
            )}
            {refundable && !allCancelled && (
              <button
                onClick={() => onRefund(item)}
                className={`${ICON_BUTTON} bg-danger-soft text-error hover:bg-danger-line`}
                title="ตัดรายการนี้ออกและคืนเงิน"
              >
                <TrashIcon />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function QuantityStepper({
  value,
  unitPrice,
  onChange,
}: {
  value: number;
  unitPrice: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-7 h-7 rounded-full bg-warn-line hover:bg-apricot text-ink font-bold flex items-center justify-center"
      >
        −
      </button>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className="w-14 text-center border border-line-strong rounded-lg py-0.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brick"
      />
      <button
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-full bg-brick hover:bg-brick-hover text-white font-bold flex items-center justify-center"
      >
        +
      </button>
      <span className="text-xs text-brick font-semibold ml-1">= ฿{formatPrice(unitPrice * value)}</span>
    </div>
  );
}
