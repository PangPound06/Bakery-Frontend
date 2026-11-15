"use client";

import { useId, type ReactNode } from "react";
import { cx } from "./cx";
import { useModal } from "./useModal";

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** ปุ่มด้านล่าง — มือถือเรียงเต็มความกว้าง เดสก์ท็อปชิดขวา */
  footer?: ReactNode;
  /** กดพื้นหลังเพื่อปิดได้ไหม (ปิดไว้สำหรับขั้นตอนที่ต้องตัดสินใจ) */
  dismissible?: boolean;
}

/**
 * กล่องโต้ตอบ — มือถือเป็นแผ่นเลื่อนขึ้นจากล่าง จอใหญ่เป็นกล่องกลางจอ
 *
 * ปิดด้วย Esc ได้เสมอ และล็อกการเลื่อนหน้าหลังขณะเปิด
 */
export default function Dialog({ open, onClose, title, children, footer, dismissible = true }: Props) {
  const titleId = useId();
  useModal(open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/45 backdrop-blur-sm motion-safe:animate-fade sm:items-center sm:p-6"
      onClick={dismissible ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={cx(
          "flex max-h-[90vh] w-full flex-col gap-3.5 overflow-y-auto bg-cream px-5 pt-3 pb-6 font-body text-ink",
          "rounded-t-[28px] motion-safe:animate-sheet",
          "sm:max-w-[440px] sm:rounded-[32px] sm:p-8 sm:motion-safe:animate-rise",
        )}
      >
        <span aria-hidden="true" className="h-[5px] w-10 self-center rounded-full bg-line-strong sm:hidden" />
        <h2 id={titleId} className="m-0 font-display text-2xl font-bold sm:text-[28px]">
          {title}
        </h2>
        {children}
        {footer && <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}
