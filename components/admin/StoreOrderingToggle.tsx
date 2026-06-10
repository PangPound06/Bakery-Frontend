"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { api } from "@/lib/api";

interface Status {
  onlineOrdering: boolean;
  message: string;
  reopenAt: string;
}

/**
 * การ์ดควบคุมการเปิด/ปิดรับออเดอร์ออนไลน์ (ใช้ในหน้า admin dashboard)
 */
export default function StoreOrderingToggle() {
  const [status, setStatus] = useState<Status>({
    onlineOrdering: true,
    message: "",
    reopenAt: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [reopenAt, setReopenAt] = useState("");

  const applyStatus = (data: Status) => {
    setStatus({
      onlineOrdering: data.onlineOrdering !== false,
      message: data.message || "",
      reopenAt: data.reopenAt || "",
    });
    setMessage(data.message || "");
    setReopenAt(data.reopenAt || "");
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<Status>("/api/store/status", {
          noAuth: true,
        });
        applyStatus(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const apply = async (open: boolean) => {
    if (!open) {
      const c = await Swal.fire({
        title: "ปิดรับออเดอร์ออนไลน์?",
        text: "ลูกค้าจะสั่งออนไลน์ไม่ได้ชั่วคราว (ขายหน้าร้าน/ทานในร้านยังปกติ)",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "ปิดรับ",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#dc2626",
      });
      if (!c.isConfirmed) return;
    }

    setSaving(true);
    try {
      const data = await api.put<Status>("/api/store/online-ordering", {
        open,
        message: open ? "" : message,
        reopenAt: open ? "" : reopenAt,
      });
      applyStatus(data);
      Swal.fire({
        icon: "success",
        title: open ? "เปิดรับออเดอร์แล้ว" : "ปิดรับออเดอร์แล้ว",
        timer: 1300,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire({ icon: "error", title: "ไม่สำเร็จ", text: "กรุณาลองใหม่" });
    } finally {
      setSaving(false);
    }
  };

  const closed = !status.onlineOrdering;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🛎️</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-amber-900">รับออเดอร์ออนไลน์</h3>
          <p className="text-sm text-gray-500">
            {loading
              ? "กำลังโหลด..."
              : closed
                ? "สถานะ: ปิดรับชั่วคราว"
                : "สถานะ: เปิดรับปกติ"}
          </p>
        </div>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full ${
            closed
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {closed ? "ปิดรับ" : "เปิดรับ"}
        </span>
        <button
          type="button"
          onClick={() => apply(closed)}
          disabled={loading || saving}
          aria-label="สลับสถานะรับออเดอร์ออนไลน์"
          className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${
            closed ? "bg-red-500" : "bg-emerald-500"
          }`}
        >
          <span
            className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${
              closed ? "left-1" : "left-7"
            }`}
          />
        </button>
      </div>

      {closed && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              ข้อความถึงลูกค้า
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="เช่น คิวเยอะมาก ขออภัยค่ะ"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              กลับมาเปิดรับเวลา
            </label>
            <input
              type="text"
              value={reopenAt}
              onChange={(e) => setReopenAt(e.target.value)}
              placeholder="เช่น 14:00"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <button
            type="button"
            onClick={() => apply(false)}
            disabled={saving}
            className="sm:col-span-2 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "อัปเดตข้อความ/เวลา"}
          </button>
        </div>
      )}
    </div>
  );
}