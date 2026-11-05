"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

/**
 * หน้าจ่ายบิลหน้าร้าน — QR ของ Stripe
 *
 * ═══ หน้าตาและพฤติกรรมตรงกับ PromptPayPanel ฝั่งออนไลน์ ═══
 * นับถอยหลังอายุ QR, ลิงก์หน้าจำลองของ Stripe สำหรับ test mode,
 * วิธีชำระเงินเป็นข้อๆ และปุ่มยกเลิก — ให้ลูกค้าเจอประสบการณ์เดียวกันทั้งสองทาง
 *
 * ═══ รู้ได้ยังไงว่าจ่ายแล้ว ═══
 * ถาม backend ซ้ำๆ ทุก 2 วินาที ซึ่งจะเป็น paid ก็ต่อเมื่อ webhook ของ Stripe
 * ยืนยันมาแล้วเท่านั้น หน้านี้ไม่มีทางตัดสินเองว่าจ่ายสำเร็จ
 */

const POLL_MS = 2000;
/** PromptPay QR ของ Stripe มีอายุประมาณ 10 นาที */
const EXPIRE_SECONDS = 10 * 60;

const formatPrice = (n: number) =>
  n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const mmss = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

function BillQRContent() {
  const [amount, setAmount] = useState(0);
  const [tableNo, setTableNo] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [hostedUrl, setHostedUrl] = useState("");
  const [testMode, setTestMode] = useState(false);
  const [ordCode, setOrdCode] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(EXPIRE_SECONDS);
  const [creating, setCreating] = useState(true);
  const [failed, setFailed] = useState("");
  const [error, setError] = useState("");
  const [canceling, setCanceling] = useState(false);

  const createdRef = useRef(false);
  const stopped = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // ─── กดเรียกบิล → ขอ QR ───
  useEffect(() => {
    // React strict mode เรียก effect สองรอบ กันไม่ให้ออกบิลซ้ำ
    if (createdRef.current) return;
    createdRef.current = true;

    const table = localStorage.getItem("tableNo") || "";
    setTableNo(table);

    const total = parseFloat(searchParams.get("total") || "0");
    if (!total || total <= 0) {
      router.replace("/bill");
      return;
    }
    setAmount(total);

    const createBill = async () => {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const dineType = localStorage.getItem("dineType") || "alacarte";
      const buffetPriceStr = localStorage.getItem("buffetPrice");

      try {
        const res = await fetch(`${apiUrl}/api/dinein/request-bill`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tableNo: table,
            dineType,
            buffetPrice:
              dineType === "buffet" && buffetPriceStr
                ? Number(buffetPriceStr)
                : null,
            buffetPax:
              dineType === "buffet"
                ? Number(localStorage.getItem("buffetPax") || 1)
                : 1,
          }),
        });
        const data = await res.json();

        if (!data.success) {
          setError(data.message || "เรียกเก็บบิลไม่สำเร็จ");
          return;
        }

        setOrderId(data.orderId);
        setOrdCode(data.ordCode);
        setQrImageUrl(data.qrImageUrl);
        setHostedUrl(data.hostedInstructionsUrl || "");
        setTestMode(data.testMode === true);
        setAmount(data.amount ?? total);
        setSecondsLeft(EXPIRE_SECONDS);
      } catch {
        setError("เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่");
      } finally {
        setCreating(false);
      }
    };

    createBill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── นับถอยหลัง ───
  useEffect(() => {
    if (!orderId || secondsLeft <= 0 || failed) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [orderId, secondsLeft, failed]);

  // ─── ถามสถานะซ้ำๆ ───
  useEffect(() => {
    if (!orderId) return;
    stopped.current = false;

    const poll = async () => {
      if (stopped.current) return;
      try {
        const token = getToken();
        const res = await fetch(`${apiUrl}/api/dinein/bill/status/${orderId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();

        if (data.success) {
          if (data.paid) {
            stopped.current = true;
            localStorage.removeItem("dineType");
            localStorage.removeItem("buffetPrice");
            localStorage.removeItem("buffetPax");
            await Swal.fire({
              icon: "success",
              title: "ชำระเงินสำเร็จ",
              text: `บิล ${data.ordCode || ordCode} ชำระเรียบร้อยแล้ว`,
              confirmButtonColor: "#f97316",
              confirmButtonText: "เรียบร้อย",
            });
            router.replace("/order-detail");
            return;
          }
          if (
            data.paymentStatus === "failed" ||
            data.paymentStatus === "expired"
          ) {
            stopped.current = true;
            setFailed("การชำระเงินไม่สำเร็จหรือหมดเวลาแล้ว กรุณาเรียกบิลใหม่");
            return;
          }
        }
      } catch {
        /* network สะดุด — ลองใหม่รอบหน้า */
      }
      timer.current = setTimeout(poll, POLL_MS);
    };

    poll();

    return () => {
      stopped.current = true;
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleCancel = async () => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "ยกเลิกการชำระเงิน?",
      text: "QR นี้จะใช้ไม่ได้อีก ต้องกดเรียกบิลใหม่",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ยกเลิก",
      cancelButtonText: "ชำระต่อ",
    });
    if (!confirm.isConfirmed || !orderId) return;

    setCanceling(true);
    stopped.current = true;
    try {
      const token = getToken();
      await fetch(`${apiUrl}/api/dinein/bill/cancel/${orderId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      /* ยกเลิกฝั่ง server ไม่ผ่านก็ปล่อยให้หมดอายุไปเอง */
    } finally {
      router.replace("/bill");
    }
  };

  const expired = secondsLeft <= 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="font-semibold text-gray-800">ชำระเงินผ่าน QR</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="bg-amber-700 text-center py-4">
            <p className="text-amber-100 text-sm">สแกนเพื่อชำระเงิน</p>
            <p className="text-white font-bold text-lg">🪑 โต๊ะ {tableNo}</p>
          </div>

          <div className="p-6 text-center">
            {creating && (
              <div className="py-16">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-amber-700">กำลังออกบิล...</p>
              </div>
            )}

            {!creating && error && (
              <div className="py-10">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => router.replace("/bill")}
                  className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600"
                >
                  กลับไปหน้าบิล
                </button>
              </div>
            )}

            {!creating && !error && (failed || expired) && (
              <div className="py-10">
                <div className="text-5xl mb-3">⏰</div>
                <p className="text-gray-700 font-medium mb-1">
                  {failed || "QR หมดอายุแล้ว"}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  ถ้ายังไม่ได้ชำระเงิน กดเรียกบิลใหม่ได้เลย
                </p>
                <button
                  onClick={() => router.replace("/bill")}
                  className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600"
                >
                  เรียกบิลใหม่
                </button>
              </div>
            )}

            {!creating && !error && !failed && !expired && qrImageUrl && (
              <>
                <p className="text-3xl font-bold text-amber-600">
                  ฿{formatPrice(amount)}
                </p>
                <p className="text-xs text-gray-400 mt-1">บิล {ordCode}</p>

                <div className="border-2 border-amber-200 rounded-2xl p-4 inline-block bg-white mt-4">
                  <img
                    src={qrImageUrl}
                    alt="PromptPay QR"
                    className="w-56 h-56 object-contain"
                  />
                </div>

                {/* ═══ ลิงก์จำลองการจ่ายเงิน (test mode เท่านั้น) ═══
                    ใน test mode ข้อมูลใน QR ไม่ใช่ payload ของ PromptPay จริง
                    แอปธนาคารจะอ่านไม่ออก ต้องกดลิงก์นี้แทน
                    แสดงตาม testMode ที่ backend ส่งมา — ใช้คีย์โหมดจริงเมื่อไหร่ลิงก์จะหายเอง

                    <a> ธรรมดาไม่มี target — เปิดในแท็บเดิม ไม่งอกแท็บใหม่
                    เหมือน PromptPayPanel ฝั่งออนไลน์ทุกตัวอักษร
                    กดย้อนกลับมาแล้วหน้านี้จะใช้บิลใบเดิมต่อ ไม่สร้างแถวใหม่ */}
                {hostedUrl && testMode && (
                  <div className="mt-4 mb-1 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">โหมดทดสอบ</p>
                    <a
                      href={hostedUrl}
                      className="text-sm font-medium text-amber-600 underline hover:text-amber-700"
                    >
                      เปิดหน้าจำลองการชำระเงินของ Stripe →
                    </a>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 mt-5 text-sm text-amber-700">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  รอการชำระเงิน · QR หมดอายุใน {mmss(secondsLeft)}
                </div>
              </>
            )}
          </div>
        </div>

        {!creating && !error && !failed && !expired && qrImageUrl && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="font-semibold text-amber-800 mb-2">วิธีชำระเงิน</p>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>เปิดแอปธนาคารของคุณ เลือกเมนูสแกน</li>
                <li>สแกน QR ด้านบน ตรวจสอบยอดให้ตรง</li>
                <li>ยืนยันการโอน แล้วรอสักครู่</li>
              </ol>
              <p className="text-xs text-amber-700 mt-3">
                หน้านี้จะเปลี่ยนเองอัตโนมัติเมื่อได้รับเงิน ไม่ต้องกดอะไรเพิ่ม
                และไม่ต้องอัปโหลดสลิป
              </p>
            </div>

            <button
              onClick={handleCancel}
              disabled={canceling}
              className="w-full py-3 rounded-xl font-semibold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {canceling ? "กำลังยกเลิก..." : "ยกเลิกการชำระเงิน"}
            </button>

            <p className="text-center text-xs text-gray-400">
              อย่าปิดหน้านี้จนกว่าการชำระเงินจะเสร็จสิ้น
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function BillQRPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-amber-50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BillQRContent />
    </Suspense>
  );
}