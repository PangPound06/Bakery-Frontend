"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [timeFilter, setTimeFilter] = useState<"7d" | "30d" | "all">("all");
  const [animIn, setAnimIn] = useState(false);

  const [categories, setCategories] = useState(
    [] as { id: number; name: string; slug: string; icon: string }[],
  );

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
  }, [router]);

  useEffect(() => {
    if (!loading) setTimeout(() => setAnimIn(true), 50);
  }, [loading]);

  // ✅ เพิ่ม useEffect นี้
  useEffect(() => {
    if (!loading) {
      const days =
        timeFilter === "7d" ? "7" : timeFilter === "30d" ? "30" : "all";
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/stats/top-products?days=${days}`,
      )
        .then((r) => (r.ok ? r.json() : { topProducts: [] }))
        .then((data) => setTopProducts(data.topProducts || []))
        .catch(console.error);
    }
  }, [timeFilter]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");

      const [productsRes, ordersRes, usersRes, topProdRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/orders/stats/top-products?days=${timeFilter === "7d" ? "7" : timeFilter === "30d" ? "30" : "all"}`,
        ),
      ]);

      if (productsRes.ok) setProducts(await productsRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (usersRes.ok) {
        const u = await usersRes.json();
        setTotalUsers(u.length);
      }
      if (topProdRes.ok) {
        const topData = await topProdRes.json();
        setTopProducts(topData.topProducts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const cutoff =
    timeFilter === "7d"
      ? new Date(now.getTime() - 7 * 86400000)
      : timeFilter === "30d"
        ? new Date(now.getTime() - 30 * 86400000)
        : new Date(0);
  const filteredOrders = orders.filter((o) => new Date(o.createdAt) >= cutoff);
  // ใหม่ ✅ — นับตั้งแต่ confirmed ขึ้นไป
  const totalRevenue = filteredOrders
    .filter((o) =>
      ["confirmed", "preparing", "shipping", "delivered"].includes(
        o.orderStatus,
      ),
    )
    .reduce((s, o) => s + o.total, 0);
  const totalOrders = filteredOrders.filter((o) =>
    ["confirmed", "preparing", "shipping", "delivered"].includes(o.orderStatus),
  ).length;
  const pendingOrders = filteredOrders.filter(
    (o) => o.orderStatus === "pending",
  ).length;
  const lowStock = products.filter(
    (p) => p.stockQuantity <= 5 && p.stockQuantity !== 9999,
  ).length;
  const posOrders = filteredOrders.filter((o) => o.orderType === "pos").length;
  const dineInOrders = filteredOrders.filter(
    (o) => o.orderType === "dine-in",
  ).length;
  const onlineOrders = filteredOrders.filter(
    (o) => o.orderType !== "pos" && o.orderType !== "dine-in",
  ).length;

  const dailyRevenue = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 86400000);
    return orders
      .filter(
        (o) =>
          new Date(o.createdAt).toDateString() === d.toDateString() &&
          ["confirmed", "preparing", "shipping", "delivered"].includes(
            o.orderStatus,
          ),
      )
      .reduce((s, o) => s + o.total, 0);
  });

  const prevCutoff =
    timeFilter === "7d"
      ? new Date(now.getTime() - 14 * 86400000)
      : timeFilter === "30d"
        ? new Date(now.getTime() - 60 * 86400000)
        : new Date(0);
  const prevOrders = orders.filter(
    (o) =>
      new Date(o.createdAt) >= prevCutoff && new Date(o.createdAt) < cutoff,
  );
  const prevRevenue = prevOrders
    .filter((o) => o.orderStatus !== "cancelled")
    .reduce((s, o) => s + o.total, 0);
  const revChange =
    prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
      : 0;
  const ordChange =
    prevOrders.length > 0
      ? Math.round(
          ((totalOrders - prevOrders.length) / prevOrders.length) * 100,
        )
      : 0;

  const catCount = products.reduce((acc: Record<string, number>, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  const donutColors = [
    "#f59e0b",
    "#ec4899",
    "#3b82f6",
    "#ef4444",
    "#8b5cf6",
    "#10b981",
  ];
  const donutData = categories.map((cat, i) => ({
    value: catCount[cat.slug] || 0,
    color: donutColors[i % donutColors.length],
    label: cat.name,
  }));
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
        pending: "#f59e0b",
        confirmed: "#3b82f6",
        preparing: "#6366f1",
        shipping: "#8b5cf6",
        delivered: "#10b981",
        cancelled: "#ef4444",
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
    count: filteredOrders.filter((o) => o.orderStatus === key).length,
  }));

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 6);
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    });
  const getStatusColor = (s: string) =>
    ({
      pending: "bg-amber-100 text-amber-700",
      confirmed: "bg-blue-100 text-blue-700",
      preparing: "bg-indigo-100 text-indigo-700",
      shipping: "bg-purple-100 text-purple-700",
      delivered: "bg-emerald-100 text-emerald-700",
      cancelled: "bg-red-100 text-red-700",
    })[s] || "bg-gray-100 text-amber-800";
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
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full animate-spin"
            style={{
              borderWidth: 3,
              borderStyle: "solid",
              borderColor: "#f59e0b transparent transparent transparent",
            }}
          ></div>
          <p className="text-amber-700 text-sm font-medium">
            กำลังโหลดข้อมูล...
          </p>
        </div>
      </div>
    );

  const fadeClass = `transition-all duration-500 ${animIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`;

  return (
    <div className="min-h-screen bg-[#faf7f2] p-6">
      {/* Header */}
      <div className={`mb-6 ${fadeClass}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
              <span className="text-3xl">📊</span> Dashboard
            </h1>
            <p className="text-amber-600 text-sm mt-0.5">
              ภาพรวมของร้าน Pound Bakery
            </p>
          </div>
          <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-amber-100">
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
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${timeFilter === k ? "bg-amber-500 text-white shadow" : "text-amber-700 hover:bg-amber-50"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
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
                ? "text-emerald-600"
                : revChange < 0
                  ? "text-red-500"
                  : "text-gray-400",
            icon: "💰",
            border: "border-amber-400",
            bg: "from-amber-50 to-orange-50",
            chart: <Sparkline data={dailyRevenue} color="#f59e0b" />,
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
                ? "text-emerald-600"
                : ordChange < 0
                  ? "text-red-500"
                  : "text-gray-400",
            icon: "🛒",
            border: "border-green-400",
            bg: "from-green-50 to-emerald-50",
            chart: (
              <MiniBarChart
                data={dailyRevenue.map(
                  (_, i) =>
                    orders.filter((o) => {
                      const d = new Date(now.getTime() - (6 - i) * 86400000);
                      return (
                        new Date(o.createdAt).toDateString() ===
                        d.toDateString()
                      );
                    }).length,
                )}
                color="#10b981"
              />
            ),
            delay: "60ms",
          },
          {
            label: "สมาชิก (ผู้ใช้ทั้งหมด)",
            labelMobile: "สมาชิก",
            value: totalUsers.toString(),
            sub: "",
            subColor: "text-gray-400",
            icon: "👥",
            border: "border-purple-400",
            bg: "from-purple-50 to-pink-50",
            chart: null,
            delay: "120ms",
          },
          {
            label: "รอดำเนินการ",
            labelMobile: "รอดำเนินการ",
            value: pendingOrders.toString(),
            sub: `${lowStock} รายการใกล้หมด`,
            subColor: lowStock > 0 ? "text-red-500" : "text-gray-400",
            icon: "⏳",
            border: "border-red-400",
            bg: "from-red-50 to-rose-50",
            chart: null,
            delay: "180ms",
          },
        ].map((card, i) => (
          <div
            key={i}
            className={`bg-gradient-to-br ${card.bg} rounded-2xl border-l-4 ${card.border} p-3 md:p-5 shadow-sm ${fadeClass}`}
            style={{ transitionDelay: card.delay }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0 pr-1">
                {/* ✅ label สั้นบนมือถือ */}
                <p className="text-[10px] md:text-xs font-medium text-gray-500 mb-1 lg:hidden truncate">
                  {card.labelMobile}
                </p>
                <p className="text-xs text-gray-500 mb-1 truncate">
                  {card.label}
                </p>
                <p className="text-lg md:text-2xl font-bold text-amber-700">
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
          className={`lg:col-span-2 bg-white rounded-2xl shadow-sm border border-amber-100 p-6 ${fadeClass}`}
          style={{ transitionDelay: "240ms" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-amber-700">รายได้รายวัน</h2>
              <p className="text-xs text-gray-400">7 วันล่าสุด</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-amber-600">
                ฿{formatPrice(dailyRevenue.reduce((s, v) => s + v, 0))}
              </p>
              <p className="text-xs text-gray-400">รวม 7 วัน</p>
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
                  <p className="text-[10px] text-gray-500 font-medium">
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
                          ? "linear-gradient(to top,#f59e0b,#fbbf24)"
                          : "linear-gradient(to top,#fde68a,#fef3c7)",
                      }}
                    />
                  </div>
                  <p
                    className={`text-[10px] font-medium ${isToday ? "text-amber-600" : "text-gray-400"}`}
                  >
                    {d.toLocaleDateString("th-TH", { weekday: "short" })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className={`bg-white rounded-2xl shadow-sm border border-amber-100 p-6 ${fadeClass}`}
          style={{ transitionDelay: "300ms" }}
        >
          <h2 className="font-bold text-amber-700 mb-1">สถานะออเดอร์</h2>
          <p className="text-xs text-gray-400 mb-4">
            ทั้งหมด {filteredOrders.length} รายการ
          </p>
          <div className="flex flex-col gap-2">
            {statusBreakdown.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${filteredOrders.length > 0 ? (s.count / filteredOrders.length) * 100 : 0}%`,
                      backgroundColor: s.color,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">
                  {s.label}
                </span>
                <span className="text-xs font-bold text-gray-700 w-6 text-right">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">
              ช่องทางการขาย
            </p>
            <div className="flex gap-2">
              <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                <p className="text-lg font-bold text-amber-700">{posOrders}</p>
                <p className="text-[10px] text-amber-600">🏪 หน้าร้าน</p>
              </div>
              <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                <p className="text-lg font-bold text-blue-700">
                  {onlineOrders}
                </p>
                <p className="text-[10px] text-blue-600">🌐 ออนไลน์</p>
              </div>
              <div className="flex-1 bg-green-50 rounded-xl p-3 text-center border border-green-100">
                <p className="text-lg font-bold text-green-700">
                  {dineInOrders}
                </p>
                <p className="text-[10px] text-green-600">🪑 ในร้าน</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className={`lg:col-span-2 bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden ${fadeClass}`}
          style={{ transitionDelay: "360ms" }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div>
              <h2 className="font-bold text-amber-700">คำสั่งซื้อล่าสุด</h2>
              <p className="text-xs text-gray-400">อัปเดตอัตโนมัติ</p>
            </div>
            <button
              onClick={() => router.push("/admin/order")}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium px-3 py-1.5 bg-amber-50 rounded-lg"
            >
              ดูทั้งหมด →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 font-medium">
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
                    className="border-t border-gray-50 hover:bg-amber-50/30 cursor-pointer transition-colors"
                    onClick={() => router.push("/admin/order")}
                  >
                    <td className="px-6 py-3 text-xs font-bold text-amber-700">
                      #{order.ordCode || order.id}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-amber-700 truncate max-w-[120px]">
                        {order.receiverName || "-"}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate max-w-[120px]">
                        {order.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-amber-600">
                      ฿{formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${order.orderType === "pos" ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-600"}`}
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
                    <td className="px-4 py-3 text-[10px] text-gray-400">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentOrders.length === 0 && (
              <div className="text-center py-12">
                <p className="text-5xl mb-2">📭</p>
                <p className="text-sm text-gray-400">ยังไม่มีคำสั่งซื้อ</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Quick Actions */}
          <div
            className={`bg-white rounded-2xl shadow-sm border border-amber-100 p-5 ${fadeClass}`}
            style={{ transitionDelay: "420ms" }}
          >
            <h2 className="font-bold text-amber-700 mb-3 flex items-center gap-2">
              <span>⚡</span> การดำเนินการด่วน
            </h2>
            <div className="space-y-2">
              {[
                {
                  icon: "📦",
                  label: "จัดการสินค้า",
                  path: "/admin/crudproduct",
                  bg: "hover:bg-blue-50 border-blue-100",
                },
                {
                  icon: "🛒",
                  label: "จัดการคำสั่งซื้อ",
                  path: "/admin/order",
                  bg: "hover:bg-green-50 border-green-100",
                  badge: pendingOrders > 0 ? pendingOrders : 0,
                },
                {
                  icon: "🏪",
                  label: "หน้าร้าน POS",
                  path: "/admin/products",
                  bg: "hover:bg-amber-50 border-amber-100",
                },
                {
                  icon: "👥",
                  label: "จัดการผู้ใช้",
                  path: "/admin/users",
                  bg: "hover:bg-purple-50 border-purple-100",
                },
                {
                  icon: "📋",
                  label: "ดูรายงาน",
                  path: "/admin/reports",
                  bg: "hover:bg-orange-50 border-orange-100",
                },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${item.bg}`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="text-sm font-medium text-gray-700 flex-1">
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                      {item.badge}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">›</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ✅ Top 5 สินค้าขายดี */}
          <div
            className={`bg-white rounded-2xl shadow-sm border border-amber-100 p-5 ${fadeClass}`}
            style={{ transitionDelay: "480ms" }}
          >
            <h2 className="font-bold text-amber-700 mb-3 flex items-center gap-2">
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
                        <span className="text-xs font-medium text-gray-700 truncate">
                          {p.productName}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-amber-600 flex-shrink-0 ml-2">
                        {p.totalQty} ออเดอร์
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
                        style={{ width: `${(p.totalQty / maxQty) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      ฿{formatPrice(p.totalRevenue)} รายได้รวม
                    </p>
                  </div>
                );
              })}
              {topProducts.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">
                  ยังไม่มีข้อมูล
                </p>
              )}
            </div>
          </div>

          {/* Stock Alert */}
          <div
            className={`bg-white rounded-2xl shadow-sm border border-red-100 p-5 ${fadeClass}`}
            style={{ transitionDelay: "540ms" }}
          >
            <h2 className="font-bold text-amber-700 mb-3 flex items-center gap-2">
              <span>⚠️</span> สินค้าใกล้หมด
              {lowStock > 0 && (
                <span className="ml-auto bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {lowStock}
                </span>
              )}
            </h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {products.filter(
                (p) => p.stockQuantity <= 5 && p.stockQuantity !== 9999,
              ).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
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
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {p.category}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.stockQuantity === 0 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}
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
