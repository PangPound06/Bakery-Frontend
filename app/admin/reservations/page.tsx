"use client";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { Reservation } from "@/types/reservation";
import { useReservationPolling } from "@/lib/useReservationPolling";

const STATUS_LABEL: Record<string, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิกแล้ว",
  completed: "เสร็จสิ้น",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  confirmed: "bg-green-100 text-green-700 border border-green-200",
  cancelled: "bg-red-100 text-red-500 border border-red-200",
  completed: "bg-blue-100 text-blue-700 border border-blue-200",
};

type ActionConfig = {
  label: string;
  icon: string;
  value: string;
  style: string;
};

const NEXT_ACTIONS: Record<string, ActionConfig[]> = {
  pending: [
    {
      label: "ยืนยัน",
      icon: "fa-circle-check",
      value: "confirmed",
      style: "bg-green-500 hover:bg-green-600 text-white",
    },
  ],
  confirmed: [
    {
      label: "เสร็จสิ้น",
      icon: "fa-flag-checkered",
      value: "completed",
      style: "bg-blue-500 hover:bg-blue-600 text-white",
    },
  ],
  cancelled: [],
  completed: [],
};

const TABLE_OPTIONS = Array.from({ length: 30 }, (_, i) => String(i + 1));

const TIME_SLOTS: string[] = [];
for (let h = 10; h <= 20; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
}

// การ์ดสรุปสถานะ — โทนสีเข้าชุดกับหน้า admin/order
const SUMMARY_CARDS: {
  key: string;
  label: string;
  icon: string;
  color: string;
}[] = [
  { key: "", label: "ทั้งหมด", icon: "📋", color: "bg-gray-100" },
  { key: "pending", label: "รอยืนยัน", icon: "⏳", color: "bg-yellow-100" },
  { key: "confirmed", label: "ยืนยันแล้ว", icon: "✅", color: "bg-green-100" },
  { key: "completed", label: "เสร็จสิ้น", icon: "🎉", color: "bg-blue-100" },
  { key: "cancelled", label: "ยกเลิก", icon: "❌", color: "bg-red-100" },
];

type EditForm = {
  tableNo: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  customerName: string;
  customerPhone: string;
  note: string;
};

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [editingReservation, setEditingReservation] =
    useState<Reservation | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    tableNo: "",
    reservationDate: "",
    reservationTime: "",
    partySize: 2,
    customerName: "",
    customerPhone: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);

  const counts = reservations.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }),
    {} as Record<string, number>,
  );

  const countFor = (key: string) =>
    key === "" ? reservations.length : counts[key] || 0;

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reservations/admin/all`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
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
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // ── Real-time updates ผ่าน REST polling (ทุก 2 วินาที) ──
  useReservationPolling((latest) => {
    setReservations((prev) => {
      // เช็คว่าข้อมูลเปลี่ยนจริงหรือไม่ — กัน re-render โดยไม่จำเป็น
      if (
        prev.length === latest.length &&
        prev.every(
          (p, i) =>
            p.id === latest[i].id &&
            p.status === latest[i].status &&
            p.updatedAt === latest[i].updatedAt,
        )
      ) {
        return prev;
      }

      // ตรวจหา reservation ใหม่ที่เพิ่งเข้ามา → แสดง toast
      const prevIds = new Set(prev.map((r) => r.id));
      const newOnes = latest.filter((r) => !prevIds.has(r.id));

      if (newOnes.length > 0 && prev.length > 0) {
        // เฉพาะตอนที่ "เพิ่ม" จริงๆ ไม่ใช่โหลดครั้งแรก
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "info",
          title: `จองใหม่: ${newOnes[0].customerName}${newOnes.length > 1 ? ` +${newOnes.length - 1}` : ""}`,
          timer: 1500,
          showConfirmButton: false,
        });
      }

      return latest;
    });
  }, 2000);

  async function updateStatus(id: number, status: string, label: string) {
    const result = await Swal.fire({
      icon: "question",
      title: `เปลี่ยนสถานะเป็น "${label}"?`,
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#f59e0b",
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

  async function deleteReservation(id: number, code: string) {
    const result = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการลบ?",
      html: `<div>รหัส <b class="font-mono">${code}</b></div><div class="text-sm text-gray-500 mt-2">จะถูกลบถาวร ไม่สามารถกู้คืนได้</div>`,
      showCancelButton: true,
      confirmButtonText: "ลบถาวร",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ef4444",
    });
    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reservations/admin/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "ลบสำเร็จ",
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
    }
  }

  function openEditModal(r: Reservation) {
    setEditForm({
      tableNo: r.tableNo,
      reservationDate: r.reservationDate,
      reservationTime: r.reservationTime,
      partySize: r.partySize,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      note: r.note || "",
    });
    setEditingReservation(r);
  }

  async function saveEdit() {
    if (!editingReservation) return;

    if (
      !editForm.tableNo ||
      !editForm.reservationDate ||
      !editForm.reservationTime
    ) {
      Swal.fire({ icon: "warning", title: "กรุณากรอกข้อมูลให้ครบ" });
      return;
    }
    if (!editForm.customerName.trim() || !editForm.customerPhone.trim()) {
      Swal.fire({ icon: "warning", title: "กรุณากรอกชื่อและเบอร์โทร" });
      return;
    }
    if (editForm.partySize < 1 || editForm.partySize > 20) {
      Swal.fire({ icon: "warning", title: "จำนวนคนต้องอยู่ระหว่าง 1-20" });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reservations/admin/${editingReservation.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editForm),
        },
      );
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "แก้ไขสำเร็จ",
          timer: 1000,
          showConfirmButton: false,
        });
        setEditingReservation(null);
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
      setSaving(false);
    }
  }

  const filtered = reservations.filter((r) => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.reservationCode?.toLowerCase().includes(q) ||
        r.customerName?.toLowerCase().includes(q) ||
        r.customerPhone?.includes(q) ||
        r.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── ปุ่ม action ต่อ 1 reservation (ใช้ร่วมกันทั้งตาราง + การ์ดมือถือ) ──
  const renderActions = (r: Reservation) => (
    <div className="flex flex-wrap gap-1.5">
      {(NEXT_ACTIONS[r.status] || []).map((action: ActionConfig) => (
        <button
          key={action.value}
          onClick={() => updateStatus(r.id, action.value, action.label)}
          disabled={updatingId === r.id}
          className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all disabled:opacity-50 ${action.style}`}
        >
          <i className={`fa-solid ${action.icon} mr-1`} />
          {action.label}
        </button>
      ))}
      <button
        onClick={() => openEditModal(r)}
        className="px-3 py-1.5 text-xs rounded-lg font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all"
      >
        <i className="fa-solid fa-pen-to-square mr-1" />
        แก้ไข
      </button>
      {(r.status === "pending" || r.status === "confirmed") && (
        <button
          onClick={() => updateStatus(r.id, "cancelled", "ยกเลิก")}
          disabled={updatingId === r.id}
          className="px-3 py-1.5 text-xs rounded-lg font-medium bg-orange-500 hover:bg-orange-600 text-white transition-all disabled:opacity-50"
        >
          <i className="fa-solid fa-ban mr-1" />
          ยกเลิก
        </button>
      )}
      <button
        onClick={() => deleteReservation(r.id, r.reservationCode)}
        className="px-3 py-1.5 text-xs rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white transition-all"
      >
        <i className="fa-solid fa-trash mr-1" />
        ลบ
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-amber-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-800 flex items-center gap-3">
              <span className="text-4xl">📅</span>Manage Reservations
            </h1>
            <p className="text-amber-600 mt-1">
              การจองทั้งหมด {reservations.length} รายการ
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3 mb-6">
          {SUMMARY_CARDS.map((item) => (
            <button
              key={item.key || "all"}
              onClick={() => setFilterStatus(item.key)}
              className={`p-2 md:p-3 rounded-xl text-center transition-all ${
                filterStatus === item.key
                  ? "ring-2 ring-amber-500 shadow-md"
                  : "hover:shadow-md"
              } ${item.color}`}
            >
              <div className="text-xl md:text-2xl">{item.icon}</div>
              <div className="text-[10px] md:text-xs font-medium mt-1 leading-tight">
                {item.label}
              </div>
              <div className="text-base md:text-lg font-bold">
                {countFor(item.key)}
              </div>
            </button>
          ))}
        </div>

        {/* Search + Refresh */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-md flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา รหัส, ชื่อ, เบอร์โทร, อีเมล..."
              className="w-full px-4 py-3 pl-12 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            onClick={fetchReservations}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 shrink-0"
          >
            <i
              className={`fa-solid fa-rotate-right ${loading ? "fa-spin" : ""}`}
            />
            รีเฟรช
          </button>
        </div>

        {/* ===== Table (iPad / Desktop) ===== */}
        <div className="hidden md:block bg-white rounded-2xl overflow-hidden shadow-md">
          {loading ? (
            <div className="py-20 text-center text-gray-400">
              <i className="fa-solid fa-spinner fa-spin text-2xl mb-3 block" />
              กำลังโหลด...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500">ไม่พบรายการ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-amber-500">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                      #รหัส
                    </th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                      ลูกค้า
                    </th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                      โต๊ะ
                    </th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                      วัน-เวลา
                    </th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                      คน
                    </th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                      สถานะ
                    </th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-white">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, index) => (
                    <tr
                      key={r.id}
                      className={`border-b border-amber-100 hover:bg-amber-50 ${
                        index % 2 === 0 ? "bg-white" : "bg-amber-50/50"
                      }`}
                    >
                      <td className="px-4 py-4">
                        <span className="font-mono font-bold text-amber-800">
                          #{r.reservationCode}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-amber-700 text-sm">
                          {r.customerName}
                        </p>
                        <p className="text-xs text-gray-500">
                          <i className="fa-solid fa-phone mr-1" />
                          {r.customerPhone}
                        </p>
                        <p className="text-xs text-gray-400">{r.email}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center justify-center min-w-[2.5rem] h-10 bg-amber-100 text-amber-700 font-bold rounded-lg">
                          {r.tableNo}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-700 text-sm">
                          {r.reservationDate}
                        </div>
                        <div className="text-xs text-gray-400">
                          <i className="fa-solid fa-clock mr-1" />
                          {r.reservationTime} น.
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <i className="fa-solid fa-users text-gray-400" />
                          {r.partySize}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[r.status]}`}
                        >
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4">{renderActions(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ===== Cards (Mobile) ===== */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-md py-16 text-center text-gray-400">
              <i className="fa-solid fa-spinner fa-spin text-2xl mb-3 block" />
              กำลังโหลด...
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500">ไม่พบรายการ</p>
            </div>
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl shadow-md p-4 border border-amber-100"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="font-mono font-bold text-amber-800">
                    #{r.reservationCode}
                  </span>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[r.status]}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>

                <div className="mb-3">
                  <p className="font-semibold text-amber-700">
                    {r.customerName}
                  </p>
                  <p className="text-xs text-gray-500">
                    <i className="fa-solid fa-phone mr-1" />
                    {r.customerPhone}
                  </p>
                  <p className="text-xs text-gray-400">{r.email}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-amber-50 rounded-xl py-2">
                    <div className="text-[10px] text-gray-400">โต๊ะ</div>
                    <div className="font-bold text-amber-700">{r.tableNo}</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl py-2">
                    <div className="text-[10px] text-gray-400">จำนวนคน</div>
                    <div className="font-bold text-amber-700">
                      <i className="fa-solid fa-users mr-1 text-gray-400" />
                      {r.partySize}
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-xl py-2">
                    <div className="text-[10px] text-gray-400">เวลา</div>
                    <div className="font-bold text-amber-700">
                      {r.reservationTime}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  <i className="fa-solid fa-calendar-day mr-1 text-gray-400" />
                  {r.reservationDate}
                </div>

                {renderActions(r)}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===== Edit Modal ===== */}
      {editingReservation && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !saving && setEditingReservation(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-amber-500 text-white px-6 py-4 flex items-center justify-between sticky top-0 rounded-t-2xl">
              <h2 className="text-lg font-bold">
                <i className="fa-solid fa-pen-to-square mr-2" />
                แก้ไขการจอง
              </h2>
              <button
                onClick={() => !saving && setEditingReservation(null)}
                disabled={saving}
                className="w-8 h-8 rounded-full hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-gray-500 mb-2">
                รหัส:{" "}
                <span className="font-mono font-semibold text-gray-700">
                  {editingReservation.reservationCode}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    โต๊ะ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.tableNo}
                    onChange={(e) =>
                      setEditForm({ ...editForm, tableNo: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {TABLE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        โต๊ะ {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    จำนวนคน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editForm.partySize}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        partySize: Math.max(
                          1,
                          Math.min(20, +e.target.value || 1),
                        ),
                      })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    วันที่ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editForm.reservationDate}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        reservationDate: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    เวลา <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.reservationTime}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        reservationTime: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t} น.
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  ชื่อผู้จอง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.customerName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, customerName: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={editForm.customerPhone}
                  onChange={(e) => {
                    // กรองเฉพาะตัวเลข — ลบทุกอย่างที่ไม่ใช่ 0-9
                    const onlyNums = e.target.value.replace(/\D/g, "");
                    setEditForm({ ...editForm, customerPhone: onlyNums });
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  หมายเหตุ
                </label>
                <textarea
                  value={editForm.note}
                  onChange={(e) =>
                    setEditForm({ ...editForm, note: e.target.value })
                  }
                  rows={2}
                  placeholder="เช่น ขอโต๊ะริมหน้าต่าง..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex gap-3 justify-end sticky bottom-0 bg-white">
              <button
                onClick={() => setEditingReservation(null)}
                disabled={saving}
                className="px-5 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-5 py-2 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-2" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check mr-2" />
                    บันทึก
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}