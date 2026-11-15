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
        `<br/><span style="font-size:0.85em;color:#6b5e52">` +
        `ทางร้านจะเป็นผู้พิจารณา ยอดคืนจริงอาจต่างจากนี้</span>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#b3261e",
      cancelButtonColor: "#6b5e52",
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
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-brick rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white">
              ❌ ขอยกเลิกคำสั่งซื้อ
            </h2>
            <p className="text-sm text-cream mt-0.5">#{ordCode}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-brick-hover rounded-lg transition-colors text-white"
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
          <div className="bg-warn-bg border-2 border-line rounded-xl p-4">
            <p className="text-sm text-body">
              คำขอจะส่งให้ทางร้านพิจารณา ยอดคืนจริงและเวลาที่เงินเข้าบัญชี
              ขึ้นอยู่กับการอนุมัติของร้านและธนาคารของคุณ
            </p>
          </div>

          {/* ─── ขอบเขต ─── */}
          <div>
            <h3 className="font-semibold text-ink mb-2 flex items-center gap-2">
              🧾 ต้องการยกเลิกแค่ไหน
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setScope("full")}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  scope === "full"
                    ? "border-brick bg-warn-bg text-body"
                    : "border-line text-subtle hover:border-line-strong"
                }`}
              >
                ทั้งคำสั่งซื้อ
              </button>
              <button
                onClick={() => setScope("partial")}
                disabled={allCancelled}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  scope === "partial"
                    ? "border-brick bg-warn-bg text-body"
                    : "border-line text-subtle hover:border-line-strong"
                } ${allCancelled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                บางรายการ
              </button>
            </div>
          </div>

          {/* ─── เลือกรายการ ─── */}
          {scope === "partial" && (
            <div>
              <h3 className="font-semibold text-ink mb-2 flex items-center gap-2">
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
                          ? "border-line-strong bg-warn-bg"
                          : "border-line bg-white hover:border-line"
                      }`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleItem(it.id, it.remainingUnits)}
                          className="mt-1 w-4 h-4 accent-brick"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-body">
                            {it.productName}
                          </p>
                          {it.selectedOption && (
                            <span className="inline-block px-2 py-0.5 bg-new-soft text-new-ink text-xs rounded-full mt-0.5">
                              {it.selectedOption}
                            </span>
                          )}
                          <p className="text-xs text-muted mt-0.5">
                            ฿{formatPrice(it.price)} × คงเหลือ{" "}
                            {it.remainingUnits}
                            {(it.cancelledQty ?? 0) > 0 && (
                              <span className="text-error">
                                {" "}
                                (ยกเลิกไปแล้วบางส่วน)
                              </span>
                            )}
                          </p>
                        </div>
                      </label>

                      {selected && it.remainingUnits > 1 && (
                        <div className="flex items-center gap-3 mt-3 pl-7">
                          <span className="text-xs text-muted">จำนวน</span>
                          <div className="flex items-center border-2 border-line-strong rounded-lg overflow-hidden bg-white">
                            <button
                              onClick={() =>
                                setQty(it.id, qty - 1, it.remainingUnits)
                              }
                              className="px-3 py-1 text-brick hover:bg-warn-soft font-bold"
                            >
                              −
                            </button>
                            <span className="px-3 text-sm font-semibold text-ink">
                              {qty}
                            </span>
                            <button
                              onClick={() =>
                                setQty(it.id, qty + 1, it.remainingUnits)
                              }
                              className="px-3 py-1 text-brick hover:bg-warn-soft font-bold"
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
            <h3 className="font-semibold text-ink mb-2 flex items-center gap-2">
              💬 เหตุผลในการยกเลิก
            </h3>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full px-4 py-3 border-2 border-line rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brick"
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
              className="w-full mt-2 px-4 py-3 border-2 border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brick"
            />
          </div>

          {/* ─── ยอดที่จะได้คืน ─── */}
          <div className="bg-warn-bg border-2 border-line rounded-xl p-4">
            <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
              💰 ยอดที่คาดว่าจะได้คืน
            </h3>

            {previewing && (
              <p className="text-sm text-brick">กำลังคำนวณ...</p>
            )}

            {!previewing && previewError && (
              <p className="text-sm text-error">{previewError}</p>
            )}

            {!previewing && !previewError && !preview && (
              <p className="text-sm text-brick">เลือกรายการเพื่อดูยอดคืน</p>
            )}

            {!previewing && preview && (
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-subtle">
                  <span>ยอดที่ยกเลิก</span>
                  <span>฿{formatPrice(preview.grossAmount)}</span>
                </div>
                {preview.feeDeducted > 0 && (
                  <div className="flex justify-between text-subtle">
                    <span>หักค่าธรรมเนียมชำระเงิน</span>
                    <span className="text-error">
                      −฿{formatPrice(preview.feeDeducted)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-ink border-t border-line pt-2 text-base">
                  <span>ได้คืนโดยประมาณ</span>
                  <span className="text-brick">
                    ฿{formatPrice(preview.refundAmount)}
                  </span>
                </div>
                <p className="text-xs text-brick pt-1">
                  {preview.includesShipping
                    ? "รวมค่าจัดส่งที่จ่ายไป"
                    : "ค่าจัดส่งไม่คืน เพราะยังมีสินค้าที่ต้องส่งอยู่"}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-danger-soft border-2 border-danger-line text-error px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
        </div>

        {/* ─── ปุ่ม ─── */}
        <div className="sticky bottom-0 bg-white border-t border-line p-6 pt-4 rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 bg-sand text-body rounded-xl hover:bg-line transition-colors font-medium disabled:opacity-50"
          >
            ยังไม่ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 bg-error text-white rounded-xl hover:bg-error transition-colors font-medium disabled:bg-line-strong"
          >
            {submitting ? "กำลังส่ง..." : "❌ ส่งคำขอยกเลิก"}
          </button>
        </div>
      </div>
    </div>
  );
}