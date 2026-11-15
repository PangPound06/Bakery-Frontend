import { cx } from "@/components/ds";
import { formatDuration, type BuffetTimer } from "@/lib/diningSession";

/** เหลือน้อยกว่านี้ (วินาที) เปลี่ยนเป็นสีเตือน */
const WARN_SECONDS = 10 * 60;

/**
 * เวลาบุฟเฟต์ที่เหลือ — แค่แสดงผล การห้ามสั่งตัดสินที่ backend
 *
 * @param tone dark = อยู่บนแถบพื้นมืด
 */
export default function BuffetTimerChip({ timer, tone }: { timer: BuffetTimer; tone: "dark" | "light" }) {
  const warn = !timer.notStarted && !timer.expired && timer.secondsLeft <= WARN_SECONDS;
  const text = timer.notStarted
    ? `บุฟเฟต์ ${timer.totalMinutes} นาที · เริ่มนับเมื่อส่งรอบแรก`
    : timer.expired
      ? "หมดเวลาสั่งแล้ว"
      : `เหลือเวลาสั่ง ${formatDuration(timer.secondsLeft)}`;

  const style =
    tone === "dark"
      ? timer.expired
        ? "bg-error text-white"
        : warn
          ? "bg-apricot text-ink"
          : "border border-ink-edge bg-ink-soft text-apricot"
      : timer.expired
        ? "bg-danger-soft text-danger"
        : warn
          ? "bg-warn-soft text-warn-ink"
          : "border border-line bg-white text-warn-ink";

  return (
    <span
      role="timer"
      aria-live="off"
      className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold", style)}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5M9 2h6" />
      </svg>
      {text}
    </span>
  );
}
