"use client";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { Config } from "@/app/Config";
import { Reservation } from "@/types/reservation";

const STATUS_LABEL: Record<string, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิกแล้ว",
  completed: "เสร็จสิ้น",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100  text-green-700",
  cancelled: "bg-red-100    text-red-500",
  completed: "bg-gray-100   text-gray-500",
};

// สถานะถัดไปที่ admin กดได้
const NEXT_ACTIONS: Record<
  string,
  { label: string; icon: string; value: string; style: string }[]
> = {
  pending: [
    {
      label: "ยืนยัน",
      icon: "fa-circle-check",
      value: "confirmed",
      style: "bg-green-500 hover:bg-green-600 text-white",
    },
    {
      label: "ยกเลิก",
      icon: "fa-circle-xmark",
      value: "cancelled",
      style: "bg-red-500   hover:bg-red-600   text-white",
    },
  ],
  confirmed: [
    {
      label: "เสร็จสิ้น",
      icon: "fa-flag-checkered",
      value: "completed",
      style: "bg-gray-600  hover:bg-gray-700  text-white",
    },
    {
      label: "ยกเลิก",
      icon: "fa-circle-xmark",
      value: "cancelled",
      style: "bg-red-500   hover:bg-red-600   text-white",
    },
  ],
  cancelled: [],
  completed: [],
};

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // ── Summary counts ──────────────────────────────────────────────────────
  const counts = reservations.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }),
    {} as Record<string, number>,
  );

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = filterDate
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/reservations/admin/all?date=${filterDate}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/reservations/admin/all`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setReservations(Array.isArray(data) ? data : []);
    } catch {
      Swal.fire({
        icon: "error",
        title: "โหลดข้อมูลไม่สำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });
    } finally {
      setLoading(false);
    }
  }, [filterDate]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  async function updateStatus(id: number, status: string, label: string) {
    const result = await Swal.fire({
      icon: "question",
      title: `เปลี่ยนสถานะเป็น "${label}"?`,
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#8b5e3c",
    });
    if (!result.isConfirmed) return;

    setUpdatingId(id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reservations/admin/${id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "อัปเดตสำเร็จ",
          timer: 1000,
          showConfirmButton: false,
        });
        fetchReservations();
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: data.message,
        });
      }
    } catch {
      Swal.fire({ icon: "error", title: "ไม่สามารถเชื่อมต่อได้" });
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = reservations.filter((r) =>
    filterStatus ? r.status === filterStatus : true,
  );

  return (
    <div className="p-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            <i className="fa-solid fa-calendar-days mr-2 text-[#8b5e3c]" />
            จัดการการจองโต๊ะ
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            ดูและเปลี่ยนสถานะการจองทั้งหมด
          </p>
        </div>
        <button
          onClick={fetchReservations}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <i
            className={`fa-solid fa-rotate-right ${loading ? "fa-spin" : ""}`}
          />
          รีเฟรช
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            key: "pending",
            label: "รอยืนยัน",
            icon: "fa-hourglass-half",
            color: "bg-yellow-50 border-yellow-200 text-yellow-600",
          },
          {
            key: "confirmed",
            label: "ยืนยันแล้ว",
            icon: "fa-circle-check",
            color: "bg-green-50  border-green-200  text-green-600",
          },
          {
            key: "completed",
            label: "เสร็จสิ้น",
            icon: "fa-flag-checkered",
            color: "bg-blue-50   border-blue-200   text-blue-600",
          },
          {
            key: "cancelled",
            label: "ยกเลิก",
            icon: "fa-circle-xmark",
            color: "bg-red-50    border-red-200    text-red-500",
          },
        ].map((s) => (
          <div key={s.key} className={`rounded-2xl border p-5 ${s.color}`}>
            <i className={`fa-solid ${s.icon} text-xl mb-2 block`} />
            <div className="text-3xl font-bold text-gray-800">
              {counts[s.key] || 0}
            </div>
            <div className="text-sm mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">
            <i className="fa-solid fa-calendar mr-1.5" />
            วันที่:
          </label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#8b5e3c]"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate("")}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              <i className="fa-solid fa-xmark" /> ล้าง
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">
            <i className="fa-solid fa-filter mr-1.5" />
            สถานะ:
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#8b5e3c] bg-white"
          >
            <option value="">ทั้งหมด</option>
            <option value="pending">รอยืนยัน</option>
            <option value="confirmed">ยืนยันแล้ว</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
        </div>

        <span className="ml-auto text-sm text-gray-400">
          {filtered.length} รายการ
        </span>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <i className="fa-solid fa-spinner fa-spin text-2xl mb-3 block" />
            กำลังโหลด...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <i className="fa-solid fa-calendar-xmark text-3xl mb-3 block opacity-40" />
            ไม่พบรายการ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">
                    รหัส
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">
                    โต๊ะ
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">
                    วัน-เวลา
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">
                    ผู้จอง
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">
                    คน
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">
                    สถานะ
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-gray-400">
                        {r.reservationCode}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-gray-800 bg-[#f5efe8] text-[#8b5e3c] px-2.5 py-1 rounded-lg text-sm">
                        {r.tableNo}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      <div className="font-medium">{r.reservationDate}</div>
                      <div className="text-xs text-gray-400">
                        <i className="fa-solid fa-clock mr-1" />
                        {r.reservationTime} น.
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      <div className="font-medium">{r.customerName}</div>
                      <div className="text-xs text-gray-400">
                        <i className="fa-solid fa-phone mr-1" />
                        {r.customerPhone}
                      </div>
                      {r.note && (
                        <div className="text-xs text-gray-400 italic mt-0.5">
                          &ldquo;{r.note}&rdquo;
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      <i className="fa-solid fa-users mr-1.5 text-gray-300" />
                      {r.partySize}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[r.status]}`}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {(NEXT_ACTIONS[r.status] || []).map((action) => (
                          <button
                            key={action.value}
                            onClick={() =>
                              updateStatus(r.id, action.value, action.label)
                            }
                            disabled={updatingId === r.id}
                            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors disabled:opacity-50 ${action.style}`}
                          >
                            {updatingId === r.id ? (
                              <i className="fa-solid fa-spinner fa-spin" />
                            ) : (
                              <>
                                <i className={`fa-solid ${action.icon} mr-1`} />
                                {action.label}
                              </>
                            )}
                          </button>
                        ))}
                        {NEXT_ACTIONS[r.status]?.length === 0 && (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
