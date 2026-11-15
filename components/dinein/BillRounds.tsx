import { StatusChip } from "@/components/ds";
import { BUFFET_PRICE_PER_PERSON, formatBaht, formatClock, roundStatusView, type Round } from "@/lib/dineIn";

interface Props {
  rounds: Round[];
  buffet: boolean;
  pax: number;
}

/** ยอดที่แสดงให้ลูกค้าดู — ยอดที่ต้องจ่ายจริง server คิดใหม่ตอนเช็กบิล */
export const billTotalOf = (rounds: Round[], buffet: boolean, pax: number) =>
  buffet ? BUFFET_PRICE_PER_PERSON * pax : rounds.reduce((sum, r) => sum + r.total, 0);

/** รายการทุกรอบของโต๊ะพร้อมสถานะจากครัว และยอดรวม */
export default function BillRounds({ rounds, buffet, pax }: Props) {
  const total = billTotalOf(rounds, buffet, pax);
  return (
    <div className="rounded-[28px] border border-line bg-white px-5 py-1.5 sm:px-7">
      <ol className="m-0 list-none p-0">
        {rounds.map((round, index) => {
          const status = roundStatusView(round.orderStatus);
          return (
            <li key={round.id} className="border-b border-dashed border-line-strong py-4.5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-bold">
                  รอบที่ {index + 1} · {formatClock(round.createdAt)} น.
                </span>
                <StatusChip tone={status.tone} live={status.live}>
                  {status.label}
                </StatusChip>
              </div>
              <ul className="m-0 list-none p-0">
                {round.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3 py-1 text-base">
                    <span className="min-w-0 break-words">
                      {item.productName}
                      {item.selectedOption && <span className="text-muted"> · {item.selectedOption}</span>}
                      <span className="text-muted"> × {item.quantity}</span>
                    </span>
                    <span className="flex-none font-semibold">
                      {buffet ? "รวมในบุฟเฟต์" : formatBaht(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              {round.note && <p className="m-0 mt-1.5 text-sm text-muted">หมายเหตุ: {round.note}</p>}
            </li>
          );
        })}
      </ol>
      <div className="flex items-baseline justify-between gap-3 py-5">
        <span>
          {buffet ? `บุฟเฟต์ ${BUFFET_PRICE_PER_PERSON.toLocaleString("th-TH")} ฿ × ${pax} คน` : "รวมทั้งโต๊ะ"}
        </span>
        <span className="text-[28px] font-bold sm:text-[32px]">{formatBaht(total)}</span>
      </div>
    </div>
  );
}
