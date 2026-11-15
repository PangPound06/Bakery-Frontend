import { cx } from "@/components/ds";
import { formatBaht } from "@/lib/dineIn";
import { needsChoice, type Availability, type MenuProduct } from "./menu";

interface Props {
  product: MenuProduct;
  /** จำนวนในรอบนี้ (ทุกตัวเลือกรวมกัน) */
  units: number;
  availability: Availability;
  /** บุฟเฟต์ — ราคารวมในบุฟเฟต์แล้ว */
  buffet: boolean;
  onAdd: () => void;
}

/** การ์ดเมนู 1 รายการ: รูป ชื่อ ราคา ปุ่ม + */
export default function MenuTile({ product, units, availability, buffet, onAdd }: Props) {
  const { blocked, note, warn, soldOut } = availability;
  const price = buffet
    ? "รวมในบุฟเฟต์"
    : `${needsChoice(product) ? "เริ่ม " : ""}${formatBaht(product.price)}`;

  return (
    <div className="relative flex flex-col gap-3 rounded-[26px] border border-line bg-white px-2.5 pt-2.5 pb-4 transition-[transform,box-shadow] duration-300 motion-safe:hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(31,26,22,0.08)]">
      <span className={cx("block aspect-square overflow-hidden rounded-[18px] bg-sand", soldOut && "opacity-45")}>
        {product.image && (
          // รูปสินค้ามาจากหลายโดเมน (ตั้งค่าใน admin) — ใช้ img ธรรมดา
          <img src={product.image} alt="" loading="lazy" className="size-full object-cover" />
        )}
      </span>
      {soldOut && (
        <span className="absolute top-[18px] left-[18px] rounded-full bg-ink px-3 py-1.5 text-[13px] font-semibold text-cream">
          หมดชั่วคราว
        </span>
      )}
      {units > 0 && (
        <span
          key={units}
          aria-label={`ในรอบนี้ ${units}`}
          className="absolute top-[18px] right-[18px] flex h-8 min-w-8 items-center justify-center rounded-full bg-brick px-2 text-sm font-bold text-white motion-safe:animate-pop"
        >
          {units}
        </span>
      )}
      <div className="flex items-center justify-between gap-2.5 px-1.5">
        <span className="min-w-0">
          <span className="block font-semibold break-words">{product.name}</span>
          <span className="mt-0.5 block text-sm text-muted">{price}</span>
          {note && <span className={cx("mt-0.5 block text-xs", warn ? "text-danger" : "text-muted")}>{note}</span>}
        </span>
        <button
          type="button"
          aria-label={`เพิ่ม ${product.name}`}
          onClick={onAdd}
          disabled={blocked}
          className="flex size-11 flex-none items-center justify-center rounded-full bg-ink text-xl text-white transition-colors hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick disabled:cursor-not-allowed disabled:bg-line disabled:text-faint"
        >
          +
        </button>
      </div>
    </div>
  );
}
