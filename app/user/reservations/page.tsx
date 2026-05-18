"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import { Reservation } from "@/types/reservation";

const STATUS_LABEL: Record<string, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  cancelled: "ยกเลิกแล้ว",
  completed: "เสร็จสิ้น",
};

type StatusStyle = {
  badge: string;
  bgGradient: string;
  icon: string;
};

const STATUS_CONFIG: Record<string, StatusStyle> = {
  pending: {
    badge: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    bgGradient: "from-yellow-50 to-amber-50",
    icon: "⏳",
  },
  confirmed: {
    badge: "bg-green-100 text-green-700 border border-green-200",
    bgGradient: "from-green-50 to-emerald-50",
    icon: "✅",
  },
  cancelled: {
    badge: "bg-red-100 text-red-700 border border-red-200",
    bgGradient: "from-red-50 to-rose-50",
    icon: "❌",
  },
  completed: {
    badge: "bg-blue-100 text-blue-700 border border-blue-200",
    bgGradient: "from-blue-50 to-sky-50",
    icon: "🎉",
  },
};

type TabFilter = "all" | "upcoming" | "past";

export default function MyReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>("upcoming");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const getToken = () => localStorage.getItem("token") || "";

  const fetchMyReservations = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reservations/my`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
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
  }, [router]);

  useEffect(() => {
    fetchMyReservations();
  }, [fetchMyReservations]);

  async function handleCancel(id: number, code: string) {
    const result = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการยกเลิก?",
      html: `รหัส <b class="font-mono">${code}</b><div class="text-sm text-gray-500 mt-2">การจองนี้จะถูกยกเลิก</div>`,
      showCancelButton: true,
      confirmButtonText: "ยืนยันยกเลิก",
      cancelButtonText: "ไม่ยกเลิก",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reservations/${id}/cancel`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "ยกเลิกสำเร็จ",
          timer: 1200,
          showConfirmButton: false,
          confirmButtonColor: "#f97316",
        });
        fetchMyReservations();
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: data.message,
          confirmButtonColor: "#f97316",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "ไม่สามารถเชื่อมต่อได้",
        confirmButtonColor: "#f97316",
      });
    }
  }

  const today = new Date().toISOString().split("T")[0];

  const filtered = reservations.filter((r) => {
    if (tab === "upcoming") {
      if (r.reservationDate < today) return false;
      if (r.status === "cancelled" || r.status === "completed") return false;
    } else if (tab === "past") {
      if (
        r.reservationDate >= today &&
        r.status !== "cancelled" &&
        r.status !== "completed"
      ) {
        return false;
      }
    }
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  const counts = {
    upcoming: reservations.filter(
      (r) =>
        r.reservationDate >= today &&
        r.status !== "cancelled" &&
        r.status !== "completed",
    ).length,
    pending: reservations.filter((r) => r.status === "pending").length,
    confirmed: reservations.filter((r) => r.status === "confirmed").length,
    completed: reservations.filter((r) => r.status === "completed").length,
    cancelled: reservations.filter((r) => r.status === "cancelled").length,
  };

  function daysUntil(dateStr: string): number {
    const target = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil(
      (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  function getDaysLabel(dateStr: string): string {
    const d = daysUntil(dateStr);
    if (d === 0) return "วันนี้";
    if (d === 1) return "พรุ่งนี้";
    if (d > 0) return `อีก ${d} วัน`;
    return `${-d} วันที่แล้ว`;
  }

  function formatDateThai(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("th-TH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-amber-600 font-medium">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* ── Header ── */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-amber-600 hover:text-amber-700 flex items-center gap-2 mb-4 w-fit"
          >
            ← กลับหน้าหลัก
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-amber-800">
                📅 การจองของฉัน
              </h1>
              <p className="text-amber-600 mt-1">
                การจองทั้งหมด {filtered.length} รายการ
              </p>
            </div>
            <Link
              href="/reservation"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
            >
              <span>➕</span> จองโต๊ะใหม่
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* ── Sidebar ── */}
          <div className="hidden md:block md:col-span-1">
            {/* ปรับ Padding บนล่าง (py-8) และความโค้งมนให้ตรงกับดีไซน์รูปภาพ */}
            <div className="bg-white rounded-[24px] shadow-sm py-8 px-4 border border-gray-50">
              {/* ใช้ space-y-3 หรือ 4 เพื่อระยะห่างที่โปร่งขึ้น */}
              <nav className="space-y-3">
                <Link
                  href="/user/profile"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-gray-50 text-gray-600 font-medium transition-colors"
                >
                  <span className="text-xl">👤</span> <span>ข้อมูลส่วนตัว</span>
                </Link>
                <Link
                  href="/user/orders"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-gray-50 text-gray-600 font-medium transition-colors"
                >
                  <span className="text-xl">📋</span> <span>รายการสั่งซื้อ</span>
                </Link>
                <Link
                  href="/user/search-order"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-gray-50 text-gray-600 font-medium transition-colors"
                >
                  <span className="text-xl">🔍</span> <span>ค้นหาคำสั่งซื้อ</span>
                </Link>
                <Link
                  href="/user/reservations"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-[#fef0c7] text-amber-800 font-bold shadow-sm"
                >
                  <span className="text-xl">📅</span> <span>การจองคิว</span>
                </Link>
                <Link
                  href="/user/favorites"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-gray-50 text-gray-600 font-medium transition-colors"
                >
                  <span className="text-xl">❤️</span> <span>รายการโปรด</span>
                </Link>
                <Link
                  href="/user/settings"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-gray-50 text-gray-600 font-medium transition-colors"
                >
                  <span className="text-xl">⚙️</span> <span>ตั้งค่า</span>
                </Link>
              </nav>
            </div>
          </div>

          {/* ── Main Content ── */}
          <div className="md:col-span-3 space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl p-4 shadow-lg">
                <div className="text-2xl mb-1">📅</div>
                <div className="text-2xl font-bold">{counts.upcoming}</div>
                <div className="text-xs opacity-90 mt-1">กำลังจะมาถึง</div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-yellow-100">
                <div className="text-2xl mb-1">⏳</div>
                <div className="text-2xl font-bold text-yellow-700">
                  {counts.pending}
                </div>
                <div className="text-xs text-gray-500 mt-1">รอยืนยัน</div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100">
                <div className="text-2xl mb-1">✅</div>
                <div className="text-2xl font-bold text-green-700">
                  {counts.confirmed}
                </div>
                <div className="text-xs text-gray-500 mt-1">ยืนยันแล้ว</div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
                <div className="text-2xl mb-1">🎉</div>
                <div className="text-2xl font-bold text-blue-700">
                  {counts.completed}
                </div>
                <div className="text-xs text-gray-500 mt-1">เสร็จสิ้น</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col sm:flex-row gap-1">
              <button
                onClick={() => {
                  setTab("upcoming");
                  setStatusFilter("");
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  tab === "upcoming"
                    ? "bg-amber-500 text-white shadow"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                🕐 กำลังจะมาถึง
              </button>
              <button
                onClick={() => {
                  setTab("all");
                  setStatusFilter("");
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  tab === "all"
                    ? "bg-amber-500 text-white shadow"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                📋 ทั้งหมด
              </button>
              <button
                onClick={() => {
                  setTab("past");
                  setStatusFilter("");
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  tab === "past"
                    ? "bg-amber-500 text-white shadow"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                🗂️ ผ่านมาแล้ว
              </button>
            </div>

            {/* Status filter (only in "all" tab) */}
            {tab === "all" && (
              <div className="bg-white rounded-2xl shadow-lg p-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: "", label: "ทั้งหมด" },
                    { val: "pending", label: "⏳ รอยืนยัน" },
                    { val: "confirmed", label: "✅ ยืนยันแล้ว" },
                    { val: "completed", label: "🎉 เสร็จสิ้น" },
                    { val: "cancelled", label: "❌ ยกเลิก" },
                  ].map((s) => (
                    <button
                      key={s.val}
                      onClick={() => setStatusFilter(s.val)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        statusFilter === s.val
                          ? "bg-amber-500 text-white"
                          : "bg-gray-100 text-amber-800 hover:bg-gray-200"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* List */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-500 text-lg font-medium mb-1">
                  {tab === "upcoming"
                    ? "ไม่มีการจองที่จะมาถึง"
                    : tab === "past"
                      ? "ไม่มีประวัติการจอง"
                      : "ยังไม่มีการจอง"}
                </p>
                <p className="text-sm text-gray-400 mb-5">
                  เริ่มจองโต๊ะแรกของคุณตอนนี้
                </p>
                <Link
                  href="/reservation"
                  className="inline-block px-6 py-3 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors"
                >
                  ➕ จองโต๊ะใหม่
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((r) => {
                  const config = STATUS_CONFIG[r.status];
                  const days = daysUntil(r.reservationDate);
                  const isUpcoming =
                    days >= 0 &&
                    r.status !== "cancelled" &&
                    r.status !== "completed";

                  return (
                    <div
                      key={r.id}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                    >
                      {/* Card Header */}
                      <div
                        className={`bg-gradient-to-r ${config.bgGradient} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{config.icon}</span>
                          <div>
                            <p className="font-semibold text-gray-800">
                              การจอง #{r.reservationCode}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-xs font-medium px-2.5 py-1 rounded-full ${config.badge}`}
                              >
                                {STATUS_LABEL[r.status]}
                              </span>
                              {isUpcoming && (
                                <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                                  {getDaysLabel(r.reservationDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm text-gray-500">
                            📆 {formatDateThai(r.reservationDate)}
                          </p>
                          <p className="text-sm font-medium text-gray-700 mt-0.5">
                            🕐 เวลา {r.reservationTime} น.
                          </p>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left: โต๊ะ */}
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 text-3xl">
                              🪑
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-0.5">
                                หมายเลขโต๊ะ
                              </p>
                              <p className="text-2xl font-bold text-gray-800">
                                {r.tableNo}
                              </p>
                            </div>
                          </div>

                          {/* Right: ข้อมูลลูกค้า */}
                          <div className="space-y-1.5 md:border-l md:border-gray-100 md:pl-4 flex flex-col justify-center">
                            <div className="text-sm text-gray-700 flex items-center gap-2">
                              <span>👥</span>
                              <span>
                                จำนวน <span className="font-semibold">{r.partySize}</span> คน
                              </span>
                            </div>
                            <div className="text-sm text-gray-700 flex items-center gap-2">
                              <span>👤</span> {r.customerName}
                            </div>
                            <div className="text-sm text-gray-700 flex items-center gap-2">
                              <span>📞</span> {r.customerPhone}
                            </div>
                            {r.note && (
                              <div className="text-sm text-gray-500 italic mt-1 bg-gray-50 p-2 rounded-lg">
                                📝 &ldquo;{r.note}&rdquo;
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Cancel Button */}
                        {(r.status === "pending" ||
                          r.status === "confirmed") && (
                          <div className="flex mt-4 pt-4 border-t border-gray-100">
                            <button
                              onClick={() =>
                                handleCancel(r.id, r.reservationCode)
                              }
                              className="w-full sm:w-auto ml-auto px-5 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                            >
                              ❌ ยกเลิกการจอง
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}