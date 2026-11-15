"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BuffetTimerChip from "@/components/dinein/BuffetTimerChip";
import { useBuffetTimer } from "@/lib/diningSession";
import { DINE_KEYS } from "@/lib/dineIn";
import { useOrderMode, useStoredValue } from "@/lib/useOrderMode";

/**
 * ป้ายลอยมุมขวาบนระหว่างทานที่ร้าน — บอกโต๊ะ เวลาบุฟเฟต์ และพากลับไปหน้าสั่ง/เช็กบิล
 *
 * ซ่อนในหน้า /dine-in* (มีแถบของตัวเองแล้ว) และหน้า admin
 */
export default function DineInBar() {
  const pathname = usePathname() ?? "";
  const isDineIn = useOrderMode() === "dinein";
  const tableNo = useStoredValue(DINE_KEYS.table);
  const isBuffet = useStoredValue(DINE_KEYS.type) === "buffet";
  const hidden = !isDineIn || !tableNo || pathname.startsWith("/admin") || pathname.startsWith("/dine-in");
  const timer = useBuffetTimer(!hidden && isBuffet, tableNo);

  if (hidden) return null;

  return (
    <div className="fixed top-[72px] right-4 z-50 flex flex-col items-end gap-1.5 font-body md:right-8 lg:right-10">
      {timer && <BuffetTimerChip timer={timer} tone="light" />}
      <span className="flex gap-2">
        <Link
          href="/dine-in"
          className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-cream shadow-lg transition-colors hover:bg-ink-soft"
        >
          <span className="rounded-full bg-apricot px-2 py-0.5 text-ink">โต๊ะ {tableNo}</span>
          สั่งอาหาร
        </Link>
        <Link
          href="/dine-in/bill"
          className="flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink shadow-lg transition-colors hover:border-brick hover:text-brick"
        >
          เช็กบิล
        </Link>
      </span>
    </div>
  );
}
