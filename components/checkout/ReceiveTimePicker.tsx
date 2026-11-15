import { cx } from "@/components/ds";
import { ASAP, type ReceiveSlot } from "@/lib/checkout";

interface Props {
  legend: string;
  asapAvailable: boolean;
  slots: ReceiveSlot[];
  /** ASAP / slot.value / null = ยังไม่ได้เลือก */
  value: string | null;
  onChange: (value: string) => void;
}

const DAY_LABEL: Record<ReceiveSlot["day"], string> = { today: "วันนี้", tomorrow: "พรุ่งนี้" };

/** เลือกเวลารับสินค้าเป็นปุ่ม (ไม่มีช่องพิมพ์เวลา) แยกเป็นวันนี้ / พรุ่งนี้ */
export default function ReceiveTimePicker({ legend, asapAvailable, slots, value, onChange }: Props) {
  const days = (["today", "tomorrow"] as const)
    .map((day) => ({ day, slots: slots.filter((s) => s.day === day) }))
    .filter((g) => g.slots.length > 0 || (g.day === "today" && asapAvailable));

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="mb-1 p-0 text-sm text-muted">{legend}</legend>
      {days.map((group) => (
        <div key={group.day} className="flex min-w-0 flex-col gap-2">
          <p className="m-0 text-[13px] font-semibold text-muted">{DAY_LABEL[group.day]}</p>
          <div role="radiogroup" aria-label={`${legend} ${DAY_LABEL[group.day]}`} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {group.day === "today" && asapAvailable && (
              <Chip label="เร็วที่สุด" checked={value === ASAP} onSelect={() => onChange(ASAP)} />
            )}
            {group.slots.map((s) => (
              <Chip key={s.value} label={`${s.time} น.`} checked={value === s.value} onSelect={() => onChange(s.value)} />
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  );
}

function Chip({ label, checked, onSelect }: { label: string; checked: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cx(
        "min-h-11 flex-none rounded-full border-[1.5px] px-4 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick",
        checked ? "border-ink bg-ink text-cream" : "border-line-strong bg-white text-ink hover:border-ink",
      )}
    >
      {label}
    </button>
  );
}
