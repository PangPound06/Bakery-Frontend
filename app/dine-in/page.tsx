"use client";

import { useCallback, useEffect, useState } from "react";
import { BottomSheet, Button, cx, Spinner } from "@/components/ds";
import ChoiceDialog from "@/components/dinein/ChoiceDialog";
import DineInTopBar from "@/components/dinein/DineInTopBar";
import MenuTile from "@/components/dinein/MenuTile";
import RoundPanel from "@/components/dinein/RoundPanel";
import SentRounds from "@/components/dinein/SentRounds";
import { availabilityOf, choicesFor, needsChoice, toMenuProduct, unitsInRound, type MenuChoice, type MenuProduct } from "@/components/dinein/menu";
import { useDineSession } from "@/components/dinein/useDineSession";
import { useRoundCart } from "@/components/dinein/useRoundCart";
import { DINING_SESSION_CHANGED, useBuffetTimer } from "@/lib/diningSession";
import { sendRound, UnauthorizedError } from "@/lib/dineIn";
import type { ApiProduct, Category } from "@/types/product";

/** ข้อความยืนยันหลังส่งรอบ แสดงค้างไว้กี่มิลลิวินาที */
const TOAST_MS = 2600;
const ALL = "all";

/**
 * สั่งอาหารที่โต๊ะ — เลือกเมนูใส่ "รอบ" แล้วส่งเข้าครัวทีละรอบ (จ่ายเงินทีหลังที่หน้าเช็กบิล)
 *
 * รอบที่ยังไม่ส่ง = ตะกร้าทานในร้านที่ server · ราคา เวลาบุฟเฟต์ และ stock ตัดสินที่ backend ทั้งหมด
 * หน้านี้แค่กันกดสิ่งที่รู้อยู่แล้วว่าไม่ผ่าน (ของหมด / เกินจำนวน / หมดเวลา) ให้ลูกค้าไม่ต้องเจอข้อผิดพลาด
 */
export default function DineInMenuPage() {
  const session = useDineSession();
  const { tableNo, dineType, pax, rounds, toLogin } = session;
  const buffet = dineType === "buffet";
  const timer = useBuffetTimer(buffet, tableNo);
  const closed = timer?.expired ?? false;
  const round = useRoundCart(toLogin);
  const catalog = useCatalog();

  const [category, setCategory] = useState(ALL);
  const [picking, setPicking] = useState<MenuProduct | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [toast, setToast] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const closePicker = useCallback(() => setPicking(null), []);

  const add = async (product: MenuProduct, choice: MenuChoice) => {
    setSendError("");
    if (await round.add(product, choice)) setPicking(null);
  };

  const onAdd = (product: MenuProduct) => {
    if (needsChoice(product)) setPicking(product);
    else void add(product, choicesFor(product)[0]);
  };

  const onQuantity = (item: Parameters<typeof round.setQuantity>[0], quantity: number) => {
    setSendError("");
    void round.setQuantity(item, quantity);
  };

  const send = async () => {
    if (sending || closed || round.items.length === 0) return;
    setSending(true);
    setSendError("");
    const roundNo = rounds.length + 1;
    try {
      const result = await sendRound(tableNo, dineType, note);
      if (result.ok) {
        setNote("");
        setSheetOpen(false);
        setToast(`ส่งรอบที่ ${roundNo} เข้าครัวแล้ว · สั่งเพิ่มได้เลย`);
      } else {
        setSendError(result.message);
      }
    } catch (e) {
      if (e instanceof UnauthorizedError) return toLogin();
      setSendError("เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่");
    } finally {
      setSending(false);
      // ส่งสำเร็จ = เริ่มนับเวลาบุฟเฟต์ / ถูกปฏิเสธ = ราคา stock หรือเวลาอาจเปลี่ยน → โหลดทุกอย่างใหม่
      window.dispatchEvent(new Event(DINING_SESSION_CHANGED));
      void round.reload();
      void session.reloadRounds();
      catalog.refresh();
    }
  };

  const visible = catalog.products.filter((p) => category === ALL || p.category === category);
  const count = round.items.reduce((sum, i) => sum + i.quantity, 0);
  const loading = !round.loaded || !session.roundsLoaded;

  const panel = (inSheet: boolean) => (
    <RoundPanel
      roundNo={rounds.length + 1}
      items={round.items}
      subtotal={round.subtotal}
      buffet={buffet}
      closed={closed}
      note={note}
      onNoteChange={setNote}
      busy={round.busy || sending}
      sending={sending}
      error={sendError || round.error}
      onQuantity={onQuantity}
      onSend={send}
      onClose={inSheet ? closeSheet : undefined}
    />
  );

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <DineInTopBar
        tableNo={tableNo}
        dineType={dineType}
        pax={pax}
        timer={timer}
        link={{ href: "/dine-in/bill", label: rounds.length > 0 ? `ออเดอร์ · ${rounds.length} รอบ` : "ออเดอร์และเช็กบิล" }}
      />

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 top-20 z-[60] mx-auto flex max-w-md items-center gap-2.5 rounded-[18px] bg-success-soft px-4.5 py-3.5 font-semibold text-success-ink shadow-[0_8px_20px_rgba(31,26,22,0.12)] motion-safe:animate-rise"
        >
          <CheckIcon />
          {toast}
        </div>
      )}

      <main className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-8 px-4 pt-8 pb-44 sm:px-6 lg:pt-10 lg:pb-24">
        <section className="min-w-0 flex-[999_1_560px]" aria-labelledby="dine-menu-title">
          <h1 id="dine-menu-title" className="m-0 mb-4 font-display text-[32px] font-bold sm:text-5xl lg:mb-5">
            สั่งอาหาร
          </h1>

          <div role="tablist" aria-label="หมวดเมนู" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {[{ slug: ALL, name: "ทั้งหมด" }, ...catalog.categories].map((c) => {
              const on = category === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setCategory(c.slug)}
                  className={cx(
                    "min-h-11 flex-none rounded-full border-[1.5px] px-4.5 text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick",
                    on ? "border-ink bg-ink text-cream" : "border-line bg-white text-ink hover:border-line-strong",
                  )}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          {catalog.state === "loading" && (
            <div className="flex justify-center py-20 text-brick">
              <Spinner className="size-8" />
            </div>
          )}
          {catalog.state === "error" && (
            <div className="flex flex-col items-start gap-3 rounded-[26px] border border-line bg-white p-6">
              <p className="m-0">โหลดเมนูไม่สำเร็จ</p>
              <Button variant="secondary" onClick={catalog.reload}>
                ลองใหม่
              </Button>
            </div>
          )}
          {catalog.state === "ready" && visible.length === 0 && (
            <p className="rounded-[26px] border border-line bg-white p-6 text-muted">ยังไม่มีเมนูในหมวดนี้</p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-[18px]">
            {visible.map((p) => (
              <MenuTile
                key={p.id}
                product={p}
                units={unitsInRound(p.id, round.items)}
                availability={availabilityOf(p, round.items, closed || round.busy || sending)}
                buffet={buffet}
                onAdd={() => onAdd(p)}
              />
            ))}
          </div>
        </section>

        <aside className="sticky top-24 hidden min-w-0 flex-[1_1_360px] flex-col gap-3.5 lg:flex" aria-label="รอบที่กำลังสั่ง">
          {loading ? (
            <div className="flex justify-center rounded-[32px] bg-ink py-16 text-apricot">
              <Spinner className="size-8" />
            </div>
          ) : (
            panel(false)
          )}
          <SentRounds rounds={rounds} />
        </aside>

        {/* มือถือ: รอบที่ส่งแล้วอยู่ท้ายเมนู ส่วนรอบที่กำลังสั่งเปิดจากแถบด้านล่าง */}
        <div className="w-full lg:hidden">
          <SentRounds rounds={rounds} />
        </div>
      </main>

      {/* แถบล่างบนมือถือ — อยู่เหนือแถบนำทางของเว็บ (Header, xl:hidden) */}
      <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-cream/90 px-4 py-3 backdrop-blur-lg lg:hidden">
        <Button size="lg" block disabled={loading} onClick={() => setSheetOpen(true)} variant={count > 0 ? "primary" : "secondary"}>
          {count > 0 ? `ดูรอบที่ ${rounds.length + 1} · ${count} รายการ` : `รอบที่ ${rounds.length + 1} · ยังไม่มีรายการ`}
        </Button>
      </div>

      <BottomSheet open={sheetOpen} onClose={closeSheet} label={`รอบที่ ${rounds.length + 1}`}>
        {panel(true)}
      </BottomSheet>

      {picking && (
        <ChoiceDialog
          key={picking.id}
          product={picking}
          items={round.items}
          buffet={buffet}
          busy={round.busy}
          onConfirm={(choice) => void add(picking, choice)}
          onClose={closePicker}
        />
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

type CatalogState = "loading" | "ready" | "error";

/** หมวดที่เปิดอยู่และสินค้าในหมวดเหล่านั้น (API สาธารณะ ไม่ต้อง login) */
function useCatalog() {
  const [categories, setCategories] = useState<Pick<Category, "slug" | "name">[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [state, setState] = useState<CatalogState>("loading");

  const load = useCallback(async () => {
    const api = process.env.NEXT_PUBLIC_API_URL;
    try {
      const [catRes, prodRes] = await Promise.all([fetch(`${api}/api/categories/active`), fetch(`${api}/api/products`)]);
      if (!catRes.ok || !prodRes.ok) throw new Error("catalog");
      const cats: Category[] = await catRes.json();
      const prods: ApiProduct[] = await prodRes.json();
      const active = new Set(cats.map((c) => c.slug));
      setCategories(cats.map(({ slug, name }) => ({ slug, name })));
      setProducts(prods.filter((p) => active.has(p.category)).map(toMenuProduct));
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // setState เกิดหลัง await ใน load ไม่ใช่ใน effect ตรงๆ
    void load();
  }, [load]);

  const reload = useCallback(() => {
    setState("loading");
    void load();
  }, [load]);

  /** โหลดใหม่เงียบๆ (ไม่ขึ้นวงหมุน) — หลังส่งรอบ stock เปลี่ยน */
  const refresh = useCallback(() => void load(), [load]);

  return { categories, products, state, reload, refresh };
}
