"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DineInBar() {
  const [isDineIn, setIsDineIn] = useState(false);
  const [tableNo, setTableNo] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    const check = () => {
      const mode = localStorage.getItem("orderMode");
      const table = localStorage.getItem("tableNo") || "";
      setIsDineIn(mode === "dinein");
      setTableNo(table);
    };
    check();
    window.addEventListener("storage", check);
    window.addEventListener("orderModeChanged", check);
    return () => {
      window.removeEventListener("storage", check);
      window.removeEventListener("orderModeChanged", check);
    };
  }, []);

  if (!isDineIn || pathname?.startsWith("/admin")) return null;

  const isActive = pathname?.startsWith("/order-detail");

  return (
    <div className="fixed top-[72px] right-4 md:right-8 lg:right-10 z-50 flex flex-col items-end gap-1.5">
      {/* Table label */}
      {tableNo && (
        <span className="bg-amber-900 text-amber-100 text-[11px] md:text-xs font-medium px-3 py-1 rounded-full shadow">
          🪑 โต๊ะ {tableNo}
        </span>
      )}

      {/* Receipt button */}
      <Link
        href="/order-detail"
        className={`flex items-center gap-2 px-4 py-2.5 md:px-5 md:py-3 lg:px-6 lg:py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 ${
          isActive
            ? "bg-orange-500 text-white shadow-orange-300"
            : "bg-white text-gray-700 border border-gray-200 hover:bg-orange-50 hover:text-orange-500"
        }`}
      >
        <svg
          className="w-5 h-5 lg:w-6 lg:h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 2L4 4l2 2-2 2 2 2-2 2 2 2-2 2 2 2V2h12v18l2-2-2-2 2-2-2-2 2-2-2-2 2-2-2-2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 8h6M9 11h6M9 14h4"
          />
        </svg>
        <span className="text-sm lg:text-base font-semibold">ออเดอร์</span>
      </Link>
    </div>
  );
}