"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";

/**
 * CancelRequestModal — ลูกค้ายื่นคำขอยกเลิก (ยกเลิกเองไม่ได้)
 *
 * ═══ ทำไมไม่ยกเลิกให้เลย ═══
 * การคืนเงินมีค่าธรรมเนียมที่ Stripe ไม่คืนให้ร้าน และเค้กที่อบแล้วขายต่อไม่ได้
 * หน้านี้จึงแค่ "ยื่นคำขอ" แล้วแอดมินเป็นคนตัดสินและกดคืนเงิน
 *
 * ═══ หน่วยของ quantity ═══
 * backend เก็บ quantity เป็น "ชิ้น" (เค้ก 1 ปอนด์ = 8 ชิ้น, 2 ปอนด์ = 16 ชิ้น)
 * แต่ลูกค้าคิดเป็น "จำนวนออเดอร์" หน้านี้จึงแสดงเป็นออเดอร์
 * แล้วคูณ multiplier กลับเป็นชิ้นก่อนส่งขึ้น API — ตรงกับ ProductQuantityHelper ฝั่ง backend
 *
 * ═══ ยอดคืนมาจากไหน ═══
 * จาก POST /api/cancel-requests/preview เท่านั้น หน้านี้ไม่คำนวณเอง
 * เพราะค่าธรรมเนียมจริงต้องถาม Stripe ตอนนั้น
 */

export interface CancelableItem {
  id: number;
  productId: number;
  productName: string;
  price: number;
  /** จำนวน "ชิ้น" ที่สั่งไว้ */
  quantity: number;
  selectedOption?: string | null;
  /** จำนวน "ชิ้น" ที่ถูกยกเลิกไปแล้ว (backend ส่งมาใน itemToMap) */
  cancelledQty?: number | null;
}

interface Props {
  orderId: number;
  ordCode: string;
  items: CancelableItem[];
  onClose: () => void;
  /** เรียกหลังยื่นคำขอสำเร็จ — ให้หน้าแม่รีเฟรชรายการออเดอร์ */
  onSubmitted: (requestId: number, message: string) => void;
}

interface PreviewResult {
  scope: string;
  grossAmount: number;
  feeDeducted: number;
  refundAmount: number;
  includesShipping: boolean;
}

const REASONS: { code: string; label: string }[] = [
  { code: "changed_mind", label: "เปลี่ยนใจ / ไม่ต้องการแล้ว" },
  { code: "wrong_item", label: "สั่งผิดรายการหรือผิดตัวเลือก" },
  { code: "duplicate", label: "สั่งซ้ำโดยไม่ได้ตั้งใจ" },
  { code: "delivery_issue", label: "ที่อยู่หรือเวลาจัดส่งมีปัญหา" },
  { code: "too_slow", label: "รอนานเกินไป" },
  { code: "other", label: "เหตุผลอื่น" },
];

const formatPrice = (n: number) =>
  n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** จำนวนชิ้นต่อ 1 ออเดอร์ — ตรงกับ ProductQuantityHelper.getMultiplier */
const multiplierOf = (option?: string | null) => {
  if (!option) return 1;
  if (option.includes("2 ปอนด์")) return 16;
  if (option.includes("1 ปอนด์")) return 8;
  return 1;
};

export default function CancelRequestModal({
  orderId,
  ordCode,
  items,
  onClose,
  onSubmitted,
}: Props) {
  const [scope, setScope] = useState<"full" | "partial">("full");
  /** orderItemId → จำนวน "ออเดอร์" ที่เลือกยกเลิก */
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [reasonCode, setReasonCode] = useState("");
  const [reasonNote, setReasonNote] = useState("");

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  /** รายการที่ยังยกเลิกได้ พร้อมจำนวนคงเหลือเป็น "ออเดอร์" */
  const cancelable = items
    .map((it) => {
      const mult = multiplierOf(it.selectedOption);
      const remainingRaw = it.quantity - (it.cancelledQty ?? 0);
      return {
        ...it,
        mult,
        remainingRaw,
        remainingUnits: Math.floor(remainingRaw / mult),
      };
    })
    .filter((it) => it.remainingUnits > 0);

  const allCancelled = cancelable.length === 0;

  /** แปลงรายการที่เลือกเป็น payload ของ API (หน่วยชิ้น) */
  const buildItems = useCallback(() => {
    return cancelable
      .filter((it) => (picked[it.id] ?? 0) > 0)
      .map((it) => ({
        orderItemId: it.id,
        quantity: (picked[it.id] ?? 0) * it.mult,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, items]);

  // ─── ขอยอดคืนจาก backend ทุกครั้งที่การเลือกเปลี่ยน ───
  useEffect(() => {
    const chosen = scope === "full" ? [] : buildItems();

    if (scope === "partial" && chosen.length === 0) {
      setPreview(null);
      setPreviewError("");
      return;
    }

    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setPreviewing(true);
      setPreviewError("");
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${apiUrl}/api/cancel-requests/preview`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId, items: chosen }),
        });
        const data = await res.json();
        if (data.success) {
          setPreview(data);
        } else {
          setPreview(null);
          setPreviewError(data.error || "คำนวณยอดคืนไม่สำเร็จ");
        }
      } catch {
        setPreview(null);
        setPreviewError("เชื่อมต่อ server ไม่ได้");
      } finally {
        setPreviewing(false);
      }
    }, 350);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, picked, orderId]);

  const toggleItem = (id: number, remainingUnits: number) => {
    setPicked((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = remainingUnits;
      return next;
    });
  };

  const setQty = (id: number, qty: number, max: number) => {
    const clamped = Math.min(Math.max(qty, 1), max);
    setPicked((prev) => ({ ...prev, [id]: clamped }));
  };

  const handleSubmit = async () => {
    setError("");

    if (!reasonCode) {
      setError("กรุณาเลือกเหตุผลในการยกเลิก");
      return;
    }
    if (reasonCode === "other" && !reasonNote.trim()) {
      setError("กรุณาระบุเหตุผลเพิ่มเติม");
      return;
    }
    const chosen = scope === "full" ? [] : buildItems();
    if (scope === "partial" && chosen.length === 0) {
      setError("กรุณาเลือกรายการที่ต้องการยกเลิก");
      return;
    }

    /*
     * ถามยืนยันก่อนส่ง — ส่งแล้วออเดอร์จะเข้าสถานะรอร้านพิจารณาทันที
     * ลูกค้าแก้รายการเองต่อไม่ได้จนกว่าร้านจะตัดสิน จึงไม่ควรกดพลาด
     */
    const detail =
      scope === "full"
        ? "ยกเลิกทั้งคำสั่งซื้อ"
        : `ยกเลิก ${chosen.length} รายการ`;
    const refundLine = preview
      ? `<br/>ได้คืนโดยประมาณ <b>฿${formatPrice(preview.refundAmount)}</b>`
      : "";

    const confirmed = await Swal.fire({
      title: "ส่งคำขอยกเลิก?",
      html:
        `${detail} ของ ${ordCode}${refundLine}` +
        `<br/><span style="font-size:0.85em;color:#6b7280">` +
        `ทางร้านจะเป็นผู้พิจารณา ยอดคืนจริงอาจต่างจากนี้</span>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ส่งคำขอ",
      cancelButtonText: "ยังไม่ส่ง",
    });
    if (!confirmed.isConfirmed) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/cancel-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          items: chosen,
          reasonCode,
          reasonNote: reasonNote.trim() || null,
        }),
      });
      const data = await res.json();

      if (data.success) {
        onSubmitted(data.requestId, data.message || "ส่งคำขอยกเลิกแล้ว");
      } else {
        setError(data.error || "ส่งคำขอไม่สำเร็จ");
      }
    } catch {
      setError("เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* ─── หัวข้อ ─── */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-amber-500 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white">
              ❌ ขอยกเลิกคำสั่งซื้อ
            </h2>
            <p className="text-sm text-amber-100 mt-0.5">#{ordCode}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-amber-600 rounded-lg transition-colors text-white"
            aria-label="ปิด"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-700">
              คำขอจะส่งให้ทางร้านพิจารณา ยอดคืนจริงและเวลาที่เงินเข้าบัญชี
              ขึ้นอยู่กับการอนุมัติของร้านและธนาคารของคุณ
            </p>
          </div>

          {/* ─── ขอบเขต ─── */}
          <div>
            <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
              🧾 ต้องการยกเลิกแค่ไหน
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setScope("full")}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  scope === "full"
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-gray-200 text-gray-600 hover:border-amber-300"
                }`}
              >
                ทั้งคำสั่งซื้อ
              </button>
              <button
                onClick={() => setScope("partial")}
                disabled={allCancelled}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  scope === "partial"
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-gray-200 text-gray-600 hover:border-amber-300"
                } ${allCancelled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                บางรายการ
              </button>
            </div>
          </div>

          {/* ─── เลือกรายการ ─── */}
          {scope === "partial" && (
            <div>
              <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                🛒 เลือกรายการที่จะยกเลิก
              </h3>
              <div className="space-y-2">
                {cancelable.map((it) => {
                  const selected = (picked[it.id] ?? 0) > 0;
                  const qty = picked[it.id] ?? 0;
                  return (
                    <div
                      key={it.id}
                      className={`rounded-xl border-2 p-3 transition-colors ${
                        selected
                          ? "border-amber-400 bg-amber-50"
                          : "border-gray-200 bg-white hover:border-amber-200"
                      }`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleItem(it.id, it.remainingUnits)}
                          className="mt-1 w-4 h-4 accent-amber-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-amber-700">
                            {it.productName}
                          </p>
                          {it.selectedOption && (
                            <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full mt-0.5">
                              {it.selectedOption}
                            </span>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">
                            ฿{formatPrice(it.price)} × คงเหลือ{" "}
                            {it.remainingUnits}
                            {(it.cancelledQty ?? 0) > 0 && (
                              <span className="text-red-500">
                                {" "}
                                (ยกเลิกไปแล้วบางส่วน)
                              </span>
                            )}
                          </p>
                        </div>
                      </label>

                      {selected && it.remainingUnits > 1 && (
                        <div className="flex items-center gap-3 mt-3 pl-7">
                          <span className="text-xs text-gray-500">จำนวน</span>
                          <div className="flex items-center border-2 border-amber-300 rounded-lg overflow-hidden bg-white">
                            <button
                              onClick={() =>
                                setQty(it.id, qty - 1, it.remainingUnits)
                              }
                              className="px-3 py-1 text-amber-600 hover:bg-amber-100 font-bold"
                            >
                              −
                            </button>
                            <span className="px-3 text-sm font-semibold text-amber-800">
                              {qty}
                            </span>
                            <button
                              onClick={() =>
                                setQty(it.id, qty + 1, it.remainingUnits)
                              }
                              className="px-3 py-1 text-amber-600 hover:bg-amber-100 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── เหตุผล ─── */}
          <div>
            <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
              💬 เหตุผลในการยกเลิก
            </h3>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">เลือกเหตุผล</option>
              {REASONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>

            <textarea
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder={
                reasonCode === "other"
                  ? "ระบุเหตุผล (จำเป็น)"
                  : "รายละเอียดเพิ่มเติม (ไม่บังคับ)"
              }
              className="w-full mt-2 px-4 py-3 border-2 border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* ─── ยอดที่จะได้คืน ─── */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
              💰 ยอดที่คาดว่าจะได้คืน
            </h3>

            {previewing && (
              <p className="text-sm text-amber-500">กำลังคำนวณ...</p>
            )}

            {!previewing && previewError && (
              <p className="text-sm text-red-600">{previewError}</p>
            )}

            {!previewing && !previewError && !preview && (
              <p className="text-sm text-amber-500">เลือกรายการเพื่อดูยอดคืน</p>
            )}

            {!previewing && preview && (
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>ยอดที่ยกเลิก</span>
                  <span>฿{formatPrice(preview.grossAmount)}</span>
                </div>
                {preview.feeDeducted > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>หักค่าธรรมเนียมชำระเงิน</span>
                    <span className="text-red-500">
                      −฿{formatPrice(preview.feeDeducted)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-amber-800 border-t border-amber-200 pt-2 text-base">
                  <span>ได้คืนโดยประมาณ</span>
                  <span className="text-amber-600">
                    ฿{formatPrice(preview.refundAmount)}
                  </span>
                </div>
                <p className="text-xs text-amber-600 pt-1">
                  {preview.includesShipping
                    ? "รวมค่าจัดส่งที่จ่ายไป"
                    : "ค่าจัดส่งไม่คืน เพราะยังมีสินค้าที่ต้องส่งอยู่"}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
        </div>

        {/* ─── ปุ่ม ─── */}
        <div className="sticky bottom-0 bg-white border-t border-amber-100 p-6 pt-4 rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
          >
            ยังไม่ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:bg-gray-300"
          >
            {submitting ? "กำลังส่ง..." : "❌ ส่งคำขอยกเลิก"}
          </button>
        </div>
      </div>
    </div>
  );
}