"use client";

import { useState } from "react";
import { Button, ChoiceCard, Dialog } from "@/components/ds";
import { formatBaht } from "@/lib/dineIn";
import type { CartItem } from "@/types/cart";
import { choiceFits, choicesFor, type MenuChoice, type MenuProduct } from "./menu";

interface Props {
  product: MenuProduct;
  items: CartItem[];
  buffet: boolean;
  busy: boolean;
  onConfirm: (choice: MenuChoice) => void;
  onClose: () => void;
}

/**
 * เลือกขนาดเค้ก / ตัวเลือกก่อนเพิ่มลงรอบ
 *
 * ยังไม่ได้เลือกกดยืนยันไม่ได้ และตัวเลือกที่ stock ไม่พอกดไม่ได้ตั้งแต่แรก (ป้องกันพลาดก่อนเกิด)
 * render ใหม่ทุกครั้งที่เปิด (key = id สินค้า) ค่าที่เลือกจึงเริ่มว่างเสมอ
 */
export default function ChoiceDialog({ product, items, buffet, busy, onConfirm, onClose }: Props) {
  const choices = choicesFor(product);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = choices.find((c) => c.id === selectedId && choiceFits(product, c, items)) ?? null;
  const isCake = product.category === "cake";

  return (
    <Dialog
      open
      onClose={onClose}
      title={product.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button disabled={!selected} loading={busy} onClick={() => selected && onConfirm(selected)}>
            เพิ่มลงรอบนี้
          </Button>
        </>
      }
    >
      <p className="m-0 text-[15px] text-subtle">{isCake ? "เลือกขนาดก่อนเพิ่มลงรอบนี้" : "เลือกตัวเลือกก่อนเพิ่มลงรอบนี้"}</p>
      <div role="radiogroup" aria-label={isCake ? "ขนาด" : "ตัวเลือก"} className="flex flex-col gap-2">
        {choices.map((c) => {
          const fits = choiceFits(product, c, items);
          return (
            <ChoiceCard
              key={c.id}
              checked={selected?.id === c.id}
              onSelect={() => setSelectedId(c.id)}
              disabled={!fits}
              title={c.title}
              description={fits ? c.description : "มีไม่พอสำหรับขนาดนี้"}
              trailing={buffet ? "รวมในบุฟเฟต์" : formatBaht(c.unitPrice)}
            />
          );
        })}
      </div>
    </Dialog>
  );
}
