import Link from "next/link";
import { cx } from "@/components/ds";

const STEPS = ["ตะกร้า", "ชำระเงิน", "เสร็จสิ้น"] as const;

/** ขั้นตอนสั่งซื้อ 1 ตะกร้า · 2 ชำระเงิน · 3 เสร็จสิ้น — ขั้นที่ผ่านแล้วกดย้อนกลับได้เฉพาะตะกร้า */
export default function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="m-0 mb-6 flex list-none flex-wrap gap-2 p-0 text-sm sm:mb-8" aria-label="ขั้นตอนการสั่งซื้อ">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const text = `${n} · ${label}`;
        if (n === current)
          return (
            <li key={label} aria-current="step" className="rounded-full bg-ink px-4 py-2 font-semibold text-cream">
              {text}
            </li>
          );
        if (n === 1 && current === 2)
          return (
            <li key={label}>
              <Link href="/cart" className="inline-flex rounded-full border border-line bg-white px-4 py-2 text-muted hover:text-brick">
                {text}
              </Link>
            </li>
          );
        return (
          <li
            key={label}
            className={cx(
              "rounded-full px-4 py-2",
              n < current ? "border border-line bg-white text-muted" : "border border-dashed border-line-strong text-muted",
            )}
          >
            {text}
          </li>
        );
      })}
    </ol>
  );
}
