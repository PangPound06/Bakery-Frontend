import type { ReactNode } from "react";
import { cx } from "./cx";

interface Props {
  checked: boolean;
  onSelect: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** ข้อความชิดขวา เช่น ราคา */
  trailing?: ReactNode;
  disabled?: boolean;
  /** dark = อยู่ในกล่องพื้นมืด */
  tone?: "light" | "dark";
}

/**
 * ตัวเลือกแบบเลือกได้อันเดียว (radio) หน้าตาเป็นการ์ด
 *
 * วางหลายใบใน <div role="radiogroup" aria-label="..."> เสมอ
 */
export default function ChoiceCard({ checked, onSelect, title, description, trailing, disabled, tone = "light" }: Props) {
  const dark = tone === "dark";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={cx(
        "flex min-h-15 w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-2.5 text-left transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45",
        dark
          ? cx("text-cream focus-visible:outline-apricot", checked ? "border-apricot bg-ink-soft" : "border-ink-edge")
          : cx("text-ink focus-visible:outline-brick", checked ? "border-brick bg-warn-bg" : "border-line bg-white"),
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "size-5 flex-none rounded-full",
          checked
            ? cx("border-[6px]", dark ? "border-apricot" : "border-brick bg-white")
            : cx("border-2", dark ? "border-muted" : "border-line-strong"),
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        {description && (
          <span className={cx("mt-0.5 block text-[13px]", dark ? "text-faint" : "text-muted")}>{description}</span>
        )}
      </span>
      {trailing && <span className="flex-none font-semibold">{trailing}</span>}
    </button>
  );
}
