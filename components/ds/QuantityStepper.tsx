import { cx } from "./cx";

interface Props {
  value: number;
  /** ชื่อสินค้า — ใช้ใน aria-label ของปุ่ม */
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
  increaseDisabled?: boolean;
  decreaseDisabled?: boolean;
  /** dark = อยู่ในกล่องพื้นมืด */
  tone?: "light" | "dark";
}

/** ปุ่ม − จำนวน + (ห้ามพิมพ์จำนวนเอง — หลักการออกแบบ ข้อ 4) */
export default function QuantityStepper({
  value,
  label,
  onDecrease,
  onIncrease,
  increaseDisabled,
  decreaseDisabled,
  tone = "light",
}: Props) {
  const dark = tone === "dark";
  const button = cx(
    "flex h-11 w-10 items-center justify-center text-lg transition-colors disabled:cursor-not-allowed",
    dark ? "text-cream disabled:text-ink-edge" : "text-brick disabled:text-line-strong",
  );
  return (
    <div
      className={cx(
        "flex h-11 items-center rounded-full border",
        dark ? "border-ink-edge" : "border-[1.5px] border-brick",
      )}
    >
      <button type="button" aria-label={`ลด ${label}`} onClick={onDecrease} disabled={decreaseDisabled} className={button}>
        −
      </button>
      <span aria-live="polite" className={cx("min-w-6 text-center font-semibold", dark ? "text-cream" : "text-brick")}>
        {value}
      </span>
      <button type="button" aria-label={`เพิ่ม ${label}`} onClick={onIncrease} disabled={increaseDisabled} className={button}>
        +
      </button>
    </div>
  );
}
