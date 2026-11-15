import type { ReactNode } from "react";
import { cx } from "@/components/ds";

type Tone = "success" | "warning" | "done" | "danger";

const CIRCLE: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warn-soft text-warn-ink",
  done: "bg-success text-white",
  danger: "bg-danger-soft text-danger",
};

const ICON: Record<Tone, ReactNode> = {
  success: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0" />,
  warning: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  done: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  danger: <path d="M12 8v5M12 16.5v.5M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />,
};

interface Props {
  tone: Tone;
  title: string;
  children?: ReactNode;
  /** ปุ่มด้านล่าง */
  actions?: ReactNode;
}

/** การ์ดสถานะหลังเช็กบิล (เรียกพนักงาน / รอร้านตรวจยอด / ชำระแล้ว / ไม่สำเร็จ) */
export default function StateCard({ tone, title, children, actions }: Props) {
  return (
    <div className="flex flex-col gap-3.5 rounded-[32px] border border-line bg-white p-7 motion-safe:animate-rise sm:p-8">
      <span className={cx("flex size-14 items-center justify-center rounded-full", CIRCLE[tone])}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {ICON[tone]}
        </svg>
      </span>
      <h2 className="m-0 font-display text-[26px] font-bold">{title}</h2>
      {children && <div className="text-[15px] leading-relaxed text-subtle">{children}</div>}
      {actions && <div className="flex flex-col gap-2.5 pt-1">{actions}</div>}
    </div>
  );
}
