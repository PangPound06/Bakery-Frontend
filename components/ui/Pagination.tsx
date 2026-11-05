"use client";

import { useState } from "react";

/**
 * Pagination — แถบเปลี่ยนหน้า
 *
 * ═══ หลักคิด: โชว์เท่าที่จำเป็นตามจำนวนข้อมูล ═══
 * ของเดิมโชว์ปุ่ม «« ‹ › »» ครบทุกครั้งแม้มีแค่ 2 หน้า
 * ปุ่ม 4 อันที่ทำงานซ้ำกันเรียงติดกันอ่านไม่รู้ว่าอันไหนทำอะไร
 *
 * รอบนี้เพิ่มของตามจำนวนหน้า
 *   ≤ 1 หน้า    บอกจำนวนรายการเฉยๆ ไม่มีปุ่ม
 *   ≤ 7 หน้า    เลขหน้า + ก่อนหน้า/ถัดไป
 *   > 7 หน้า    เพิ่มปุ่มไปหน้าแรก/สุดท้าย
 *   > 15 หน้า   เพิ่มช่องกรอกเลขหน้า
 *
 * ปุ่มก่อนหน้า/ถัดไปมีคำกำกับด้วย ไม่ใช่ลูกศรเปล่าๆ ให้เดา
 * (จอมือถือย่อเหลือแค่ลูกศรเพื่อประหยัดที่)
 */

interface Props {
  /** หน้าปัจจุบัน เริ่มจาก 0 ตามที่ backend ใช้ */
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

const PAGE_SIZES = [20, 50, 100, 200];

/** เลขหน้าที่จะวาด — null คือตำแหน่งที่ยุบเป็น … */
const buildPages = (page: number, totalPages: number): (number | null)[] => {
  // น้อยกว่า 8 หน้าโชว์ครบเลย ไม่ต้องยุบ อ่านง่ายกว่า
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const last = totalPages - 1;
  const out: (number | null)[] = [0];

  const from = Math.max(1, page - 1);
  const to = Math.min(last - 1, page + 1);

  if (from > 1) out.push(from === 2 ? 1 : null);
  for (let p = from; p <= to; p++) out.push(p);
  if (to < last - 1) out.push(to === last - 2 ? last - 1 : null);

  out.push(last);
  return out;
};

const Chevron = ({ dir }: { dir: "left" | "right" | "first" | "last" }) => {
  const d =
    dir === "left"
      ? "M15 19l-7-7 7-7"
      : dir === "right"
        ? "M9 5l7 7-7 7"
        : dir === "first"
          ? "M11 19l-7-7 7-7m8 14l-7-7 7-7"
          : "M13 5l7 7-7 7M5 5l7 7-7 7";
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={d}
      />
    </svg>
  );
};

export default function Pagination({
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const [jump, setJump] = useState("");
  const [jumpPage, setJumpPage] = useState(page);

  // เปลี่ยนหน้าแล้วล้างช่องกรอก ไม่ให้เลขเก่าค้างชวนงง
  if (jumpPage !== page) {
    setJumpPage(page);
    setJump("");
  }

  const firstRow = totalElements === 0 ? 0 : page * pageSize + 1;
  const lastRow = Math.min((page + 1) * pageSize, totalElements);

  const go = (p: number) => {
    const safe = Math.min(Math.max(p, 0), totalPages - 1);
    if (safe !== page) onPageChange(safe);
  };

  const sizeSelect = onPageSizeChange && (
    <label className="flex items-center gap-2 text-sm text-gray-500">
      แสดงหน้าละ
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        {PAGE_SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );

  // ─── หน้าเดียวก็ไม่ต้องมีปุ่มอะไร ───
  if (totalPages <= 1) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:px-5">
        <p className="text-sm text-gray-500">
          ทั้งหมด {totalElements.toLocaleString("th-TH")} รายการ
        </p>
        {sizeSelect}
      </div>
    );
  }

  const pages = buildPages(page, totalPages);
  const showEdgeButtons = totalPages > 7;
  const showJump = totalPages > 15;

  const edgeBtn =
    "flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors";
  const stepBtn =
    "flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors";

  return (
    <div className="border-t border-gray-100 px-4 py-3 sm:px-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* ─── ซ้าย: บอกว่ากำลังดูอะไรอยู่ ─── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">
              {firstRow.toLocaleString("th-TH")}–{lastRow.toLocaleString("th-TH")}
            </span>{" "}
            จาก {totalElements.toLocaleString("th-TH")} รายการ
          </p>
          {sizeSelect}
        </div>

        {/* ─── ขวา: ปุ่มเปลี่ยนหน้า ─── */}
        <div className="flex items-center gap-1">
          {showEdgeButtons && (
            <button
              onClick={() => go(0)}
              disabled={page <= 0}
              className={edgeBtn}
              title="หน้าแรก"
              aria-label="หน้าแรก"
            >
              <Chevron dir="first" />
            </button>
          )}

          <button
            onClick={() => go(page - 1)}
            disabled={page <= 0}
            className={stepBtn}
          >
            <Chevron dir="left" />
            <span className="hidden sm:inline">ก่อนหน้า</span>
          </button>

          <div className="flex items-center gap-1 mx-1">
            {pages.map((p, i) =>
              p === null ? (
                <span
                  key={`gap-${i}`}
                  className="w-6 text-center text-gray-300 select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => go(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={`min-w-9 h-9 px-2 rounded-lg text-sm transition-colors ${
                    p === page
                      ? "bg-amber-500 text-white font-semibold shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {(p + 1).toLocaleString("th-TH")}
                </button>
              ),
            )}
          </div>

          <button
            onClick={() => go(page + 1)}
            disabled={page >= totalPages - 1}
            className={stepBtn}
          >
            <span className="hidden sm:inline">ถัดไป</span>
            <Chevron dir="right" />
          </button>

          {showEdgeButtons && (
            <button
              onClick={() => go(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className={edgeBtn}
              title="หน้าสุดท้าย"
              aria-label="หน้าสุดท้าย"
            >
              <Chevron dir="last" />
            </button>
          )}
        </div>
      </div>

      {/* ─── ช่องกรอกเลขหน้า มีเฉพาะตอนหน้าเยอะจริง ─── */}
      {showJump && (
        <div className="flex items-center justify-end gap-2 text-sm text-gray-500">
          <span>ข้ามไปหน้า</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const n = parseInt(jump, 10);
              if (!Number.isNaN(n)) go(n - 1);
            }}
            placeholder={String(page + 1)}
            className="w-20 px-2 py-1 rounded-lg border border-gray-200 bg-white text-center text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <span>จาก {totalPages.toLocaleString("th-TH")}</span>
        </div>
      )}
    </div>
  );
}