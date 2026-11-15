"use client";

import StoreOrderingToggle from "@/components/admin/StoreOrderingToggle";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authHeaders } from "@/lib/auth";

interface Order {
  id: number;
  ordCode?: string;
  email: string;
  total: number;
  orderStatus: string;
  orderType?: string;
  paymentStatus: string;
  createdAt: string;
  receiverName: string;
}

interface Product {
  id: number;
  name: string;
  stockQuantity: number;
  isAvailable: boolean;
  price: number;
  category: string;
}

interface TopProduct {
  productName: string;
  selectedOption?: string | null;
  totalQty: number;
  totalRevenue: number;
  orderCount: number;
}

interface Summary {
  totalRevenue: number;
  validOrderCount: number;
  totalOrderCount: number;
  successCount: number;
  avgOrderValue: number;
  statusCounts: Record<string, number>;
  channelCounts: Record<string, number>;
  salesDaily: { date: string; revenue: number; orders: number }[];
}

// local datetime "YYYY-MM-DDTHH:mm:ss" (รูปแบบที่ backend parseDateTime รับ)
const toParam = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.map((val, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-500"
          style={{
            height: `${(val / max) * 100}%`,
            backgroundColor: color,
            opacity: 0.5 + (i / data.length) * 0.5,
          }}
        />
      ))}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data, 0);
  const range = Math.max(...data, 1) - min || 1;
  const w = 80;
  const h = 32;
  const pts = data
    .map(
      (v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`,
    )
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="overflow-visible"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
      <circle
        cx={w}
        cy={h - ((data[data.length - 1] - min) / range) * h}
        r="3"
        fill={color}
      />
    </svg>
  );
}

const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

type TimeFilter = "7d" | "30d" | "all";

const rangeFor = (tf: TimeFilter, prev = false) => {
  if (tf === "all") return null;
  const n = new Date();
  const days = tf === "7d" ? 7 : 30;
  const endOfDay = new Date(
    n.getFullYear(),
    n.getMonth(),
    n.getDate(),
    23,
    59,
    59,
  );
  if (!prev) return { from: new Date(n.getTime() - days * 86400000), to: endOfDay };
  return {
    from: new Date(n.getTime() - 2 * days * 86400000),
    to: new Date(n.getTime() - days * 86400000),
  };
};

const summaryUrl = (r: { from: Date; to: Date } | null) => {
  const p = new URLSearchParams();
  if (r) {
    p.set("from", toParam(r.from));
    p.set("to", toParam(r.to));
  }
  return `${process.env.NEXT_PUBLIC_API_URL}/api/orders/admin/report-summary?${p}`;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [prevSummary, setPrevSummary] = useState<Summary | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [animIn, setAnimIn] = useState(false);

  // ✅ สรุปยอดจาก backend (คำนวณใน SQL) — ไม่ดึงออเดอร์ทั้งหมดมานับเอง
  const fetchSummary = useCallback(async (tf: TimeFilter) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const prevRange = rangeFor(tf, true);
      const [curRes, prevRes] = await Promise.all([
        fetch(summaryUrl(rangeFor(tf)), { headers }),
        prevRange
          ? fetch(summaryUrl(prevRange), { headers })
          : Promise.resolve(null),
      ]);
      if (curRes.ok) setSummary(await curRes.json());
      if (prevRes && prevRes.ok) setPrevSummary(await prevRes.json());
      else setPrevSummary(null);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // ข้อมูลที่ไม่ขึ้นกับช่วงเวลา — โหลดครั้งเดียวตอนเปิดหน้า
  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const base = process.env.NEXT_PUBLIC_API_URL;

      const [productsRes, usersRes, recentRes] = await Promise.all([
        fetch(`${base}/api/products`),
        fetch(`${base}/api/auth/users`, { headers }),
        // ✅ 6 ออเดอร์ล่าสุดจาก endpoint แบ่งหน้า (ไม่ดึงทั้งหมด)
        fetch(`${base}/api/orders/admin/page?page=0&size=6`, { headers }),
      ]);

      if (productsRes.ok) setProducts(await productsRes.json());
      if (usersRes.ok) {
        const u = await usersRes.json();
        setTotalUsers(Array.isArray(u) ? u.length : (u.count ?? 0));
      }
      if (recentRes.ok) {
        const d = await recentRes.json();
        setRecentOrders(Array.isArray(d) ? d : (d.content ?? []));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      if (!user.email?.endsWith("@empbakery.com")) {
        router.replace("/");
        return;
      }
    } else {
      router.replace("/login");
      return;
    }
    fetchDashboardData();
  }, [router, fetchDashboardData]);

  useEffect(() => {
    if (!loading) setTimeout(() => setAnimIn(true), 50);
  }, [loading]);

  // ✅ ข้อมูลที่ขึ้นกับช่วงเวลา (สินค้าขายดี + KPI/กราฟ/สถานะ) — โหลดหลังหน้าพร้อม และทุกครั้งที่เปลี่ยนช่วง
  useEffect(() => {
    if (loading) return;
    const days =
      timeFilter === "7d" ? "7" : timeFilter === "30d" ? "30" : "all";
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/orders/stats/top-products?days=${days}`,
      { headers: authHeaders() },
    )
      .then((r) => (r.ok ? r.json() : { topProducts: [] }))
      .then((data) => setTopProducts(data.topProducts || []))
      .catch(console.error);
    fetchSummary(timeFilter);
  }, [loading, timeFilter, fetchSummary]);

  // ช่วงเวลาของ timeFilter → from/to (prev = ช่วงก่อนหน้า)
  const now = new Date();

  // ✅ ค่าทั้งหมดมาจาก report-summary (คำนวณใน SQL) — ไม่ดึงออเดอร์ทั้งหมดมานับเองแล้ว
  const sc = summary?.statusCounts ?? {};
  const cc = summary?.channelCounts ?? {};

  const totalRevenue = summary?.totalRevenue ?? 0;
  const totalOrders = summary?.validOrderCount ?? 0; // confirmed+preparing+shipping+delivered
  const totalAllOrders = summary?.totalOrderCount ?? 0; // ทุกสถานะในช่วงเวลา
  const pendingOrders = sc.pending ?? 0;
  const lowStock = products.filter(
    (p) => p.stockQuantity <= 5 && p.stockQuantity !== 9999,
  ).length;
  const posOrders = cc.pos ?? 0;
  const dineInOrders = cc.dineIn ?? 0;
  const onlineOrders = cc.online ?? 0;

  // ✅ กราฟ 7 วันล่าสุด จาก salesDaily (อิงวัน Asia/Bangkok ให้ตรงกับ backend)
  const dayKey = (d: Date) =>
    d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const revByDay: Record<string, number> = Object.fromEntries(
    (summary?.salesDaily ?? []).map((s) => [s.date, s.revenue] as [string, number]),
  );
  const ordByDay: Record<string, number> = Object.fromEntries(
    (summary?.salesDaily ?? []).map((s) => [s.date, s.orders] as [string, number]),
  );
  const last7Keys = Array.from({ length: 7 }, (_, i) =>
    dayKey(new Date(now.getTime() - (6 - i) * 86400000)),
  );
  const dailyRevenue = last7Keys.map((k) => revByDay[k] ?? 0);
  const dailyOrderCount = last7Keys.map((k) => ordByDay[k] ?? 0);

  // ✅ เทียบช่วงก่อนหน้า จาก report-summary ของช่วงก่อน (นิยามเดียวกับช่วงปัจจุบัน)
  const prevRevenue = prevSummary?.totalRevenue ?? 0;
  const prevOrderCount = prevSummary?.validOrderCount ?? 0;
  const revChange =
    prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
      : 0;
  const ordChange =
    prevOrderCount > 0
      ? Math.round(((totalOrders - prevOrderCount) / prevOrderCount) * 100)
      : 0;

  const statusBreakdown = [
    "pending",
    "confirmed",
    "preparing",
    "shipping",
    "delivered",
    "cancelled",
  ].map((key) => ({
    key,
    color:
      {
        pending: "#a84a0e",
        confirmed: "#3b82f6",
        preparing: "#6366f1",
        shipping: "#8b5cf6",
        delivered: "#2f7d4f",
        cancelled: "#b3261e",
      }[key] || "#gray",
    label:
      {
        pending: "รอดำเนินการ",
        confirmed: "ยืนยันแล้ว",
        preparing: "กำลังเตรียม",
        shipping: "กำลังจัดส่ง",
        delivered: "สำเร็จ",
        cancelled: "ยกเลิก",
      }[key] || key,
    count: sc[key] ?? 0,
  }));

  // ✅ recentOrders มาจาก state (ดึงจาก /admin/page?size=6) — ไม่ sort จากทั้งก้อนแล้ว
  const formatDate = (dateStr: string) => {
    const dateObj = new Date(dateStr);

    // 1. ดึงเฉพาะส่วนวันที่ (ที่ทำงานได้ตรงเวลา)
    const datePart = dateObj.toLocaleString("th-TH", {
      day: "2-digit", // หรือ "numeric" ตามต้องการ
      month: "short",
      year: "numeric",
      timeZone: "Asia/Bangkok",
    });

    // 2. ดึงเฉพาะส่วนเวลา (ที่ทำงานได้ตรงเวลา)
    const timePart = dateObj.toLocaleString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    });

    // 3. นำมาต่อกัน
    return `${datePart} ${timePart}`;
  };
  const getStatusColor = (s: string) =>
    ({
      pending: "bg-warn-soft text-body",
      confirmed: "bg-new-soft text-new-ink",
      preparing: "bg-new-soft text-new-ink",
      shipping: "bg-new-soft text-new-ink",
      delivered: "bg-success-soft text-success",
      cancelled: "bg-danger-soft text-danger",
    })[s] || "bg-sand text-ink";
  const getStatusText = (s: string) =>
    ({
      pending: "รอดำเนินการ",
      confirmed: "ยืนยันแล้ว",
      preparing: "เตรียมสินค้า",
      shipping: "กำลังจัดส่ง",
      delivered: "คำสั่งซื้อสำเร็จ",
      cancelled: "ยกเลิก",
    })[s] || s;

  if (loading)
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full animate-spin"
            style={{
              borderWidth: 3,
              borderStyle: "solid",
              borderColor: "#a84a0e transparent transparent transparent",
            }}
          ></div>
          <p className="text-body text-sm font-medium">
            กำลังโหลดข้อมูล...
          </p>
        </div>
      </div>
    );

  const fadeClass = `transition-all duration-500 ${animIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`;

  return (
    <div className="min-h-screen bg-cream p-6">
      {/* Header */}
      <div className={`mb-6 ${fadeClass}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
              <span className="text-3xl">📊</span> Dashboard
            </h1>
            <p className="text-brick text-sm mt-0.5">
              ภาพรวมของร้าน Pound Bakery
            </p>
          </div>
          <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-line">
            {(
              [
                ["all", "ทั้งหมด"],
                ["7d", "7 วัน"],
                ["30d", "30 วัน"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTimeFilter(k)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${timeFilter === k ? "bg-brick text-white shadow" : "text-body hover:bg-warn-bg"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* เปิด/ปิดรับออเดอร์ออนไลน์ */}
      <div className="mb-6">
        <StoreOrderingToggle />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          {
            label: "รายได้รวมทั้งหมด",
            labelMobile: "รายได้รวม",
            value: `฿${formatPrice(totalRevenue)}`,
            sub:
              revChange !== 0
                ? `${revChange > 0 ? "↑" : "↓"} ${Math.abs(revChange)}% vs ช่วงก่อน`
                : "",
            subColor:
              revChange > 0
                ? "text-ok"
                : revChange < 0
                  ? "text-error"
                  : "text-muted",
            icon: "💰",
            border: "border-line-strong",
            bg: "bg-warn-bg",
            chart: <Sparkline data={dailyRevenue} color="#a84a0e" />,
            delay: "0ms",
          },
          {
            label: "คำสั่งซื้อที่สำเร็จ (ไม่รวมรอดำเนินการและยกเลิก)",
            labelMobile: "คำสั่งซื้อสำเร็จ",
            value: totalOrders.toString(),
            sub:
              ordChange !== 0
                ? `${ordChange > 0 ? "↑" : "↓"} ${Math.abs(ordChange)}% vs ช่วงก่อน`
                : "",
            subColor:
              ordChange > 0
                ? "text-ok"
                : ordChange < 0
                  ? "text-error"
                  : "text-muted",
            icon: "🛒",
            border: "border-ok",
            bg: "bg-success-soft",
            chart: (
              <MiniBarChart data={dailyOrderCount} color="#2f7d4f" />
            ),
            delay: "60ms",
          },
          {
            label: "สมาชิก (ผู้ใช้ทั้งหมด)",
            labelMobile: "สมาชิก",
            value: totalUsers.toString(),
            sub: "",
            subColor: "text-muted",
            icon: "👥",
            border: "border-new-ink",
            bg: "bg-new-soft",
            chart: null,
            delay: "120ms",
          },
          {
            label: "รอดำเนินการ",
            labelMobile: "รอดำเนินการ",
            value: pendingOrders.toString(),
            sub: `${lowStock} รายการใกล้หมด`,
            subColor: lowStock > 0 ? "text-error" : "text-muted",
            icon: "⏳",
            border: "border-error",
            bg: "bg-danger-soft",
            chart: null,
            delay: "180ms",
          },
        ].map((card, i) => (
          <div
            key={i}
            className={`${card.bg} rounded-2xl border-l-4 ${card.border} p-3 md:p-5 shadow-sm ${fadeClass}`}
            style={{ transitionDelay: card.delay }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0 pr-1">
                {/* ✅ label สั้นบนมือถือ */}
                <p className="text-[10px] md:text-xs font-medium text-muted mb-1 lg:hidden truncate">
                  {card.labelMobile}
                </p>
                <p className="text-xs text-muted mb-1 truncate">
                  {card.label}
                </p>
                <p className="text-lg md:text-2xl font-bold text-body">
                  {card.value}
                </p>
              </div>
              <span className="text-lg md:text-2xl flex-shrink-0">
                {card.icon}
              </span>
            </div>
            {card.chart && <div className="mb-2">{card.chart}</div>}
            <p
              className={`text-[10px] md:text-xs font-medium mt-1 ${card.subColor} truncate`}
            >
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div
          className={`lg:col-span-2 bg-white rounded-2xl shadow-sm border border-line p-6 ${fadeClass}`}
          style={{ transitionDelay: "240ms" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-body">รายได้รายวัน</h2>
              <p className="text-xs text-muted">7 วันล่าสุด</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-brick">
                ฿{formatPrice(dailyRevenue.reduce((s, v) => s + v, 0))}
              </p>
              <p className="text-xs text-muted">รวม 7 วัน</p>
            </div>
          </div>
          <div className="flex items-end gap-2 h-36">
            {dailyRevenue.map((val, i) => {
              const max = Math.max(...dailyRevenue, 1);
              const d = new Date(now.getTime() - (6 - i) * 86400000);
              const isToday = d.toDateString() === now.toDateString();
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <p className="text-[10px] text-muted font-medium">
                    ฿
                    {val > 0
                      ? val >= 1000
                        ? `${(val / 1000).toFixed(1)}k`
                        : val
                      : ""}
                  </p>
                  <div
                    className="w-full relative flex items-end"
                    style={{ height: 96 }}
                  >
                    <div
                      className="w-full rounded-t-lg transition-all duration-700"
                      style={{
                        height: `${Math.max((val / max) * 100, val > 0 ? 5 : 0)}%`,
                        background: isToday
                          ? "linear-gradient(to top,#a84a0e,#f3b47a)"
                          : "linear-gradient(to top,#fde68a,#fdf0e2)",
                      }}
                    />
                  </div>
                  <p
                    className={`text-[10px] font-medium ${isToday ? "text-brick" : "text-muted"}`}
                  >
                    {d.toLocaleDateString("th-TH", { weekday: "short" })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className={`bg-white rounded-2xl shadow-sm border border-line p-6 ${fadeClass}`}
          style={{ transitionDelay: "300ms" }}
        >
          <h2 className="font-bold text-body mb-1">สถานะออเดอร์</h2>
          <p className="text-xs text-muted mb-4">
            ทั้งหมด {totalAllOrders} รายการ
          </p>
          <div className="flex flex-col gap-2">
            {statusBreakdown.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <div className="flex-1 bg-sand rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${totalAllOrders > 0 ? (s.count / totalAllOrders) * 100 : 0}%`,
                      backgroundColor: s.color,
                    }}
                  />
                </div>
                <span className="text-xs text-muted w-16 text-right">
                  {s.label}
                </span>
                <span className="text-xs font-bold text-body w-6 text-right">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-line">
            <p className="text-xs font-medium text-muted mb-2">
              ช่องทางการขาย
            </p>
            <div className="flex gap-2">
              <div className="flex-1 bg-warn-bg rounded-xl p-3 text-center border border-line">
                <p className="text-lg font-bold text-body">{posOrders}</p>
                <p className="text-[10px] text-brick">🏪 หน้าร้าน</p>
              </div>
              <div className="flex-1 bg-new-soft rounded-xl p-3 text-center border border-line">
                <p className="text-lg font-bold text-new-ink">
                  {onlineOrders}
                </p>
                <p className="text-[10px] text-new-ink">🌐 ออนไลน์</p>
              </div>
              <div className="flex-1 bg-success-soft rounded-xl p-3 text-center border border-success-soft">
                <p className="text-lg font-bold text-success">
                  {dineInOrders}
                </p>
                <p className="text-[10px] text-ok">🪑 ในร้าน</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className={`lg:col-span-2 bg-white rounded-2xl shadow-sm border border-line overflow-hidden ${fadeClass}`}
          style={{ transitionDelay: "360ms" }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <div>
              <h2 className="font-bold text-body">คำสั่งซื้อล่าสุด</h2>
              <p className="text-xs text-muted">อัปเดตอัตโนมัติ</p>
            </div>
            <button
              onClick={() => router.push("/admin/order")}
              className="text-xs text-brick hover:text-body font-medium px-3 py-1.5 bg-warn-bg rounded-lg"
            >
              ดูทั้งหมด →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-sand text-xs text-muted font-medium">
                  <th className="text-left px-6 py-3">รหัส</th>
                  <th className="text-left px-4 py-3">ลูกค้า</th>
                  <th className="text-left px-4 py-3">ยอดรวม</th>
                  <th className="text-left px-4 py-3">ช่องทาง</th>
                  <th className="text-left px-4 py-3">สถานะ</th>
                  <th className="text-left px-4 py-3">วันที่</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-line hover:bg-warn-bg/30 cursor-pointer transition-colors"
                    onClick={() => router.push("/admin/order")}
                  >
                    <td className="px-6 py-3 text-xs font-bold text-body">
                      #{order.ordCode || order.id}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-body truncate max-w-[120px]">
                        {order.receiverName || "-"}
                      </p>
                      <p className="text-[10px] text-muted truncate max-w-[120px]">
                        {order.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-brick">
                      ฿{formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${order.orderType === "pos" ? "bg-warn-soft text-body" : "bg-new-soft text-new-ink"}`}
                      >
                        {order.orderType === "pos"
                          ? "🏪 หน้าร้าน"
                          : "🌐 ออนไลน์"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getStatusColor(order.orderStatus)}`}
                      >
                        {getStatusText(order.orderStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-muted">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentOrders.length === 0 && (
              <div className="text-center py-12">
                <p className="text-5xl mb-2">📭</p>
                <p className="text-sm text-muted">ยังไม่มีคำสั่งซื้อ</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Quick Actions */}
          <div
            className={`bg-white rounded-2xl shadow-sm border border-line p-5 ${fadeClass}`}
            style={{ transitionDelay: "420ms" }}
          >
            <h2 className="font-bold text-body mb-3 flex items-center gap-2">
              <span>⚡</span> การดำเนินการด่วน
            </h2>
            <div className="space-y-2">
              {[
                {
                  icon: "📦",
                  label: "จัดการสินค้า",
                  path: "/admin/crudproduct",
                  bg: "hover:bg-new-soft border-line",
                },
                {
                  icon: "🛒",
                  label: "จัดการคำสั่งซื้อ",
                  path: "/admin/order",
                  bg: "hover:bg-success-soft border-success-soft",
                  badge: pendingOrders > 0 ? pendingOrders : 0,
                },
                {
                  icon: "🏪",
                  label: "หน้าร้าน POS",
                  path: "/admin/products",
                  bg: "hover:bg-warn-bg border-line",
                },
                {
                  icon: "👥",
                  label: "จัดการผู้ใช้",
                  path: "/admin/users",
                  bg: "hover:bg-new-soft border-line",
                },
                {
                  icon: "📋",
                  label: "ดูรายงาน",
                  path: "/admin/reports",
                  bg: "hover:bg-warn-bg border-line",
                },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${item.bg}`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="text-sm font-medium text-body flex-1">
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span className="bg-error text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                      {item.badge}
                    </span>
                  ) : (
                    <span className="text-faint text-xs">›</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ✅ Top 5 สินค้าขายดี */}
          <div
            className={`bg-white rounded-2xl shadow-sm border border-line p-5 ${fadeClass}`}
            style={{ transitionDelay: "480ms" }}
          >
            <h2 className="font-bold text-body mb-3 flex items-center gap-2">
              <span>🏆</span> สินค้าขายดี Top 5
            </h2>
            <div className="space-y-3">
              {topProducts.slice(0, 5).map((p, i) => {
                const maxQty = topProducts[0]?.totalQty || 1;
                const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                return (
                  <div key={`${p.productName}-${p.selectedOption ?? ""}-${i}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm flex-shrink-0">
                          {medals[i]}
                        </span>
                        <span className="text-xs font-medium text-body truncate">
                          {p.productName}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-brick flex-shrink-0 ml-2">
                        {p.totalQty} ออเดอร์
                      </span>
                    </div>
                    <div className="w-full bg-sand rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-brick   transition-all duration-700"
                        style={{ width: `${(p.totalQty / maxQty) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted mt-0.5">
                      ฿{formatPrice(p.totalRevenue)} รายได้รวม
                    </p>
                  </div>
                );
              })}
              {topProducts.length === 0 && (
                <p className="text-xs text-muted text-center py-4">
                  ยังไม่มีข้อมูล
                </p>
              )}
            </div>
          </div>

          {/* Stock Alert */}
          <div
            className={`bg-white rounded-2xl shadow-sm border border-danger-line p-5 ${fadeClass}`}
            style={{ transitionDelay: "540ms" }}
          >
            <h2 className="font-bold text-body mb-3 flex items-center gap-2">
              <span>⚠️</span> สินค้าใกล้หมด
              {lowStock > 0 && (
                <span className="ml-auto bg-danger-soft text-error text-xs px-2 py-0.5 rounded-full font-bold">
                  {lowStock}
                </span>
              )}
            </h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {products.filter(
                (p) => p.stockQuantity <= 5 && p.stockQuantity !== 9999,
              ).length === 0 ? (
                <p className="text-xs text-muted text-center py-4">
                  ✅ สินค้าทุกรายการมีสต็อกเพียงพอ
                </p>
              ) : (
                products
                  .filter(
                    (p) => p.stockQuantity <= 5 && p.stockQuantity !== 9999,
                  )
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-1.5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-body truncate">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-muted">
                          {p.category}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.stockQuantity === 0 ? "bg-danger-soft text-error" : "bg-warn-soft text-brick"}`}
                      >
                        {p.stockQuantity === 0
                          ? "หมด"
                          : `${p.stockQuantity} ชิ้น`}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}