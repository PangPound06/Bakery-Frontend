"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useStoreStatus } from "@/lib/useStoreStatus";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PromptPayPanel from "@/components/checkout/PromptPayPanel";
import CardPaymentPanel from "@/components/checkout/CardPaymentPanel";
import TransferPaymentPanel from "@/components/checkout/TransferPaymentPanel";

/**
 * หน้าชำระเงิน — ทุกอย่างจบในเว็บเรา ไม่ redirect ออกไปหา Stripe
 *
 * ═══ สองสถานะของหน้านี้ ═══
 * "form"    → กรอกที่อยู่ + เลือกวิธีจ่าย
 * "paying"  → แสดง QR หรือช่องกรอกบัตร (สลับมาแบบไม่เปลี่ยนหน้า)
 *
 * ═══ วิธีจ่าย ═══
 * promptpay → QR ของ Stripe ระบบยืนยันเองอัตโนมัติ
 * card      → ช่องกรอกบัตรของ Stripe
 * transfer  → QR พร้อมเพย์ของร้าน ลูกค้ากดแจ้งโอน แล้วแอดมินตรวจยอดเอง
 *
 * ═══ ยอดเงินมาจากไหน ═══
 * จาก GET /api/checkout/summary ซึ่ง backend คำนวณใหม่จาก tb_products
 * หน้านี้ไม่คำนวณราคาเองแม้แต่ตัวเดียว ตัวเลขที่เห็นเป็นแค่ "การแสดงผล"
 * ยอดที่เรียกเก็บจริงมาจาก PaymentIntent ที่ backend สร้าง
 */

type PaymentMethod = "promptpay" | "card" | "transfer";
type Phase = "form" | "paying";

interface SummaryItem {
  productId: number;
  productName: string;
  image: string | null;
  selectedOption: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

interface Summary {
  items: SummaryItem[];
  subtotal: number;
  shipping: number;
  total: number;
}

interface ActiveIntent {
  method: PaymentMethod;
  orderId: number;
  ordCode: string;
  total: number;
  qrImageUrl?: string;
  hostedUrl?: string;
  testMode?: boolean;
  clientSecret?: string;
  /** เฉพาะ transfer */
  promptPayId?: string;
  accountName?: string;
  expiresInSeconds?: number;
}

const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CheckoutInner />
    </Suspense>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
      <div
        className="w-12 h-12 rounded-full animate-spin"
        style={{
          borderWidth: 3,
          borderStyle: "solid",
          borderColor: "#f59e0b transparent transparent transparent",
        }}
      />
    </div>
  );
}

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { blockOnline, message: closedMessage, reopenAt } = useStoreStatus();

  const [phase, setPhase] = useState<Phase>("form");
  const [intent, setIntent] = useState<ActiveIntent | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PaymentMethod | null>(null);
  /**
   * กันกดซ้ำก่อนที่ React จะ re-render
   *
   * ปุ่ม disabled อิงกับ state ที่อัปเดตไม่ทันการดับเบิ้ลเร็วๆ
   * ถ้าหลุดไปจะยิง /intent สองครั้งพร้อมกัน แล้วได้ order สองใบ
   */
  const startingRef = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [shippingData, setShippingData] = useState({
    fullname: "",
    phone: "",
    address: "",
    note: "",
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (searchParams.get("canceled") === "1") {
      setNotice("ยกเลิกการชำระเงินแล้ว สินค้ายังอยู่ในตะกร้า");
    }
  }, [searchParams]);

  useEffect(() => {
    loadSummary();
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ดึงยอดที่ server คำนวณให้ */
  const loadSummary = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/checkout/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSummary(data.summary);
      } else {
        if (data.error?.includes("ว่าง")) {
          router.replace("/cart");
          return;
        }
        setError(data.error || "ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้");
      }
    } catch {
      setError("เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  /** เติมชื่อ/เบอร์/ที่อยู่จากโปรไฟล์ให้อัตโนมัติ */
  const loadProfile = async () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (user.fullname) {
      setShippingData((prev) => ({ ...prev, fullname: user.fullname }));
    }
    if (!token) return;

    try {
      const res = await fetch(`${apiUrl}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.profile) {
        setShippingData((prev) => ({
          ...prev,
          fullname: data.profile.fullname || prev.fullname,
          phone: data.profile.phone || "",
          address: data.profile.address || "",
        }));
      }
    } catch {
      /* โปรไฟล์โหลดไม่ได้ก็ให้กรอกเองได้ */
    }
  };

  /** สร้าง PaymentIntent แล้วสลับหน้าไปโหมดจ่ายเงิน */
  const startPayment = async (method: PaymentMethod) => {
    if (startingRef.current) return;
    setError("");
    setNotice("");

    if (!shippingData.fullname || !shippingData.phone || !shippingData.address) {
      setError("กรุณากรอกข้อมูลการจัดส่งให้ครบถ้วน");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (shippingData.phone.length < 9) {
      setError("เบอร์โทรศัพท์ไม่ถูกต้อง");
      return;
    }

    startingRef.current = true;
    setPending(method);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/checkout/intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // ส่งแค่ข้อมูลจัดส่ง + วิธีจ่าย ไม่ส่งราคาหรือสถานะใดๆ
        body: JSON.stringify({
          receiverName: shippingData.fullname,
          receiverPhone: shippingData.phone,
          receiverAddress: shippingData.address,
          note: shippingData.note,
          paymentMethod: method,
        }),
      });

      const data = await res.json();

      if (res.status === 403 && data.storeClosed) {
        setError(
          (data.error || "ขณะนี้ร้านปิดรับออเดอร์ออนไลน์ชั่วคราว") +
            (data.reopenAt ? ` (เปิดอีกครั้ง ${data.reopenAt})` : ""),
        );
        setPending(null);
        return;
      }

      if (!res.ok || !data.success) {
        setError(data.error || "ไม่สามารถเริ่มการชำระเงินได้");
        setPending(null);
        return;
      }

      localStorage.setItem("lastOrderId", String(data.orderId));

      setIntent({
        method,
        orderId: data.orderId,
        ordCode: data.ordCode ?? "",
        total: data.total ?? summary?.total ?? 0,
        qrImageUrl: data.qrImageUrl,
        hostedUrl: data.hostedUrl,
        testMode: data.testMode === true,
        clientSecret: data.clientSecret,
        promptPayId: data.promptPayId,
        accountName: data.accountName,
        expiresInSeconds: data.expiresInSeconds,
      });
      setPhase("paying");
      setPending(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่");
      setPending(null);
    } finally {
      startingRef.current = false;
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
    setPhase("form");
    setNotice("ยกเลิกแล้ว สินค้ายังอยู่ในตะกร้า เลือกวิธีชำระเงินใหม่ได้เลย");
    loadSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── UI ───────────────────────────────────────────────────

  if (loading) return <PageLoader />;

  // ═══ โหมดจ่ายเงิน ═══
  if (phase === "paying" && intent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8">
        <div className="max-w-lg mx-auto px-4">
          {intent.method === "transfer" && intent.qrImageUrl ? (
            <TransferPaymentPanel
              orderId={intent.orderId}
              ordCode={intent.ordCode}
              qrImageUrl={intent.qrImageUrl}
              total={intent.total}
              promptPayId={intent.promptPayId}
              accountName={intent.accountName}
              expiresInSeconds={intent.expiresInSeconds ?? 30 * 60}
              apiUrl={apiUrl}
              onSubmitted={handlePaid}
              onCancel={handleCancelPayment}
            />
          ) : intent.method === "promptpay" && intent.qrImageUrl ? (
            <PromptPayPanel
              orderId={intent.orderId}
              ordCode={intent.ordCode}
              qrImageUrl={intent.qrImageUrl}
              hostedUrl={intent.hostedUrl}
              testMode={intent.testMode}
              total={intent.total}
              apiUrl={apiUrl}
              onPaid={handlePaid}
              onCancel={handleCancelPayment}
            />
          ) : intent.clientSecret ? (
            <CardPaymentPanel
              orderId={intent.orderId}
              ordCode={intent.ordCode}
              clientSecret={intent.clientSecret}
              total={intent.total}
              apiUrl={apiUrl}
              onPaid={handlePaid}
              onCancel={handleCancelPayment}
            />
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
              <p className="text-red-600">ข้อมูลการชำระเงินไม่ครบ</p>
              <button
                onClick={handleCancelPayment}
                className="mt-4 text-amber-600 font-medium"
              >
                ← กลับไปเริ่มใหม่
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══ โหมดกรอกฟอร์ม ═══
  const disabled = pending !== null || blockOnline || !summary;
  const totalText = `฿${formatPrice(summary?.total ?? 0)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/cart"
            className="text-amber-600 hover:text-amber-700 flex items-center gap-2 mb-4"
          >
            ← กลับไปตะกร้าสินค้า
          </Link>
          <h1 className="text-3xl font-bold text-amber-800">
            💳 ดำเนินการชำระเงิน
          </h1>
        </div>

        {blockOnline && (
          <div className="mb-6 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg">
            🔒 {closedMessage || "ขณะนี้ร้านปิดรับออเดอร์ออนไลน์ชั่วคราว"}
            {reopenAt ? ` (เปิดอีกครั้ง ${reopenAt})` : ""}
          </div>
        )}

        {notice && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            ℹ️ {notice}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-amber-800 mb-4">
                📦 ข้อมูลการจัดส่ง
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อผู้รับ *
                  </label>
                  <input
                    type="text"
                    value={shippingData.fullname}
                    onChange={(e) =>
                      setShippingData({
                        ...shippingData,
                        fullname: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="ชื่อ-นามสกุล"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เบอร์โทรศัพท์ *
                  </label>
                  <input
                    type="tel"
                    value={shippingData.phone}
                    onChange={(e) =>
                      setShippingData({
                        ...shippingData,
                        phone: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    maxLength={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="0812345678"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ที่อยู่จัดส่ง *
                  </label>
                  <textarea
                    value={shippingData.address}
                    onChange={(e) =>
                      setShippingData({
                        ...shippingData,
                        address: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    หมายเหตุ
                  </label>
                  <textarea
                    value={shippingData.note}
                    onChange={(e) =>
                      setShippingData({ ...shippingData, note: e.target.value })
                    }
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="เช่น ไม่ใส่เทียน / โทรก่อนส่ง"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-amber-800 mb-4">
                🔐 วิธีชำระเงิน
              </h2>
              <div className="border-2 border-amber-200 bg-amber-50 rounded-xl p-5">
                <p className="text-sm text-amber-700">
                  เลือกวิธีที่ต้องการจากปุ่มด้านขวา
                </p>
                <ul className="mt-2 text-xs text-amber-700 space-y-1 list-disc list-inside">
                  <li>QR PromptPay / บัตร — ยืนยันการชำระเงินอัตโนมัติทันที</li>
                  <li>
                    โอนพร้อมเพย์ — โอนเข้าบัญชีร้านโดยตรง ร้านจะยืนยันหลังตรวจยอด
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-amber-800 mb-4">
                🧾 สรุปคำสั่งซื้อ
              </h2>

              <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
                {summary?.items.map((item, idx) => (
                  <div key={idx} className="flex gap-3 text-sm">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {item.productName}
                      </p>
                      {item.selectedOption && (
                        <p className="text-xs text-gray-500 truncate">
                          {item.selectedOption}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        ฿{formatPrice(item.unitPrice)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium text-amber-700 whitespace-nowrap">
                      ฿{formatPrice(item.lineTotal)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>ยอดสินค้า</span>
                  <span>฿{formatPrice(summary?.subtotal ?? 0)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>ค่าจัดส่ง</span>
                  <span>
                    {summary?.shipping === 0 ? (
                      <span className="text-green-600 font-medium">ฟรี</span>
                    ) : (
                      `฿${formatPrice(summary?.shipping ?? 0)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold text-amber-800 border-t pt-3">
                  <span>ยอดชำระ</span>
                  <span>{totalText}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => startPayment("promptpay")}
                  disabled={disabled}
                  className={`w-full py-4 rounded-xl font-semibold text-white transition-colors ${
                    disabled
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-amber-500 hover:bg-amber-600"
                  }`}
                >
                  {pending === "promptpay" ? (
                    <ButtonSpinner label="กำลังสร้าง QR..." light />
                  ) : (
                    <>📱 สแกน QR PromptPay — {totalText}</>
                  )}
                </button>

                <button
                  onClick={() => startPayment("card")}
                  disabled={disabled}
                  className={`w-full py-3.5 rounded-xl font-semibold border-2 transition-colors ${
                    disabled
                      ? "border-gray-200 text-gray-300 cursor-not-allowed"
                      : "border-amber-500 text-amber-600 hover:bg-amber-50"
                  }`}
                >
                  {pending === "card" ? (
                    <ButtonSpinner label="กำลังเตรียมช่องกรอกบัตร..." />
                  ) : (
                    <>💳 จ่ายด้วยบัตรเครดิต / เดบิต</>
                  )}
                </button>

                <button
                  onClick={() => startPayment("transfer")}
                  disabled={disabled}
                  className={`w-full py-3.5 rounded-xl font-semibold border-2 transition-colors ${
                    disabled
                      ? "border-gray-200 text-gray-300 cursor-not-allowed"
                      : "border-amber-500 text-amber-600 hover:bg-amber-50"
                  }`}
                >
                  {pending === "transfer" ? (
                    <ButtonSpinner label="กำลังสร้าง QR..." />
                  ) : (
                    <>🏦 โอนพร้อมเพย์ (ร้านยืนยันยอด)</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ButtonSpinner({ label, light }: { label: string; light?: boolean }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <span
        className="w-5 h-5 rounded-full animate-spin"
        style={{
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: `${light ? "#fff" : "#f59e0b"} transparent transparent transparent`,
        }}
      />
      {label}
    </span>
  );
}