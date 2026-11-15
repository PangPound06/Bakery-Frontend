import { cx } from "./cx";

/** วงหมุนรอโหลด — สีตามตัวอักษรรอบข้าง (currentColor) */
export default function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-block size-5 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin",
        className,
      )}
    />
  );
}
