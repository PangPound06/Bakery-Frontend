import Link from "next/link";
import { StatusChip } from "@/components/ds";
import { roundStatusView, type Round } from "@/lib/dineIn";

/** รายการรอบที่ส่งเข้าครัวแล้ว พร้อมสถานะจากครัว (ล่าสุดอยู่บน) */
export default function SentRounds({ rounds }: { rounds: Round[] }) {
  if (rounds.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5 rounded-[26px] border border-line bg-white px-5 py-5 sm:px-6">
      <p className="m-0 text-sm font-bold">ส่งเข้าครัวแล้ว</p>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {rounds
          .map((round, index) => ({ round, n: index + 1 }))
          .reverse()
          .map(({ round, n }) => {
            const status = roundStatusView(round.orderStatus);
            const count = round.items.reduce((sum, i) => sum + i.quantity, 0);
            return (
              <li key={round.id} className="flex items-center justify-between gap-2.5 text-[15px]">
                <span>
                  รอบที่ {n} · {count} รายการ
                </span>
                <StatusChip tone={status.tone} live={status.live}>
                  {status.label}
                </StatusChip>
              </li>
            );
          })}
      </ul>
      <Link href="/dine-in/bill" className="self-start border-b-[1.5px] border-ink py-2 font-semibold hover:border-brick hover:text-brick">
        ดูออเดอร์และเช็กบิล
      </Link>
    </div>
  );
}
