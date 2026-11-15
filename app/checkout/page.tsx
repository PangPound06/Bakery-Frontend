"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, ChoiceCard, cx, Spinner, TextField } from "@/components/ds";
import { shippingFeeFor } from "@/components/cart/cartUtils";
import CheckoutSteps from "@/components/checkout/CheckoutSteps";
import PaymentPanel from "@/components/checkout/PaymentPanel";
import ReceiveTimePicker from "@/components/checkout/ReceiveTimePicker";
import { authHeaders, getToken, removeToken } from "@/lib/auth";
import {
  ASAP,
  checkPhone,
  fetchReceiveOptions,
  fetchSummary,
  formatPhone,
  UnauthorizedError,
  type CheckoutSummary,
  type ReceiveOptions,
} from "@/lib/checkout";
import { formatBaht } from "@/lib/dineIn";
import { toActiveIntent, type ActiveIntent, type CheckoutMethod } from "@/lib/paymentIntent";
import type { Fulfillment } from "@/lib/receive";
import { useStoreStatus } from "@/lib/useStoreStatus";

/**
 * หน้าชำระเงินออนไลน์ — ทุกอย่างจบในเว็บเรา ไม่ redirect ออกไปหา Stripe
 *
 * ═══ สองสถานะของหน้านี้ ═══
 * form   → เลือกวิธีรับ (จัดส่ง / มารับที่ร้าน) กรอกผู้รับ เลือกเวลารับ และวิธีจ่าย
 * paying → QR / ช่องกรอกบัตร / โอนแนบสลิป (PaymentPanel ชุดเดียวกับบิลทานในร้าน)
 *
 * ═══ ยอดเงินมาจากไหน ═══
 * GET /api/checkout/summary?fulfillment= — backend คิดราคาใหม่จาก tb_products (มารับที่ร้านไม่มีค่าส่ง)
 * ยอดที่เรียกเก็บจริงมาจาก POST /api/checkout/intent ซึ่งคิดใหม่อีกรอบ หน้านี้แค่แสดงผล
 *
 * ═══ ป้องกันพลาดก่อนเกิด ═══
 * เวลาและสาขาเป็นปุ่มให้เลือก ช่องเบอร์บอกผลทันที และปุ่มจ่ายบอกว่ายังขาดอะไร
 * server ตรวจทุกอย่างซ้ำ (ReceiveDetailsService) — ค่าจากหน้านี้ไม่ถูกเชื่อเลย
 */

/** โหลดเวลารับใหม่ทุก 5 นาที — ช่วงเวลาแรกๆ หมดไปตามเวลาจริง */
const OPTIONS_REFRESH_MS = 5 * 60_000;

const METHODS: { value: CheckoutMethod; title: string; description: string }[] = [
  { value: "promptpay", title: "QR พร้อมเพย์ · ยืนยันอัตโนมัติ", description: "สแกนจ่าย ระบบรู้เองเมื่อเงินเข้า ไม่ต้องแนบสลิป" },
  { value: "card", title: "บัตรเครดิต / เดบิต", description: "กรอกบัตรผ่าน Stripe" },
  { value: "transfer", title: "โอนพร้อมเพย์ · แนบสลิป", description: "โอนเข้าบัญชีร้าน แนบสลิป แล้วรอร้านตรวจยอด" },
];

const PAY_LABEL: Record<CheckoutMethod, string> = {
  promptpay: "สร้าง QR ชำระเงิน",
  card: "ชำระด้วยบัตร",
  transfer: "ไปโอนและแนบสลิป",
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CheckoutInner />
    </Suspense>
  );
}

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream text-brick">
      <Spinner className="size-10" />
    </div>
  );
}

interface Recipient {
  name: string;
  /** ตัวเลขล้วน */
  phone: string;
  /** ลูกค้าพิมพ์อักขระที่ไม่ใช่ตัวเลขมาล่าสุด */
  phoneTypedOther: boolean;
  address: string;
  note: string;
}

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { blockOnline, message: closedMessage, reopenAt } = useStoreStatus();

  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [recipient, setRecipient] = useState<Recipient>({
    name: "",
    phone: "",
    phoneTypedOther: false,
    address: "",
    note: "",
  });
  const [pickedBranch, setPickedBranch] = useState<number | null>(null);
  const [pickedTime, setPickedTime] = useState<string | null>(null);
  const [method, setMethod] = useState<CheckoutMethod | null>(null);

  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [options, setOptions] = useState<ReceiveOptions | null>(null);
  const [intent, setIntent] = useState<ActiveIntent | null>(null);
  const [starting, setStarting] = useState(false);
  /** กันกดซ้ำก่อน React re-render — ถ้าหลุดจะได้ order สองใบ */
  const startingRef = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(searchParams.get("canceled") === "1" ? "ยกเลิกการชำระเงินแล้ว สินค้ายังอยู่ในตะกร้า" : "");

  const toLogin = useCallback(() => {
    removeToken();
    router.replace("/login");
  }, [router]);

  // ─── ยอดจาก server (โหลดใหม่เมื่อเปลี่ยนวิธีรับ เพราะค่าส่งเปลี่ยน) ───
  const summaryRequest = useRef(0);
  const loadSummary = useCallback(
    async (how: Fulfillment) => {
      const requestId = ++summaryRequest.current;
      setSummaryLoading(true);
      try {
        const result = await fetchSummary(how);
        if (requestId !== summaryRequest.current) return; // มีคำขอใหม่กว่าแล้ว
        if (result.ok) setSummary(result.summary);
        else if (result.cartEmpty) router.replace("/cart");
        else setError(result.message);
      } catch (e) {
        if (e instanceof UnauthorizedError) toLogin();
        else setError("เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่");
      } finally {
        if (requestId === summaryRequest.current) setSummaryLoading(false);
      }
    },
    [router, toLogin],
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // setState เกิดหลัง await ใน loadSummary ไม่ใช่ใน effect ตรงๆ
    void loadSummary(fulfillment);
  }, [fulfillment, loadSummary, router]);

  // ─── เวลารับและสาขา ───
  const loadOptions = useCallback(async () => {
    try {
      setOptions(await fetchReceiveOptions());
    } catch {
      /* โหลดไม่ได้ — ปุ่มจ่ายจะบอกให้ลองใหม่ */
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void loadOptions(), 0);
    const refresh = setInterval(() => void loadOptions(), OPTIONS_REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(refresh);
    };
  }, [loadOptions]);

  // ─── เติมชื่อ/เบอร์/ที่อยู่จากโปรไฟล์ (เฉพาะช่องที่ยังว่าง) ───
  useEffect(() => {
    let cancelled = false;
    const prefill = async () => {
      let profile: { fullname?: string; phone?: string; address?: string } = {};
      try {
        profile = JSON.parse(localStorage.getItem("user") || "{}");
      } catch {
        /* user ในเครื่องเสีย — ข้าม */
      }
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/me`, { headers: authHeaders() });
        const data = res.ok ? await res.json() : null;
        if (data?.success && data.profile) profile = { ...profile, ...data.profile };
      } catch {
        /* โปรไฟล์โหลดไม่ได้ก็กรอกเองได้ */
      }
      if (cancelled) return;
      setRecipient((r) => ({
        ...r,
        name: r.name || profile.fullname || "",
        phone: r.phone || (profile.phone ?? "").replace(/\D/g, "").slice(0, 10),
        address: r.address || profile.address || "",
      }));
    };
    void prefill();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── ค่าที่ใช้จริง (ค่าที่เลือกไว้ต้องยังมีอยู่ในตัวเลือกล่าสุด) ───
  const branches = options?.branches ?? [];
  const branchId =
    pickedBranch !== null && branches.some((b) => b.id === pickedBranch)
      ? pickedBranch
      : branches.length === 1
        ? branches[0].id
        : null;
  const timeValid = (v: string | null) =>
    v !== null && (v === ASAP ? options?.asapAvailable === true : (options?.slots.some((s) => s.value === v) ?? false));
  const receiveAt = timeValid(pickedTime) ? pickedTime : options?.asapAvailable ? ASAP : null;

  const phone = checkPhone(recipient.phone, recipient.phoneTypedOther);
  const pickup = fulfillment === "pickup";

  /** สิ่งแรกที่ยังขาด — null = พร้อมจ่าย */
  const missing = blockOnline
    ? "ร้านปิดรับออเดอร์ออนไลน์ชั่วคราว"
    : !summary || summaryLoading
      ? "กำลังโหลดยอด…"
      : !recipient.name.trim()
        ? "กรอกชื่อผู้รับก่อน"
        : !phone.valid
          ? "กรอกเบอร์โทรให้ครบก่อน"
          : !pickup && !recipient.address.trim()
            ? "กรอกที่อยู่จัดส่งก่อน"
            : pickup && branchId === null
              ? "เลือกสาขาที่จะไปรับก่อน"
              : !options
                ? "กำลังโหลดเวลารับ…"
                : receiveAt === null
                  ? "เลือกเวลารับสินค้าก่อน"
                  : !method
                    ? "เลือกวิธีชำระเงินก่อน"
                    : null;

  const startPayment = async () => {
    if (missing || !method || startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/checkout/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        // ข้อมูลการรับ + วิธีจ่ายเท่านั้น ไม่ส่งราคาหรือสถานะใดๆ
        body: JSON.stringify({
          fulfillment,
          receiverName: recipient.name.trim(),
          receiverPhone: recipient.phone,
          receiverAddress: pickup ? null : recipient.address.trim(),
          branchId: pickup ? branchId : null,
          receiveAt,
          note: recipient.note.trim() || null,
          paymentMethod: method,
        }),
      });
      if (res.status === 401) return toLogin();
      const data = await res.json().catch(() => ({}));

      if (res.status === 403 && data.storeClosed) {
        setError(
          (data.error || "ขณะนี้ร้านปิดรับออเดอร์ออนไลน์ชั่วคราว") + (data.reopenAt ? ` (เปิดอีกครั้ง ${data.reopenAt})` : ""),
        );
        return;
      }
      if (!res.ok || !data.success) {
        setError(data.error || "ไม่สามารถเริ่มการชำระเงินได้");
        // เวลา/สาขาอาจหมดไประหว่างกรอก ราคา/stock อาจเปลี่ยน
        void loadOptions();
        void loadSummary(fulfillment);
        return;
      }

      localStorage.setItem("lastOrderId", String(data.orderId));
      setIntent(toActiveIntent(method, data, summary?.total ?? 0));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่");
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };

  /** จ่ายสำเร็จ หรือแจ้งโอนแล้ว — หน้า success ถามสถานะจริงจาก backend เอง */
  const handlePaid = () => {
    window.dispatchEvent(new Event("cartUpdated"));
    router.push(`/checkout/success?order_id=${intent?.orderId ?? ""}`);
  };

  /** กลับมาหน้าฟอร์ม — order เดิมถูกยกเลิกไปแล้วจาก panel */
  const handleCancelPayment = () => {
    setIntent(null);
    setNotice("ยกเลิกแล้ว สินค้ายังอยู่ในตะกร้า เลือกวิธีชำระเงินใหม่ได้เลย");
    void loadSummary(fulfillment);
    void loadOptions();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!summary && summaryLoading) return <PageLoader />;

  // ═══ โหมดจ่ายเงิน ═══
  if (intent) {
    return (
      <div className="min-h-screen bg-cream font-body text-ink">
        <main className="mx-auto max-w-[560px] px-4 pt-8 pb-28 sm:pt-12">
          <CheckoutSteps current={2} />
          <PaymentPanel intent={intent} onDone={handlePaid} onCancel={handleCancelPayment} />
        </main>
      </div>
    );
  }

  const deliveryFee = shippingFeeFor(summary?.subtotal ?? 0);
  const itemCount = summary?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  // ═══ โหมดกรอกฟอร์ม ═══
  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <main className="mx-auto max-w-[1240px] px-4 pt-8 pb-28 sm:px-6 lg:pt-12 lg:pb-24">
        <CheckoutSteps current={2} />
        <h1 className="m-0 mb-6 font-display text-[32px] font-bold sm:text-[52px] lg:mb-9">ชำระเงิน</h1>

        {blockOnline && (
          <Banner tone="warn">
            {closedMessage || "ขณะนี้ร้านปิดรับออเดอร์ออนไลน์ชั่วคราว"}
            {reopenAt ? ` (เปิดอีกครั้ง ${reopenAt})` : ""}
          </Banner>
        )}
        {notice && <Banner tone="info">{notice}</Banner>}
        {error && <Banner tone="error">{error}</Banner>}

        <div className="flex flex-wrap items-start gap-8">
          <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
            <Section title="รับสินค้าแบบไหน">
              <div role="radiogroup" aria-label="วิธีรับสินค้า" className="flex flex-col gap-2">
                <ChoiceCard
                  checked={!pickup}
                  onSelect={() => setFulfillment("delivery")}
                  title="จัดส่งถึงบ้าน"
                  description="ส่งถึงที่อยู่ของคุณ · ส่งฟรีเมื่อซื้อเกิน 500 ฿"
                  trailing={deliveryFee === 0 ? "ส่งฟรี" : `+${deliveryFee} ฿`}
                />
                <ChoiceCard
                  checked={pickup}
                  onSelect={() => setFulfillment("pickup")}
                  disabled={options !== null && branches.length === 0}
                  title="มารับที่ร้าน"
                  description={options !== null && branches.length === 0 ? "ยังไม่มีสาขาเปิดรับ" : "ไม่ต้องกรอกที่อยู่ ไม่มีค่าส่ง"}
                  trailing="ไม่มีค่าส่ง"
                />
              </div>
            </Section>

            <Section title="ข้อมูลผู้รับ">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <TextField
                  label="ชื่อผู้รับ"
                  autoComplete="name"
                  maxLength={100}
                  value={recipient.name}
                  onChange={(e) => setRecipient((r) => ({ ...r, name: e.target.value }))}
                />
                <TextField
                  label="เบอร์โทร"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="0XX-XXX-XXXX"
                  value={formatPhone(recipient.phone)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setRecipient((r) => ({
                      ...r,
                      phone: raw.replace(/\D/g, "").slice(0, 10),
                      phoneTypedOther: /[^\d\-\s]/.test(raw),
                    }));
                  }}
                  help={phone.help}
                  tone={phone.tone}
                />
              </div>

              {pickup ? (
                <fieldset className="m-0 border-0 p-0">
                  <legend className="mb-2 p-0 text-sm text-muted">สาขาที่จะไปรับ</legend>
                  {options === null ? (
                    <Spinner className="text-brick" />
                  ) : (
                    <div role="radiogroup" aria-label="สาขาที่จะไปรับ" className="flex flex-col gap-2">
                      {branches.map((b) => (
                        <ChoiceCard
                          key={b.id}
                          checked={branchId === b.id}
                          onSelect={() => setPickedBranch(b.id)}
                          title={b.name}
                          description={[b.address, b.hours].filter(Boolean).join(" · ") || undefined}
                        />
                      ))}
                    </div>
                  )}
                </fieldset>
              ) : (
                <TextField
                  multiline
                  label="ที่อยู่จัดส่ง"
                  autoComplete="street-address"
                  maxLength={500}
                  rows={3}
                  placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                  value={recipient.address}
                  onChange={(e) => setRecipient((r) => ({ ...r, address: e.target.value }))}
                />
              )}

              {options === null ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Spinner className="size-4" /> กำลังโหลดเวลารับ…
                </div>
              ) : (
                <ReceiveTimePicker
                  legend={pickup ? "เวลามารับที่ร้าน" : "เวลาที่สะดวกรับของ"}
                  asapAvailable={options.asapAvailable}
                  slots={options.slots}
                  value={receiveAt}
                  onChange={setPickedTime}
                />
              )}

              <TextField
                multiline
                label="หมายเหตุ (ไม่บังคับ)"
                maxLength={500}
                rows={2}
                placeholder={pickup ? "เช่น ใส่กล่องแยก / ขอเทียน 1 เล่ม" : "เช่น ไม่ใส่เทียน / โทรก่อนส่ง"}
                value={recipient.note}
                onChange={(e) => setRecipient((r) => ({ ...r, note: e.target.value }))}
              />
            </Section>

            <Section title={`รายการสินค้า · ${itemCount} ชิ้น`}>
              <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
                {summary?.items.map((item) => (
                  <li key={`${item.productId}-${item.selectedOption ?? ""}`} className="flex items-center gap-3.5">
                    <span className="size-14 flex-none overflow-hidden rounded-[14px] bg-sand">
                      {item.image && (
                        // รูปสินค้ามาจากหลายโดเมน (ตั้งค่าใน admin) — ใช้ img ธรรมดา
                        <img src={item.image} alt="" className="size-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold break-words">{item.productName}</span>
                      <span className="block text-sm text-muted">
                        {[item.selectedOption, `× ${item.quantity}`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="flex-none font-semibold">{formatBaht(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <aside
            className="flex w-full min-w-0 flex-col gap-5 rounded-[32px] bg-ink p-6 text-cream sm:p-7 lg:sticky lg:top-24 lg:w-auto lg:flex-[1_1_380px]"
            aria-label="ชำระเงิน"
          >
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2 p-0 text-sm text-mist">วิธีชำระเงิน</legend>
              <div role="radiogroup" aria-label="วิธีชำระเงิน" className="flex flex-col gap-2">
                {METHODS.map((m) => (
                  <ChoiceCard
                    key={m.value}
                    tone="dark"
                    checked={method === m.value}
                    onSelect={() => setMethod(m.value)}
                    title={m.title}
                    description={m.description}
                  />
                ))}
              </div>
            </fieldset>

            <dl className={cx("m-0 flex flex-col gap-2 border-t border-ink-line pt-4", summaryLoading && "opacity-60")}>
              <Line label="ยอดสินค้า" value={formatBaht(summary?.subtotal ?? 0)} />
              <Line
                label={pickup ? "ค่าส่ง (มารับที่ร้าน)" : "ค่าจัดส่ง"}
                value={(summary?.shipping ?? 0) === 0 ? "ฟรี" : formatBaht(summary?.shipping ?? 0)}
              />
              <div className="flex items-baseline justify-between pt-1">
                <dt>ยอดชำระ</dt>
                <dd className="m-0 text-[30px] font-bold">{formatBaht(summary?.total ?? 0)}</dd>
              </div>
            </dl>

            <Button variant="primaryOnDark" size="lg" block disabled={missing !== null} loading={starting} onClick={startPayment}>
              {missing ?? `${PAY_LABEL[method as CheckoutMethod]} · ${formatBaht(summary?.total ?? 0)}`}
            </Button>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[28px] border border-line bg-white p-5 sm:p-7">
      <h2 className="m-0 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-mist">
      <dt>{label}</dt>
      <dd className="m-0 text-cream">{value}</dd>
    </div>
  );
}

const BANNER = {
  warn: "border-warn-line bg-warn-bg text-warn-ink",
  info: "border-line bg-white text-body",
  error: "border-danger-line bg-danger-soft text-danger",
} as const;

function Banner({ tone, children }: { tone: keyof typeof BANNER; children: React.ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={cx("m-0 mb-5 rounded-2xl border px-4 py-3 text-[15px]", BANNER[tone])}>
      {children}
    </p>
  );
}
