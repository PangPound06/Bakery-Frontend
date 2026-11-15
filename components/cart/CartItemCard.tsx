"use client";

import { QuantityStepper, Spinner } from "@/components/ds";
import { formatBaht } from "@/lib/dineIn";
import type { CartItem } from "@/types/cart";
import { canIncrease, FRESH_STOCK, isPoundOption } from "./cartUtils";

interface Props {
  item: CartItem;
  /** ทุกแถวในตะกร้า — ใช้นับสินค้าทำสดรวมทุกตัวเลือก */
  allItems: CartItem[];
  busy: boolean;
  onQuantity: (quantity: number) => void;
  /** ขอลบ (หน้าจอถามยืนยันก่อน) */
  onRemove: () => void;
}

/** สินค้า 1 แถวในตะกร้า — เค้กปอนด์เปลี่ยนจำนวนไม่ได้ ต้องลบแล้วเลือกขนาดใหม่ */
export default function CartItemCard({ item, allItems, busy, onQuantity, onRemove }: Props) {
  const pound = isPoundOption(item.selectedOption);
  const stockNote = item.stock === FRESH_STOCK ? "ทำสด · สูงสุด 10" : `เหลือ ${item.stock} ชิ้น`;

  return (
    <li className="flex flex-wrap items-center gap-4 rounded-[28px] border border-line bg-white p-3.5 sm:gap-5">
      <span className="size-20 flex-none overflow-hidden rounded-[20px] bg-sand sm:size-28">
        {item.image && (
          // รูปสินค้ามาจากหลายโดเมน (ตั้งค่าใน admin) — ใช้ img ธรรมดา
          <img src={item.image} alt="" className="size-full object-cover" />
        )}
      </span>
      <div className="min-w-0 flex-[1_1_180px]">
        <p className="m-0 text-lg font-semibold break-words">{item.productName}</p>
        <p className="m-0 mt-1 text-sm text-muted">{[item.selectedOption, stockNote].filter(Boolean).join(" · ")}</p>
        <p className="m-0 mt-2.5 font-semibold">{formatBaht(item.subtotal)}</p>
        {pound && <p className="m-0 mt-1 text-xs text-muted">เค้กปอนด์เปลี่ยนจำนวนไม่ได้ — ลบแล้วเลือกขนาดใหม่ที่หน้าสินค้า</p>}
      </div>
      <div className="flex items-center gap-3">
        {busy && <Spinner className="size-4 text-brick" />}
        {pound ? (
          <span className="min-w-12 text-center font-semibold">× {item.quantity}</span>
        ) : (
          <QuantityStepper
            label={item.productName}
            value={item.quantity}
            onDecrease={() => onQuantity(item.quantity - 1)}
            onIncrease={() => onQuantity(item.quantity + 1)}
            decreaseDisabled={busy || item.quantity <= 1}
            increaseDisabled={busy || !canIncrease(item, allItems)}
          />
        )}
        <button
          type="button"
          aria-label={`ลบ ${item.productName}`}
          onClick={onRemove}
          disabled={busy}
          className="flex size-11 items-center justify-center rounded-full bg-sand text-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />
          </svg>
        </button>
      </div>
    </li>
  );
}
