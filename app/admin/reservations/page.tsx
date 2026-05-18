"use client";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { Reservation } from "@/types/reservation";

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
  if (h !== 20) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

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

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          📅 Manage reservations
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          การจองทั้งหมด {reservations.length} รายการ
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <button
          onClick={() => setFilterStatus("")}
          className={`bg-white rounded-2xl p-4 text-center transition-all ${
            !filterStatus
              ? "ring-2 ring-[#8b5e3c] shadow-md"
              : "hover:shadow-sm border border-gray-100"
          }`}
        >
          <div className="text-3xl mb-1">📋</div>
          <div className="text-xs text-gray-500 mb-1">ทั้งหมด</div>
          <div className="text-2xl font-bold text-gray-800">
            {reservations.length}
          </div>
        </button>

        <button
          onClick={() => setFilterStatus("pending")}
          className={`bg-yellow-50 rounded-2xl p-4 text-center transition-all ${
            filterStatus === "pending"
              ? "ring-2 ring-yellow-400 shadow-md"
              : "hover:shadow-sm border border-yellow-100"
          }`}
        >
          <div className="text-3xl mb-1">⏳</div>
          <div className="text-xs text-yellow-700 mb-1">รอยืนยัน</div>
          <div className="text-2xl font-bold text-yellow-700">
            {counts.pending || 0}
          </div>
        </button>

        <button
          onClick={() => setFilterStatus("confirmed")}
          className={`bg-green-50 rounded-2xl p-4 text-center transition-all ${
            filterStatus === "confirmed"
              ? "ring-2 ring-green-400 shadow-md"
              : "hover:shadow-sm border border-green-100"
          }`}
        >
          <div className="text-3xl mb-1">✅</div>
          <div className="text-xs text-green-700 mb-1">ยืนยันแล้ว</div>
          <div className="text-2xl font-bold text-green-700">
            {counts.confirmed || 0}
          </div>
        </button>

        <button
          onClick={() => setFilterStatus("completed")}
          className={`bg-blue-50 rounded-2xl p-4 text-center transition-all ${
            filterStatus === "completed"
              ? "ring-2 ring-blue-400 shadow-md"
              : "hover:shadow-sm border border-blue-100"
          }`}
        >
          <div className="text-3xl mb-1">🎉</div>
          <div className="text-xs text-blue-700 mb-1">เสร็จสิ้น</div>
          <div className="text-2xl font-bold text-blue-700">
            {counts.completed || 0}
          </div>
        </button>

        <button
          onClick={() => setFilterStatus("cancelled")}
          className={`bg-red-50 rounded-2xl p-4 text-center transition-all ${
            filterStatus === "cancelled"
              ? "ring-2 ring-red-400 shadow-md"
              : "hover:shadow-sm border border-red-100"
          }`}
        >
          <div className="text-3xl mb-1">❌</div>
          <div className="text-xs text-red-700 mb-1">ยกเลิก</div>
          <div className="text-2xl font-bold text-red-700">
            {counts.cancelled || 0}
          </div>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex items-center gap-3">
        <i className="fa-solid fa-magnifying-glass text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหา รหัส, ชื่อ, เบอร์โทร, อีเมล..."
          className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
        />
        <button
          onClick={fetchReservations}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#8b5e3c] text-white text-sm font-medium rounded-xl hover:bg-[#7a5234] transition-colors disabled:opacity-50"
        >
          <i
            className={`fa-solid fa-rotate-right ${loading ? "fa-spin" : ""}`}
          />
          รีเฟรช
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <i className="fa-solid fa-spinner fa-spin text-2xl mb-3 block" />
            กำลังโหลด...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <div className="text-5xl mb-3 opacity-40">📭</div>
            ไม่พบรายการ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f59e0b] text-white">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold">#รหัส</th>
                  <th className="text-left px-5 py-3.5 font-semibold">
                    ลูกค้า
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold">โต๊ะ</th>
                  <th className="text-left px-5 py-3.5 font-semibold">
                    วัน-เวลา
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold">คน</th>
                  <th className="text-left px-5 py-3.5 font-semibold">สถานะ</th>
                  <th className="text-left px-5 py-3.5 font-semibold">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-amber-50/50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-[#8b5e3c]">
                        #{r.reservationCode}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-800">
                        {r.customerName}
                      </div>
                      <div className="text-xs text-gray-500">
                        <i className="fa-solid fa-phone mr-1" />
                        {r.customerPhone}
                      </div>
                      <div className="text-xs text-gray-400">{r.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center justify-center min-w-[2.5rem] h-10 bg-amber-100 text-amber-700 font-bold rounded-lg">
                        {r.tableNo}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-700">
                        {r.reservationDate}
                      </div>
                      <div className="text-xs text-gray-400">
                        <i className="fa-solid fa-clock mr-1" />
                        {r.reservationTime} น.
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <i className="fa-solid fa-users text-gray-400" />
                        {r.partySize}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[r.status]}`}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {(NEXT_ACTIONS[r.status] || []).map(
                          (action: ActionConfig) => (
                            <button
                              key={action.value}
                              onClick={() =>
                                updateStatus(r.id, action.value, action.label)
                              }
                              disabled={updatingId === r.id}
                              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors disabled:opacity-50 ${action.style}`}
                              title={action.label}
                            >
                              <i className={`fa-solid ${action.icon}`} />
                            </button>
                          ),
                        )}
                        <button
                          onClick={() => openEditModal(r)}
                          className="px-2.5 py-1 text-xs rounded-lg font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                          title="แก้ไข"
                        >
                          <i className="fa-solid fa-pen-to-square" />
                        </button>
                        {(r.status === "pending" ||
                          r.status === "confirmed") && (
                          <button
                            onClick={() =>
                              updateStatus(r.id, "cancelled", "ยกเลิก")
                            }
                            disabled={updatingId === r.id}
                            className="px-2.5 py-1 text-xs rounded-lg font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50"
                            title="ยกเลิก"
                          >
                            <i className="fa-solid fa-ban" />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            deleteReservation(r.id, r.reservationCode)
                          }
                          className="px-2.5 py-1 text-xs rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                          title="ลบ"
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingReservation && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !saving && setEditingReservation(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#8b5e3c] text-white px-6 py-4 flex items-center justify-between sticky top-0">
              <h2 className="text-lg font-bold">
                <i className="fa-solid fa-pen-to-square mr-2" />
                แก้ไขการจอง
              </h2>
              <button
                onClick={() => !saving && setEditingReservation(null)}
                disabled={saving}
                className="w-8 h-8 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
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
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#8b5e3c]"
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
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#8b5e3c]"
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
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#8b5e3c]"
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
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#8b5e3c]"
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
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#8b5e3c]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={editForm.customerPhone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, customerPhone: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#8b5e3c]"
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
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#8b5e3c] resize-none"
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
                className="px-5 py-2 bg-[#8b5e3c] text-white text-sm font-medium rounded-xl hover:bg-[#7a5234] transition-colors disabled:opacity-50"
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
