import Link from "next/link";
import { cx } from "@/components/ds";
import { formatBaht } from "@/lib/dineIn";

interface ProductOption {
  name: string;
  extraPrice: number;
}

interface Product {
  id: number;
  name: string;
  type: string;
  category: string;
  price: number;
  img: string;
  description?: string;
  stockQuantity?: number;
  isAvailable?: boolean;
  /** JSON string ของ ProductOption[] */
  options?: string | null;
}

const FRESH_STOCK_VALUE = 9999;
/** เหลือน้อยกว่าหรือเท่านี้ บอกจำนวนที่เหลือ */
const LOW_STOCK = 5;

const optionCount = (raw?: string | null) => {
  if (!raw) return 0;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProductOption[]).length : 0;
  } catch {
    return 0;
  }
};

/** URL หน้าสินค้า — ชื่อสินค้าแทนช่องว่างด้วย "-" (ตรงกับ [category]/[name]) */
export const productHref = (category: string, name: string) => `/${category}/${name.replace(/\s+/g, "-")}`;

/**
 * การ์ดสินค้า — ทั้งใบกดไปหน้าสินค้า (เลือกขนาด/ตัวเลือกแล้วเพิ่มลงตะกร้าที่นั่น)
 *
 * ของหมด: รูปจางและมีป้าย "หมดชั่วคราว" · เหลือน้อย: บอกจำนวนที่เหลือ
 */
export default function ProductCard({
  name,
  type,
  category,
  price,
  img,
  description,
  stockQuantity = 10,
  isAvailable = true,
  options,
}: Product) {
  const fresh = stockQuantity === FRESH_STOCK_VALUE;
  const soldOut = !isAvailable || (!fresh && stockQuantity <= 0);
  const low = !fresh && !soldOut && stockQuantity <= LOW_STOCK;
  const hasChoices = category === "cake" || optionCount(options) > 0;

  const note = soldOut ? "หมดชั่วคราว" : low ? `เหลือ ${stockQuantity} ชิ้น` : fresh ? "ทำสดทุกแก้ว" : hasChoices ? "มีให้เลือก" : "";

  return (
    <Link
      href={productHref(category, name)}
      className="group relative flex h-full flex-col gap-3.5 rounded-[28px] border border-line bg-white px-2.5 pt-2.5 pb-4.5 text-ink transition-[transform,box-shadow] duration-300 hover:shadow-[0_16px_36px_rgba(31,26,22,0.09)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick motion-safe:hover:-translate-y-1"
    >
      <span className={cx("block aspect-[4/5] overflow-hidden rounded-[20px] bg-sand", soldOut && "opacity-45")}>
        {img && (
          // รูปสินค้ามาจากหลายโดเมน (ตั้งค่าใน admin) — ใช้ img ธรรมดา
          <img
            src={img}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
          />
        )}
      </span>
      <span className="absolute top-[22px] left-[22px] flex flex-wrap gap-1.5">
        {soldOut ? (
          <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-cream">หมดชั่วคราว</span>
        ) : (
          type && <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink">{type}</span>
        )}
      </span>
      <span className="flex items-center justify-between gap-3 px-2">
        <span className="min-w-0">
          <span className="block text-[17px] font-semibold break-words">{name}</span>
          <span className="mt-1 block text-[15px] text-muted">
            {hasChoices ? "เริ่ม " : ""}
            {formatBaht(price)}
          </span>
          {note && <span className={cx("mt-0.5 block text-xs", soldOut || low ? "text-danger" : "text-muted")}>{note}</span>}
          {description && <span className="sr-only">{description}</span>}
        </span>
        <span
          aria-hidden="true"
          className={cx(
            "flex size-11 flex-none items-center justify-center rounded-full text-xl transition-colors",
            soldOut ? "bg-line text-faint" : "bg-ink text-white group-hover:bg-brick",
          )}
        >
          →
        </span>
      </span>
    </Link>
  );
}
