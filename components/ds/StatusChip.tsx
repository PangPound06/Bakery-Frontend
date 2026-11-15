import type { ReactNode } from "react";
import { cx } from "./cx";

export type ChipTone = "success" | "warning" | "info" | "danger" | "neutral";

const TONES: Record<ChipTone, string> = {
  success: "bg-success-soft text-success-ink",
  warning: "bg-warn-soft text-warn-ink",
  info: "bg-new-soft text-new-ink",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-sand text-muted",
};

interface Props {
  tone: ChipTone;
  /** จุดกะพริบหน้าข้อความ — สถานะที่ยังเปลี่ยนอยู่ เช่น "กำลังทำ" */
  live?: boolean;
  children: ReactNode;
  className?: string;
}

/** ป้ายสถานะเล็ก เช่น เสร็จแล้ว / กำลังทำ / รอครัวรับ */
export default function StatusChip({ tone, live, children, className }: Props) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {live && <span aria-hidden="true" className="size-[7px] rounded-full bg-current motion-safe:animate-blink" />}
      {children}
    </span>
  );
}
