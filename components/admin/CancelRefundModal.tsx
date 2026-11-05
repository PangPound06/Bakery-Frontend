"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CancelRefundModal — แอดมินยกเลิกออเดอร์ที่จ่ายเงินแล้ว พร้อมคืนเงิน
 *
 * ═══ ตัดออกบางรายการได้ ไม่ต้องรอลูกค้า ═══
 * เคสของหมดกะทันหันคือแอดมินรู้ก่อนลูกค้าเสมอ
 * จึงต้องตัดรายการนั้นออกแล้วคืนเงินเฉพาะส่วนได้เอง ที่เหลือส่งต่อตามปกติ
 *
 * ═══ ทำไมไม่ใช้ <select> ═══
 * รายการที่กางออกมาของ select เป็นของ browser วาดเอง จัดขอบโค้งไม่ได้
 * ตัวเลือกในนี้จึงเป็น div ล้วน
 *
 * ═══ หน่วยของ quantity ═══
 * tb_order_items เก็บเป็น "ชิ้น" (เค้ก 1 ปอนด์ = 8) แต่คนคิดเป็น "ออเดอร์"
 * หน้านี้แสดงเป็นออเดอร์แล้วคูณกลับเป็นชิ้นก่อนส่ง API
 * ตรงกับ ProductQuantityHelper ฝั่ง backend
 */

export interface RefundItem {
  id: number;
  productName: string;
  price: number;
  /** จำนวน "ชิ้น" ที่สั่ง */
  quantity: number;
  selectedOption?: string | null;
  /** จำนวน "ชิ้น" ที่ยกเลิกและคืนเงินไปแล้ว */
  cancelledQty?: number | null;
}

export interface CancelRefundValues {
  reasonCode: string;
  mode: string;
  note: string | null;
  /** ว่าง = ยกเลิกทั้งใบ */
  items: { orderItemId: number; quantity: number }[];
}

interface Props {
  ordCode: string;
  total: number;
  items: RefundItem[];
  /** เปิดมาแล้วติ๊กรายการนี้ให้เลย — ใช้ตอนกดถังขยะที่รายการใดรายการหนึ่ง */
  preselectItemId?: number | null;
  /** คืน true ถ้าสำเร็จ — modal จะปิดเอง ถ้า false ค้างไว้ให้แก้ */
  onConfirm: (values: CancelRefundValues) => Promise<boolean>;
  onClose: () => void;
}

interface Choice {
  value: string;
  label: string;
  hint?: string;
}

const REASONS: Choice[] = [
  { value: "out_of_stock", label: "สินค้าหมดกะทันหัน" },
  { value: "shop_cancelled", label: "ร้านทำให้ไม่ได้" },
  { value: "delivery_issue", label: "จัดส่งไม่ได้" },
  { value: "other", label: "เหตุผลอื่น", hint: "ต้องเขียนบันทึกด้วย" },
];

const MODES: Choice[] = [
  { value: "full", label: "คืนเต็มจำนวน", hint: "ร้านรับค่าธรรมเนียมเอง" },
  {
    value: "fee_deducted",
    label: "หักค่าธรรมเนียมชำระเงิน",
    hint: "ลูกค้ารับภาระค่าธรรมเนียม",
  },
];

const formatPrice = (n: number) =>
  (n ?? 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** จำนวนชิ้นต่อ 1 ออเดอร์ — ตรงกับ ProductQuantityHelper */
const multiplierOf = (opt?: string | null) => {
  if (!opt) return 1;
  if (opt.includes("2 ปอนด์")) return 16;
  if (opt.includes("1 ปอนด์")) return 8;
  return 1;
};

/** Dropdown ที่เขียนเอง — ไม่ใช้ <select> จะได้จัดหน้าตารายการได้ */
function Dropdown({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Choice[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 bg-white text-left transition-colors disabled:opacity-50 ${
          open
            ? "border-amber-500 ring-2 ring-amber-200"
            : "border-amber-200 hover:border-amber-300"
        }`}
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium text-gray-800 truncate">
            {selected?.label ?? "เลือก"}
          </span>
          {selected?.hint && (
            <span className="block text-xs text-gray-500 truncate">
              {selected.hint}
            </span>
          )}
        </span>
        <svg
          className={`w-5 h-5 text-amber-600 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full bg-white border-2 border-amber-200 rounded-xl shadow-xl overflow-hidden">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-start gap-2 px-4 py-3 text-left transition-colors ${
                  active ? "bg-amber-50" : "hover:bg-amber-50/60"
                }`}
              >
                <span className="w-5 shrink-0 text-amber-600">
                  {active ? "✓" : ""}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-sm truncate ${
                      active
                        ? "font-semibold text-amber-700"
                        : "font-medium text-gray-700"
                    }`}
                  >
                    {opt.label}
                  </span>
                  {opt.hint && (
                    <span className="block text-xs text-gray-500">
                      {opt.hint}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CancelRefundModal({
  ordCode,
  total,
  items,
  preselectItemId,
  onConfirm,
  onClose,
}: Props) {
  /** รายการที่ยังยกเลิกได้ พร้อมจำนวนคงเหลือหน่วย "ออเดอร์" */
  const cancelable = items
    .map((it) => {
      const mult = multiplierOf(it.selectedOption);
      const remainingRaw = it.quantity - (it.cancelledQty ?? 0);
      return {
        ...it,
        mult,
        remainingUnits: Math.max(0, Math.floor(remainingRaw / mult)),
      };
    })
    .filter((it) => it.remainingUnits > 0);

  const [scope, setScope] = useState<"full" | "partial">(
    preselectItemId ? "partial" : "full",
  );
  const [picked, setPicked] = useState<Record<number, number>>(() => {
    const hit = cancelable.find((it) => it.id === preselectItemId);
    return hit ? { [hit.id]: hit.remainingUnits } : {};
  });
  const [reasonCode, setReasonCode] = useState("out_of_stock");
  const [mode, setMode] = useState("full");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const chosen = cancelable
    .filter((it) => (picked[it.id] ?? 0) > 0)
    .map((it) => ({
      orderItemId: it.id,
      quantity: (picked[it.id] ?? 0) * it.mult,
    }));

  /** มูลค่าสินค้าที่เลือก — ยอดคืนจริง backend คำนวณใหม่ตอนรับคำสั่ง */
  const grossSelected = cancelable.reduce(
    (sum, it) => sum + it.price * (picked[it.id] ?? 0),
    0,
  );

  const toggleItem = (id: number, remainingUnits: number) => {
    setPicked((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = remainingUnits;
      return next;
    });
  };

  const setQty = (id: number, qty: number, max: number) => {
    setPicked((prev) => ({ ...prev, [id]: Math.min(Math.max(qty, 1), max) }));
  };

  const submit = async () => {
    setError("");
    if (reasonCode === "other" && !note.trim()) {
      setError("เลือกเหตุผลอื่น ต้องเขียนบันทึกถึงลูกค้าด้วย");
      return;
    }
    if (scope === "partial" && chosen.length === 0) {
      setError("เลือกรายการที่ต้องการตัดออกก่อน");
      return;
    }

    setSubmitting(true);
    try {
      const ok = await onConfirm({
        reasonCode,
        mode,
        note: note.trim() || null,
        items: scope === "full" ? [] : chosen,
      });
      if (ok) onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* ─── หัวข้อ ─── */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-amber-500 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white">ยกเลิกและคืนเงิน</h2>
            <p className="text-sm text-amber-100 mt-0.5">#{ordCode}</p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 hover:bg-amber-600 rounded-lg transition-colors text-white disabled:opacity-50"
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
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-600">
              คืนเงินผ่าน Stripe ทันทีและย้อนกลับไม่ได้ สต็อกจะถูกคืนให้อัตโนมัติ
            </p>
            <p className="text-sm font-semibold text-red-700 mt-1">
              ยอดที่เก็บไป ฿{formatPrice(total)}
            </p>
          </div>

          {/* ─── ขอบเขต ─── */}
          <div>
            <h3 className="font-semibold text-amber-800 mb-2">
              🧾 ยกเลิกแค่ไหน
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScope("full")}
                disabled={submitting}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  scope === "full"
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-amber-200 text-gray-600 hover:border-amber-300"
                }`}
              >
                ทั้งคำสั่งซื้อ
              </button>
              <button
                type="button"
                onClick={() => setScope("partial")}
                disabled={submitting || cancelable.length === 0}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  scope === "partial"
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-amber-200 text-gray-600 hover:border-amber-300"
                } ${cancelable.length === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                ตัดบางรายการ
              </button>
            </div>
          </div>

          {/* ─── เลือกรายการ ─── */}
          {scope === "partial" && (
            <div>
              <h3 className="font-semibold text-amber-800 mb-2">
                🛒 รายการที่จะตัดออก
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
                          : "border-amber-200 bg-white hover:border-amber-300"
                      }`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={submitting}
                          onChange={() => toggleItem(it.id, it.remainingUnits)}
                          className="mt-1 w-4 h-4 accent-amber-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-amber-700 truncate">
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
                          </p>
                        </div>
                      </label>

                      {selected && it.remainingUnits > 1 && (
                        <div className="flex items-center gap-3 mt-3 pl-7">
                          <span className="text-xs text-gray-500">จำนวน</span>
                          <div className="flex items-center border-2 border-amber-300 rounded-lg overflow-hidden bg-white">
                            <button
                              type="button"
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
                              type="button"
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

              {grossSelected > 0 && (
                <div className="mt-3 flex justify-between items-center bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
                  <span className="text-sm text-amber-700">
                    มูลค่าสินค้าที่ตัดออก
                  </span>
                  <span className="font-bold text-amber-600">
                    ฿{formatPrice(grossSelected)}
                  </span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                ค่าจัดส่งไม่คืน เพราะยังมีสินค้าที่ต้องส่งอยู่
                ยอดคืนจริงคำนวณตอนกดยืนยัน
              </p>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-amber-800 mb-2">💬 เหตุผล</h3>
            <Dropdown
              options={REASONS}
              value={reasonCode}
              onChange={setReasonCode}
              disabled={submitting}
            />
          </div>

          <div>
            <h3 className="font-semibold text-amber-800 mb-2">💰 วิธีคืนเงิน</h3>
            <Dropdown
              options={MODES}
              value={mode}
              onChange={setMode}
              disabled={submitting}
            />
          </div>

          <div>
            <h3 className="font-semibold text-amber-800 mb-2">
              📝 บันทึกถึงลูกค้า
              {reasonCode === "other" && (
                <span className="text-red-500 font-normal"> (จำเป็น)</span>
              )}
            </h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={300}
              disabled={submitting}
              placeholder="เช่น ขออภัย วัตถุดิบหมดกะทันหัน"
              className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-500 disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
        </div>

        {/* ─── ปุ่ม ─── */}
        <div className="sticky bottom-0 bg-white border-t border-amber-100 p-6 pt-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
          >
            ไม่ยกเลิก
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:bg-gray-300"
          >
            {submitting
              ? "กำลังคืนเงิน..."
              : scope === "full"
                ? "❌ ยกเลิกทั้งใบ"
                : "❌ ตัดออกและคืนเงิน"}
          </button>
        </div>
      </div>
    </div>
  );
}