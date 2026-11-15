"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ChoiceCard, cx, QuantityStepper } from "@/components/ds";
import { authHeaders, getToken } from "@/lib/auth";
import {
  BUFFET_MINUTES,
  BUFFET_PRICE_PER_PERSON,
  DINE_KEYS,
  formatBaht,
  MAX_BUFFET_PAX,
  parseDineType,
  parsePax,
  saveDineSelection,
  switchToOnline,
  TABLE_GROUPS,
  tableCapacity,
  type DineType,
} from "@/lib/dineIn";

/** มื้อที่ยังไม่จ่ายของลูกค้า (จาก GET /api/dinein/my-orders) — ต้องกลับโต๊ะเดิม ห้ามเปิดโต๊ะใหม่ */
interface OpenMeal {
  tableNo: string;
  dineType: DineType;
}

type Step = "mode" | "dine";

/**
 * เลือกว่าจะสั่งกลับบ้าน หรือทานที่ร้าน (เลือกโต๊ะ → ประเภท → จำนวนคน)
 *
 * ทุกช่องเป็นปุ่มให้เลือก ไม่มีช่องพิมพ์ — เลือกครบแล้วปุ่มเริ่มสั่งถึงจะกดได้
 * ถ้ามีมื้อที่ยังไม่จ่ายค้างอยู่ ให้กลับโต๊ะเดิมเท่านั้น (backend ผูกบิลกับโต๊ะนั้น)
 */
export default function OrderModePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("mode");
  const [openMeal, setOpenMeal] = useState<OpenMeal | null>(null);
  const [table, setTable] = useState<number | null>(null);
  const [dineType, setDineType] = useState<DineType | null>(null);
  const [pax, setPax] = useState(1);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dinein/my-orders`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return;
        const open = (data as { tableNo?: string; dineType?: string | null; orderStatus?: string }[]).find(
          (o) => o.orderStatus !== "cancelled" && o.tableNo,
        );
        if (open?.tableNo) setOpenMeal({ tableNo: open.tableNo, dineType: parseDineType(open.dineType) });
      })
      .catch(() => {
        /* เช็กไม่ได้ก็เลือกโหมดตามปกติ — backend กันเปิดบิลซ้อนอยู่แล้ว */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const capacity = table ? Math.min(tableCapacity(table), MAX_BUFFET_PAX) : 1;
  const ready = table !== null && dineType !== null;

  const pickTable = (n: number) => {
    setTable(n);
    setPax((p) => Math.min(p, Math.min(tableCapacity(n), MAX_BUFFET_PAX)));
  };

  const goOnline = () => {
    setLeaving(true);
    switchToOnline();
    router.push("/");
  };

  const startDineIn = () => {
    if (table === null || dineType === null) return;
    setLeaving(true);
    saveDineSelection({ tableNo: String(table), dineType, pax: dineType === "buffet" ? pax : 1 });
    router.push("/dine-in");
  };

  const resumeMeal = (meal: OpenMeal) => {
    setLeaving(true);
    saveDineSelection({ ...meal, pax: parsePax(localStorage.getItem(DINE_KEYS.pax)) });
    router.push("/dine-in");
  };

  return (
    <div className="min-h-screen bg-cream px-4 py-10 font-body text-ink sm:py-16">
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <header className="flex flex-col gap-2">
          <Link href="/" className="self-start text-sm font-semibold text-muted hover:text-brick">
            ← Pound Bakery
          </Link>
          <h1 className="m-0 font-display text-[32px] font-bold sm:text-[44px]">
            {step === "mode" ? "วันนี้สั่งแบบไหนดี" : "ทานที่ร้าน"}
          </h1>
          <p className="m-0 text-subtle">
            {step === "mode" ? "เลือกได้ทุกเมื่อ เปลี่ยนภายหลังได้จากหน้านี้" : "เลือกโต๊ะและแบบการทาน แล้วเริ่มสั่งได้เลย"}
          </p>
        </header>

        {openMeal ? (
          <section className="flex flex-col gap-4 rounded-[28px] bg-ink p-6 text-cream sm:p-7" aria-label="มื้อที่ยังไม่ชำระ">
            <p className="m-0 font-display text-2xl font-bold">โต๊ะ {openMeal.tableNo} ยังไม่ได้เช็กบิล</p>
            <p className="m-0 text-mist">
              {openMeal.dineType === "buffet" ? "บุฟเฟต์" : "A la carte"} · ชำระเงินมื้อนี้ก่อนจึงจะเปิดโต๊ะใหม่หรือสั่งกลับบ้านได้
            </p>
            <Button variant="primaryOnDark" size="lg" block loading={leaving} onClick={() => resumeMeal(openMeal)}>
              กลับไปที่โต๊ะ {openMeal.tableNo}
            </Button>
          </section>
        ) : step === "mode" ? (
          <div className="flex flex-col gap-3" role="list">
            <ModeCard
              title="สั่งกลับบ้าน / จัดส่ง"
              description="สั่งออนไลน์ จ่ายเงินแล้วรอรับหรือรอส่งถึงบ้าน"
              onClick={goOnline}
              disabled={leaving}
            />
            <ModeCard
              title="ทานที่ร้าน"
              description="นั่งอยู่ที่ร้าน สั่งจากโต๊ะได้หลายรอบ จ่ายทีเดียวตอนเช็กบิล"
              onClick={() => setStep("dine")}
              disabled={leaving}
            />
            <ModeCard title="จองโต๊ะล่วงหน้า" description="เลือกวัน เวลา และจำนวนคน" href="/reservation" />
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-4 rounded-[28px] border border-line bg-white p-5 sm:p-6" aria-labelledby="pick-table">
              <h2 id="pick-table" className="m-0 text-lg font-bold">
                1. โต๊ะของคุณ
              </h2>
              <p className="m-0 -mt-2 text-sm text-muted">ดูเลขโต๊ะได้จากป้ายบนโต๊ะ</p>
              {TABLE_GROUPS.map((group) => (
                <div key={group.seats} className="flex flex-col gap-2">
                  <p className="m-0 text-[13px] font-semibold text-muted">โต๊ะ {group.seats} ที่นั่ง</p>
                  <div role="radiogroup" aria-label={`โต๊ะ ${group.seats} ที่นั่ง`} className="grid grid-cols-5 gap-2">
                    {group.tables.map((n) => {
                      const on = table === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={`โต๊ะ ${n}`}
                          onClick={() => pickTable(n)}
                          className={cx(
                            "h-12 rounded-2xl border-2 text-base font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick",
                            on ? "border-brick bg-brick text-white" : "border-line bg-cream text-ink hover:border-line-strong",
                          )}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            <section className="flex flex-col gap-3 rounded-[28px] border border-line bg-white p-5 sm:p-6" aria-labelledby="pick-type">
              <h2 id="pick-type" className="m-0 text-lg font-bold">
                2. แบบการทาน
              </h2>
              <div role="radiogroup" aria-labelledby="pick-type" className="flex flex-col gap-2">
                <ChoiceCard
                  checked={dineType === "alacarte"}
                  onSelect={() => setDineType("alacarte")}
                  title="A la carte"
                  description="สั่งตามเมนู จ่ายตามที่สั่งจริง"
                />
                <ChoiceCard
                  checked={dineType === "buffet"}
                  onSelect={() => setDineType("buffet")}
                  title="บุฟเฟต์"
                  description={`สั่งได้ไม่อั้น ${BUFFET_MINUTES} นาที นับจากรอบแรก`}
                  trailing={`${BUFFET_PRICE_PER_PERSON.toLocaleString("th-TH")} ฿/คน`}
                />
              </div>

              {dineType === "buffet" && (
                <div className="flex flex-col gap-3 rounded-2xl bg-sand px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block font-semibold">จำนวนคน</span>
                      <span className="block text-[13px] text-muted">
                        {table ? `โต๊ะ ${table} นั่งได้ ${capacity} คน` : "เลือกโต๊ะก่อน"}
                      </span>
                    </span>
                    <QuantityStepper
                      label="จำนวนคน"
                      value={pax}
                      onDecrease={() => setPax((p) => Math.max(1, p - 1))}
                      onIncrease={() => setPax((p) => Math.min(capacity, p + 1))}
                      decreaseDisabled={pax <= 1}
                      increaseDisabled={pax >= capacity}
                    />
                  </div>
                  <div className="flex items-baseline justify-between border-t border-line-strong pt-3">
                    <span className="text-muted">
                      {BUFFET_PRICE_PER_PERSON.toLocaleString("th-TH")} ฿ × {pax} คน
                    </span>
                    <span className="text-xl font-bold">{formatBaht(BUFFET_PRICE_PER_PERSON * pax)}</span>
                  </div>
                </div>
              )}
            </section>

            <div className="flex flex-col gap-2.5">
              <Button size="lg" block disabled={!ready} loading={leaving} onClick={startDineIn}>
                {!table ? "เลือกโต๊ะก่อน" : !dineType ? "เลือกแบบการทานก่อน" : `เริ่มสั่งอาหาร · โต๊ะ ${table}`}
              </Button>
              <Button variant="ghost" onClick={() => setStep("mode")} disabled={leaving}>
                ← เปลี่ยนแบบการสั่ง
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ModeCardProps {
  title: string;
  description: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

/** การ์ดเลือกแบบการสั่ง — ทั้งใบกดได้ */
function ModeCard({ title, description, onClick, href, disabled }: ModeCardProps) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-xl font-bold">{title}</span>
        <span className="mt-1 block text-[15px] text-subtle">{description}</span>
      </span>
      <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-full bg-sand text-brick transition-colors group-hover:bg-brick group-hover:text-white">
        →
      </span>
    </>
  );
  const style =
    "group flex w-full items-center gap-4 rounded-[24px] border-2 border-line bg-white p-5 text-left transition-colors hover:border-brick focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick disabled:cursor-not-allowed disabled:opacity-60 sm:p-6";
  return (
    <div role="listitem">
      {href ? (
        <Link href={href} className={style}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onClick} disabled={disabled} className={style}>
          {body}
        </button>
      )}
    </div>
  );
}
