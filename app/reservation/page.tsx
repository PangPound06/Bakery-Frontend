"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { Config } from "@/app/Config";
import {
  Reservation,
  TimeSlot,
  CreateReservationRequest,
} from "@/types/reservation";

// ── โต๊ะในร้าน (ปรับตามจริง) ───────────────────────────────────────────────
const TABLES = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2"];

const STATUS_LABEL: Record<string, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิกแล้ว",
  completed: "เสร็จสิ้น",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  confirmed: "bg-green-100  text-green-700  border border-green-200",
  cancelled: "bg-red-100    text-red-500    border border-red-200",
  completed: "bg-gray-100   text-gray-500   border border-gray-200",
};

export default function ReservationPage() {
  const router = useRouter();

  // ── Form state ──────────────────────────────────────────────────────────
  const [tableNo, setTableNo] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── My reservations ─────────────────────────────────────────────────────
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  // ── Auth check ──────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchMyReservations();
  }, [router]);

  // ── Fetch time slots ────────────────────────────────────────────────────
  useEffect(() => {
    if (!tableNo || !date) {
      setSlots([]);
      setSelectedTime("");
      return;
    }
    setLoadingSlots(true);
    setSelectedTime("");
    fetch(
      `${Config.apiUrl}/api/reservations/availability?tableNo=${tableNo}&date=${date}`,
      {
        headers: { "x-api-key": Config.apiKey },
      },
    )
      .then((r) => r.json())
      .then((d) => setSlots(d.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [tableNo, date]);

  async function fetchMyReservations() {
    setLoadingMy(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${Config.apiUrl}/api/reservations/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": Config.apiKey,
        },
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      setMyReservations(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoadingMy(false);
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTime) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกเวลา",
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const body: CreateReservationRequest = {
        tableNo,
        reservationDate: date,
        reservationTime: selectedTime,
        partySize,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        note,
      };

      const res = await fetch(`${Config.apiUrl}/api/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": Config.apiKey,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        await Swal.fire({
          icon: "success",
          title: "จองโต๊ะสำเร็จ!",
          html: `รหัสการจอง: <b class="font-mono">${data.reservationCode}</b>`,
          confirmButtonText: "ตกลง",
          confirmButtonColor: "#8b5e3c",
        });
        setTableNo("");
        setDate("");
        setSelectedTime("");
        setCustomerName("");
        setCustomerPhone("");
        setNote("");
        setPartySize(2);
        fetchMyReservations();
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: data.message || "ไม่สามารถจองได้",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเชื่อมต่อ server ได้",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Cancel ──────────────────────────────────────────────────────────────
  async function handleCancel(id: number, code: string) {
    const result = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการยกเลิก?",
      text: `รหัส ${code}`,
      showCancelButton: true,
      confirmButtonText: "ยกเลิกการจอง",
      cancelButtonText: "ย้อนกลับ",
      confirmButtonColor: "#ef4444",
    });
    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${Config.apiUrl}/api/reservations/${id}/cancel`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-api-key": Config.apiKey,
          },
        },
      );
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "ยกเลิกสำเร็จ",
          timer: 1200,
          showConfirmButton: false,
        });
        fetchMyReservations();
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

  return (
    <div className="min-h-screen bg-[#faf8f5] pb-16">
      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-5">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">
            <i className="fa-solid fa-calendar-check mr-2 text-[#8b5e3c]" />
            จองโต๊ะอาหาร
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            เลือกโต๊ะ วัน และเวลาที่ต้องการ
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─────────────────── ฟอร์มจองโต๊ะ ─────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">
            <i className="fa-solid fa-pen-to-square mr-2 text-[#8b5e3c]" />
            ข้อมูลการจอง
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* โต๊ะ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เลือกโต๊ะ <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TABLES.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTableNo(t)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      tableNo === t
                        ? "bg-[#8b5e3c] text-white border-[#8b5e3c] shadow"
                        : "bg-white text-gray-600 border-gray-200 hover:border-[#8b5e3c] hover:text-[#8b5e3c]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* วันที่ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                วันที่ <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#8b5e3c] focus:ring-1 focus:ring-[#8b5e3c]/20"
              />
            </div>

            {/* เวลา */}
            {tableNo && date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เวลา <span className="text-red-500">*</span>
                  {loadingSlots && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">
                      <i className="fa-solid fa-spinner fa-spin" /> กำลังโหลด...
                    </span>
                  )}
                </label>
                {!loadingSlots && slots.length === 0 && (
                  <p className="text-sm text-red-400">ไม่มีช่วงเวลาในวันนี้</p>
                )}
                {!loadingSlots && slots.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {slots.map((slot) => (
                      <button
                        type="button"
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() =>
                          slot.available && setSelectedTime(slot.time)
                        }
                        className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          !slot.available
                            ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through"
                            : selectedTime === slot.time
                              ? "bg-[#8b5e3c] text-white border-[#8b5e3c]"
                              : "bg-white text-gray-600 border-gray-200 hover:border-[#8b5e3c]"
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* จำนวนคน */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                จำนวนคน <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPartySize((v) => Math.max(1, v - 1))}
                  className="w-9 h-9 rounded-full border border-gray-200 text-gray-600 font-bold text-lg hover:bg-gray-50 transition-colors"
                >
                  −
                </button>
                <span className="w-8 text-center text-lg font-bold text-gray-800">
                  {partySize}
                </span>
                <button
                  type="button"
                  onClick={() => setPartySize((v) => Math.min(20, v + 1))}
                  className="w-9 h-9 rounded-full border border-gray-200 text-gray-600 font-bold text-lg hover:bg-gray-50 transition-colors"
                >
                  +
                </button>
                <span className="text-sm text-gray-400">คน (สูงสุด 20)</span>
              </div>
            </div>

            {/* ชื่อ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อผู้จอง <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                placeholder="ชื่อ-นามสกุล"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#8b5e3c] focus:ring-1 focus:ring-[#8b5e3c]/20 placeholder-gray-300"
              />
            </div>

            {/* เบอร์โทร */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เบอร์โทรศัพท์ <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                placeholder="0812345678"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#8b5e3c] focus:ring-1 focus:ring-[#8b5e3c]/20 placeholder-gray-300"
              />
            </div>

            {/* หมายเหตุ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                หมายเหตุ (ถ้ามี)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="เช่น ขอโต๊ะริมหน้าต่าง, วันเกิด..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#8b5e3c] focus:ring-1 focus:ring-[#8b5e3c]/20 placeholder-gray-300 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={
                submitting ||
                !tableNo ||
                !date ||
                !selectedTime ||
                !customerName ||
                !customerPhone
              }
              className="w-full py-3 bg-[#8b5e3c] text-white font-semibold rounded-xl hover:bg-[#7a5234] active:bg-[#6a4429] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm shadow-sm"
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2" />
                  กำลังจอง...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-calendar-check mr-2" />
                  ยืนยันการจอง
                </>
              )}
            </button>
          </form>
        </div>

        {/* ─────────────────── การจองของฉัน ─────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800">
              <i className="fa-solid fa-clock-rotate-left mr-2 text-[#8b5e3c]" />
              การจองของฉัน
            </h2>
            <button
              onClick={fetchMyReservations}
              className="text-xs text-gray-400 hover:text-[#8b5e3c] transition-colors"
            >
              <i className="fa-solid fa-rotate-right mr-1" />
              รีเฟรช
            </button>
          </div>

          {loadingMy ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <i className="fa-solid fa-spinner fa-spin text-xl mb-2 block" />
              กำลังโหลด...
            </div>
          ) : myReservations.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <i className="fa-solid fa-calendar-xmark text-3xl mb-3 block opacity-30" />
              ยังไม่มีการจอง
            </div>
          ) : (
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-0.5">
              {myReservations.map((r) => (
                <div
                  key={r.id}
                  className="border border-gray-100 rounded-xl p-4 bg-gray-50 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-800 text-sm">
                          <i className="fa-solid fa-chair mr-1 text-[#8b5e3c]" />
                          โต๊ะ {r.tableNo}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <div>
                          <i className="fa-solid fa-calendar mr-1.5" />
                          {r.reservationDate}{" "}
                          <i className="fa-solid fa-clock ml-2 mr-1" />
                          {r.reservationTime} น.
                        </div>
                        <div>
                          <i className="fa-solid fa-users mr-1.5" />
                          {r.partySize} คน &nbsp;·&nbsp;
                          <i className="fa-solid fa-user mr-1" />
                          {r.customerName}
                        </div>
                        <div>
                          <i className="fa-solid fa-phone mr-1.5" />
                          {r.customerPhone}
                        </div>
                        {r.note && (
                          <div className="italic text-gray-400">
                            <i className="fa-solid fa-note-sticky mr-1" />
                            &ldquo;{r.note}&rdquo;
                          </div>
                        )}
                        <div className="font-mono text-gray-400 pt-0.5">
                          {r.reservationCode}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${STATUS_STYLE[r.status]}`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>

                  {(r.status === "pending" || r.status === "confirmed") && (
                    <button
                      onClick={() => handleCancel(r.id, r.reservationCode)}
                      className="mt-3 w-full py-1.5 text-xs border border-red-200 text-red-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <i className="fa-solid fa-xmark mr-1" />
                      ยกเลิกการจอง
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}