"use client";

import { usePathname } from "next/navigation";
import { useStoreStatus } from "@/lib/useStoreStatus";

/**
 * แบนเนอร์แจ้งลูกค้าเมื่อร้านปิดรับออเดอร์ออนไลน์
 * แสดงเฉพาะตอนปิด และไม่แสดงในโซน /admin
 */
export default function StoreClosedBanner() {
  const pathname = usePathname();
  const { onlineOrdering, message, reopenAt, loading } = useStoreStatus();

  if (loading || onlineOrdering) return null;
  if (pathname?.startsWith("/admin")) return null;

  return (
    <div className="bg-red-50 border-b border-red-200 text-red-800">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2 text-sm text-center">
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l2 2m6-2a8 8 0 11-16 0 8 8 0 0116 0z"
          />
        </svg>
        <span>
          ขณะนี้ปิดรับออเดอร์ออนไลน์ชั่วคราว
          {message ? ` · ${message}` : ""}
          {reopenAt ? ` · เปิดอีกครั้ง ${reopenAt}` : ""}
        </span>
      </div>
    </div>
  );
}