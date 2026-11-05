"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";

/**
 * หน้าจัดการคำขอยกเลิก — จุดเดียวที่เงินไหลออกจากร้าน
 *
 * ═══ สามโหมดตอนอนุมัติ ═══
 * fee_deducted  ลูกค้ารับภาระค่าธรรมเนียม Stripe (ใช้เมื่อลูกค้าเปลี่ยนใจ)
 * full          ร้านรับค่าธรรมเนียมเอง (ใช้เมื่อร้านเป็นฝ่ายทำไม่ได้ เช่น ของหมด)
 * manual        ระบุยอดเอง (กรณีตกลงกับลูกค้าเป็นพิเศษ)
 *
 * ═══ กดอนุมัติแล้วย้อนไม่ได้ ═══
 * ปุ่มอนุมัติเรียก Stripe คืนเงินจริงทันที แล้วคืน stock ในคำสั่งเดียวกัน
 * จึงถามยืนยันก่อนทุกครั้งและโชว์ยอดที่จะคืนให้เห็นชัดก่อนกด
 *
 * ═══ ทำไมต้อง poll ═══
 * แอดมินหลายคนเปิดหน้านี้พร้อมกันได้ ถ้าอีกคนอนุมัติไปแล้ว
 * หน้านี้ต้องเห็นภายในไม่กี่วินาที ไม่ใช่ค้างที่ "รอพิจารณา" จนกดซ้ำ
 */

interface CancelRequest {
  id: number;
  order_id: number;
  ord_code: string | null;
  order_total?: number | null;
  email: string;
  scope: string;
  reason_code: string;
  reason_note: string | null;
  estimated_refund: number;
  status: string;
  decided_by: string | null;
  decided_at: string | number | null;
  decision_note: string | null;
  created_at: string | number;
}

interface RequestItem {
  id: number;
  order_item_id: number;
  quantity: number;
  line_amount: number;
  product_name: string;
  selected_option: string | null;
  price: number;
}

type Tab = "pending" | "approved" | "rejected" | "all";

const TABS: { key: Tab; label: string; icon: string; color: string }[] = [
  { key: "pending", label: "รอพิจารณา", icon: "⏳", color: "bg-yellow-100" },
  { key: "approved", label: "อนุมัติแล้ว", icon: "✅", color: "bg-green-100" },
  { key: "rejected", label: "ปฏิเสธแล้ว", icon: "🚫", color: "bg-red-100" },
  { key: "all", label: "ทั้งหมด", icon: "📋", color: "bg-gray-100" },
];

const REASON_TEXT: Record<string, string> = {
  changed_mind: "เปลี่ยนใจ",
  wrong_item: "สั่งผิดรายการ",
  duplicate: "สั่งซ้ำ",
  delivery_issue: "ปัญหาการจัดส่ง",
  too_slow: "รอนานเกินไป",
  other: "เหตุผลอื่น",
  // เหตุฝั่งร้าน — เกิดจากแอดมินกดยกเลิกเอง ไม่ใช่ลูกค้ายื่นคำขอ
  out_of_stock: "สินค้าหมดกะทันหัน",
  shop_cancelled: "ร้านทำให้ไม่ได้",
};

const formatPrice = (n: number) =>
  (n ?? 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** queryForList คืน java.sql.Timestamp → Jackson ส่งมาเป็น epoch millis รองรับ string ด้วย */
const formatDate = (value: string | number | null) => {
  if (value === null || value === undefined) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
};

const statusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return {
        text: "รอพิจารณา",
        bg: "bg-yellow-100 text-yellow-700",
        icon: "⏳",
      };
    case "approved":
      return {
        text: "อนุมัติแล้ว",
        bg: "bg-green-100 text-green-700",
        icon: "✅",
      };
    case "rejected":
      return { text: "ปฏิเสธแล้ว", bg: "bg-red-100 text-red-700", icon: "🚫" };
    default:
      return { text: status, bg: "bg-gray-100 text-gray-700", icon: "📋" };
  }
};

export default function AdminCancelRequestsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [requests, setRequests] = useState<CancelRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [openId, setOpenId] = useState<number | null>(null);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [mode, setMode] = useState<"fee_deducted" | "full" | "manual">(
    "fee_deducted",
  );
  const [manualAmount, setManualAmount] = useState("");
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);

  const workingRef = useRef(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  /** ดึงมาทั้งหมดครั้งเดียวแล้วกรองในหน้า — จะได้นับจำนวนแต่ละแท็บไปด้วย */
  const fetchRequests = useCallback(
    async (silent = false) => {
      // กำลังคืนเงินอยู่ อย่าเพิ่งสลับข้อมูลใต้มือแอดมิน
      if (silent && workingRef.current) return;
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${apiUrl}/api/admin/cancel-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setRequests(data.requests ?? []);
      } catch {
        /* network สะดุด — รอบหน้าเอาใหม่ */
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [apiUrl],
  );

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    const interval = setInterval(() => fetchRequests(true), 3000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  useEffect(() => {
    workingRef.current = working;
  }, [working]);

  const countOf = (key: Tab) =>
    key === "all"
      ? requests.length
      : requests.filter((r) => r.status === key).length;

  const visible =
    tab === "all" ? requests : requests.filter((r) => r.status === tab);

  const openRequest = async (req: CancelRequest) => {
    if (openId === req.id) {
      setOpenId(null);
      return;
    }
    setOpenId(req.id);
    setMode("fee_deducted");
    setManualAmount("");
    setNote("");
    setItems([]);

    if (req.scope !== "partial") return;

    setLoadingItems(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${apiUrl}/api/admin/cancel-requests/${req.id}/items`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      setItems(data.success ? (data.items ?? []) : []);
    } catch {
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const approve = async (req: CancelRequest) => {
    if (mode === "manual" && !(Number(manualAmount) > 0)) {
      await Swal.fire({
        title: "ระบุยอดคืนก่อน",
        text: "โหมดระบุเองต้องกรอกยอดที่ต้องการคืน",
        icon: "warning",
        confirmButtonColor: "#f97316",
      });
      return;
    }

    const amountText =
      mode === "manual"
        ? `฿${formatPrice(Number(manualAmount))}`
        : mode === "full"
          ? "เต็มจำนวนโดยไม่หักค่าธรรมเนียม"
          : `ประมาณ ฿${formatPrice(req.estimated_refund)} (หักค่าธรรมเนียมแล้ว)`;

    const confirm = await Swal.fire({
      title: `คืนเงินคำขอ #${req.id}?`,
      html: `คืนเงิน <b>${amountText}</b><br/>ผ่าน Stripe ทันที และย้อนกลับไม่ได้`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ยืนยันคืนเงิน",
      cancelButtonText: "ยกเลิก",
    });
    if (!confirm.isConfirmed) return;

    setWorking(true);
    workingRef.current = true;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${apiUrl}/api/admin/cancel-requests/${req.id}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            mode,
            amount: mode === "manual" ? Number(manualAmount) : null,
            note: note.trim() || null,
          }),
        },
      );
      const data = await res.json();

      if (data.success) {
        await Swal.fire({
          title: "คืนเงินแล้ว",
          text: data.message,
          icon: "success",
          confirmButtonColor: "#f97316",
        });
        setOpenId(null);
      } else {
        await Swal.fire({
          title: "คืนเงินไม่สำเร็จ",
          text: data.error || "ลองใหม่อีกครั้ง",
          icon: "error",
          confirmButtonColor: "#f97316",
        });
      }
    } catch {
      await Swal.fire({
        title: "เชื่อมต่อ server ไม่ได้",
        text: "ตรวจสอบใน Stripe Dashboard ก่อนกดซ้ำ",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
    } finally {
      setWorking(false);
      workingRef.current = false;
      fetchRequests(true);
    }
  };

  const reject = async (req: CancelRequest) => {
    if (!note.trim()) {
      await Swal.fire({
        title: "ระบุเหตุผลก่อน",
        text: "ลูกค้าจะเห็นเหตุผลนี้ จึงต้องกรอกก่อนปฏิเสธ",
        icon: "warning",
        confirmButtonColor: "#f97316",
      });
      return;
    }

    setWorking(true);
    workingRef.current = true;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${apiUrl}/api/admin/cancel-requests/${req.id}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ note: note.trim() }),
        },
      );
      const data = await res.json();

      if (data.success) {
        await Swal.fire({
          title: "ปฏิเสธคำขอแล้ว",
          text: "คำสั่งซื้อกลับไปสถานะยืนยันแล้ว",
          icon: "success",
          confirmButtonColor: "#f97316",
        });
        setOpenId(null);
      } else {
        await Swal.fire({
          title: "ดำเนินการไม่สำเร็จ",
          text: data.error || "ลองใหม่อีกครั้ง",
          icon: "error",
          confirmButtonColor: "#f97316",
        });
      }
    } finally {
      setWorking(false);
      workingRef.current = false;
      fetchRequests(true);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-700">กำลังโหลด...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-amber-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-800 flex items-center gap-3">
            <span className="text-4xl">💸</span>Cancel Requests
          </h1>
          <p className="text-amber-600 mt-1">
            อนุมัติแล้วระบบจะคืนเงินผ่าน Stripe และคืนสต็อกให้อัตโนมัติ
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-2 md:gap-3 mb-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`p-2 md:p-3 rounded-xl text-center transition-all ${
                tab === t.key
                  ? "ring-2 ring-amber-500 shadow-md"
                  : "hover:shadow-md"
              } ${t.color}`}
            >
              <div className="text-xl md:text-2xl">{t.icon}</div>
              <div className="text-[10px] md:text-xs font-medium mt-1 leading-tight">
                {t.label}
              </div>
              <div className="text-base md:text-lg font-bold">
                {countOf(t.key)}
              </div>
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <p className="text-amber-700 font-medium">
              {tab === "pending"
                ? "ไม่มีคำขอที่รอพิจารณา"
                : "ไม่มีคำขอในหมวดนี้"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((req) => {
              const badge = statusBadge(req.status);
              const open = openId === req.id;

              return (
                <div
                  key={req.id}
                  className={`bg-white rounded-2xl shadow-md overflow-hidden transition-all ${
                    open ? "ring-2 ring-amber-400" : ""
                  }`}
                >
                  {/* แถวสรุป */}
                  <button
                    onClick={() => openRequest(req)}
                    className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-amber-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-amber-800">
                          #{req.id}
                        </span>
                        <span className="text-sm font-medium text-amber-700">
                          {req.ord_code || `order ${req.order_id}`}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg}`}
                        >
                          {badge.icon} {badge.text}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                          {req.scope === "full" ? "ทั้งใบ" : "บางรายการ"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {req.email} ·{" "}
                        {REASON_TEXT[req.reason_code] ?? req.reason_code} ·{" "}
                        {formatDate(req.created_at)}
                      </p>
                    </div>

                    <div className="text-right whitespace-nowrap">
                      <p className="text-[10px] text-gray-400">
                        ยอดคืนที่คำนวณไว้
                      </p>
                      <p className="font-bold text-lg text-amber-600">
                        ฿{formatPrice(req.estimated_refund)}
                      </p>
                    </div>
                  </button>

                  {/* รายละเอียด */}
                  {open && (
                    <div className="border-t border-amber-100 px-5 py-5 space-y-5 bg-amber-50/40">
                      {req.reason_note && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">
                            💬 ลูกค้าเขียนมาว่า
                          </p>
                          <p className="text-sm bg-white border border-amber-100 rounded-xl p-3">
                            {req.reason_note}
                          </p>
                        </div>
                      )}

                      {req.scope === "partial" && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">
                            🛒 รายการที่ขอยกเลิก
                          </p>
                          {loadingItems ? (
                            <p className="text-sm text-gray-400">
                              กำลังโหลดรายการ...
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {items.map((it) => (
                                <div
                                  key={it.id}
                                  className="flex justify-between items-center p-3 bg-white rounded-lg border border-amber-100"
                                >
                                  <div className="min-w-0">
                                    <p className="font-medium text-amber-700 truncate">
                                      {it.product_name}
                                    </p>
                                    {it.selected_option && (
                                      <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full mt-0.5">
                                        {it.selected_option}
                                      </span>
                                    )}
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {it.quantity} ชิ้น
                                    </p>
                                  </div>
                                  <span className="font-semibold text-amber-600 whitespace-nowrap">
                                    ฿{formatPrice(it.line_amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {req.status === "pending" ? (
                        <>
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              💰 วิธีคืนเงิน
                            </p>
                            <div className="space-y-2">
                              <ModeOption
                                active={mode === "fee_deducted"}
                                onClick={() => setMode("fee_deducted")}
                                title="หักค่าธรรมเนียม"
                                desc={`ลูกค้าได้คืนประมาณ ฿${formatPrice(req.estimated_refund)} — ใช้เมื่อลูกค้าเป็นฝ่ายเปลี่ยนใจ`}
                              />
                              <ModeOption
                                active={mode === "full"}
                                onClick={() => setMode("full")}
                                title="คืนเต็มจำนวน"
                                desc="ร้านรับค่าธรรมเนียมเอง — ใช้เมื่อของหมดหรือร้านทำให้ไม่ได้"
                              />
                              <ModeOption
                                active={mode === "manual"}
                                onClick={() => setMode("manual")}
                                title="ระบุยอดเอง"
                                desc="กรณีตกลงกับลูกค้าเป็นพิเศษ"
                              />
                            </div>

                            {mode === "manual" && (
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-amber-700 font-medium">
                                  ฿
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={manualAmount}
                                  onChange={(e) =>
                                    setManualAmount(e.target.value)
                                  }
                                  placeholder="ยอดที่จะคืน"
                                  className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              📝 บันทึกถึงลูกค้า{" "}
                              <span className="font-normal text-gray-400">
                                (จำเป็นถ้าปฏิเสธ)
                              </span>
                            </p>
                            <textarea
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              rows={2}
                              maxLength={300}
                              placeholder="เช่น เค้กเข้าเตาไปแล้ว ยกเลิกไม่ทัน"
                              className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => reject(req)}
                              disabled={working}
                              className="flex-1 py-3 bg-white border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 font-medium transition-colors disabled:opacity-50"
                            >
                              🚫 ปฏิเสธคำขอ
                            </button>
                            <button
                              onClick={() => approve(req)}
                              disabled={working}
                              className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition-colors disabled:bg-gray-300"
                            >
                              {working
                                ? "กำลังดำเนินการ..."
                                : "✅ อนุมัติและคืนเงิน"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm bg-white border border-amber-100 rounded-xl p-3 space-y-1">
                          <p className="text-gray-600">
                            พิจารณาโดย{" "}
                            <span className="font-medium text-amber-700">
                              {req.decided_by || "-"}
                            </span>{" "}
                            เมื่อ {formatDate(req.decided_at)}
                          </p>
                          {req.decision_note && (
                            <p className="text-gray-700">
                              บันทึก: {req.decision_note}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ModeOption({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
        active
          ? "border-amber-500 bg-amber-50"
          : "border-amber-100 bg-white hover:border-amber-300"
      }`}
    >
      <p
        className={`text-sm font-semibold ${active ? "text-amber-700" : "text-gray-700"}`}
      >
        {title}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
    </button>
  );
}