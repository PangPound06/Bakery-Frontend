import Link from "next/link";
import type { BuffetTimer } from "@/lib/diningSession";
import type { DineType } from "@/lib/dineIn";
import BuffetTimerChip from "./BuffetTimerChip";

interface Props {
  tableNo: string;
  dineType: DineType;
  pax: number;
  timer: BuffetTimer | null;
  /** ลิงก์ฝั่งขวา (เช่น ไปหน้าเช็กบิล) */
  link?: { href: string; label: string };
}

export const dineTypeLabel = (dineType: DineType, pax: number) =>
  dineType === "buffet" ? `บุฟเฟต์ ${pax} คน` : "A la carte";

/** แถบพื้นมืดบอกโต๊ะ ประเภทการทาน และเวลาบุฟเฟต์ */
export default function DineInTopBar({ tableNo, dineType, pax, timer, link }: Props) {
  return (
    <div className="bg-ink text-cream">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <span className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-apricot px-3.5 py-1.5 font-bold text-ink">โต๊ะ {tableNo}</span>
          <span className="text-[15px]">{dineTypeLabel(dineType, pax)} · ทานที่ร้าน</span>
          {timer && <BuffetTimerChip timer={timer} tone="dark" />}
        </span>
        {link && (
          <Link href={link.href} className="py-2 text-[15px] font-semibold text-apricot hover:text-apricot-hover">
            {link.label} →
          </Link>
        )}
      </div>
    </div>
  );
}
