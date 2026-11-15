"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authHeaders } from "@/lib/auth";

interface TopProduct {
  productName: string;
  selectedOption?: string | null;
  category?: string;
  totalQty: number;
  totalRevenue: number;
  orderCount: number;
}

const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function TopProductsPage() {
  const router = useRouter();
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"7d" | "30d" | "all">("all"); // ✅ เพิ่ม state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [summary, setSummary] = useState({
    totalAllRevenue: 0,
    totalAllQty: 0,
    totalAllOrders: 0,
    totalProductCount: 0,
  });

  const [categories, setCategories] = useState<
    { id: number; name: string; slug: string; icon: string }[]
  >([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories/active`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(console.error);
  }, []);

  const getCategoryDisplay = (slug?: string) => {
    if (!slug) return null;
    const cat = categories.find((c) => c.slug === slug);
    return cat ? `${cat.icon} ${cat.name}` : slug;
  };

  const fetchTopProducts = useCallback(async (filter: "7d" | "30d" | "all") => {
    setLoading(true);
    try {
      const days = filter === "7d" ? "7" : filter === "30d" ? "30" : "all";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/stats/top-products?days=${days}`,
        { cache: "no-store", headers: authHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        setTopProducts(data.topProducts);
        setSummary({
          totalAllRevenue: data.totalAllRevenue,
          totalAllQty: data.totalAllQty,
          totalAllOrders: data.totalAllOrders,
          totalProductCount: data.totalProductCount,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ตรวจสิทธิ์แล้วโหลดข้อมูลตามช่วงเวลา — ทำซ้ำทุกครั้งที่เปลี่ยนตัวกรอง
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.replace("/login");
      return;
    }
    const user = JSON.parse(userData);
    if (!user.email?.endsWith("@empbakery.com")) {
      router.replace("/");
      return;
    }
    fetchTopProducts(timeFilter);
  }, [router, timeFilter, fetchTopProducts]);


  const medals = ["🥇", "🥈", "🥉"];
  const maxQty = topProducts[0]?.totalQty || 1;

  // ✅ กรองรายการตามคำค้นหา + หมวดหมู่ (คงอันดับเดิมด้วย originalIndex)
  const filteredProducts = topProducts
    .map((p, originalIndex) => ({ p, originalIndex }))
    .filter(({ p }) => {
      const matchSearch = p.productName
        .toLowerCase()
        .includes(search.trim().toLowerCase());
      const matchCat =
        categoryFilter === "all" || p.category === categoryFilter;
      return matchSearch && matchCat;
    });

  // แสดงแค่ 10 อันดับแรกตอนยังไม่ค้นหา; ถ้ามีคำค้นหา แสดงทั้งหมดที่ตรง
  const isSearching = search.trim() !== "";
  const visibleProducts = isSearching
    ? filteredProducts
    : filteredProducts.slice(0, 10);

  const rankColor = (i: number) => {
    if (i === 0) return "bg-brick";
    if (i === 1) return "bg-muted";
    if (i === 2) return "bg-apricot";
    return "bg-warn-line";
  };

  const getOptionBadge = (opt?: string | null) => {
    if (!opt) return null;
    if (opt.includes("ปอนด์"))
      return { bg: "bg-danger-soft text-danger", label: opt };
    if (opt.includes("ชิ้น") || opt.includes("slice"))
      return { bg: "bg-warn-soft text-body", label: opt };
    if (opt.includes("ร้อน"))
      return { bg: "bg-danger-soft text-danger", label: "🔥 " + opt };
    if (opt.includes("เย็น"))
      return { bg: "bg-new-soft text-new-ink", label: "🧊 " + opt };
    if (opt.includes("ปั่น"))
      return { bg: "bg-new-soft text-new-ink", label: "🌀 " + opt };
    if (opt.includes("ปกติ"))
      return { bg: "bg-new-soft text-new-ink", label: "🥤 " + opt };
    if (opt.includes("ใหญ่"))
      return { bg: "bg-new-soft text-new-ink", label: "🧋 " + opt };
    return { bg: "bg-sand text-subtle", label: opt };
  };

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

  return (
    <div className="min-h-screen bg-warn-bg p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-ink flex items-center gap-3">
                <span className="text-4xl">🏆</span> Top Products
              </h1>
              <p className="text-brick mt-1">
                รายการสินค้าที่ลูกค้าสั่งซื้อมากที่สุด แยกตามประเภท
              </p>
            </div>
            {/* ✅ ปุ่ม filter */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-line">
              {(
                [
                  ["7d", "7 วัน"],
                  ["30d", "30 วัน"],
                  ["all", "ทั้งหมด"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setTimeFilter(k)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    timeFilter === k
                      ? "bg-brick text-white shadow"
                      : "text-body hover:bg-warn-bg"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow p-5 border-l-4 border-line-strong">
            <p className="text-xs text-muted mb-1">
              รายการสินค้าที่ติดอันดับ
            </p>
            <p className="text-3xl font-bold text-body">
              {summary.totalProductCount}
            </p>
            <p className="text-xs text-muted mt-1">รายการ (รวมแยกประเภท)</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5 border-l-4 border-ok">
            <p className="text-xs text-muted mb-1">จำนวนขายรวม</p>
            <p className="text-3xl font-bold text-success">
              {summary.totalAllOrders.toLocaleString()}
            </p>
            <p className="text-xs text-muted mt-1">ออเดอร์</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5 border-l-4 border-new-ink">
            <p className="text-xs text-muted mb-1">
              รายได้รวมของสินค้าทั้งหมด (ไม่รวมค่าจัดส่ง)
            </p>
            <p className="text-3xl font-bold text-new-ink">
              ฿{formatPrice(summary.totalAllRevenue)}
            </p>
            <p className="text-xs text-muted mt-1">บาท</p>
          </div>
        </div>

        {/* Top 3 Podium */}
        {topProducts.length >= 3 && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h2 className="font-bold text-body mb-6 text-lg">
              🎖️ Top 3 สินค้าขายดี
            </h2>
            <div className="flex items-end justify-center gap-4">
              {/* 2nd */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-3xl mb-2">🥈</span>
                <div
                  className="w-full bg-ink   rounded-t-xl flex flex-col items-center justify-end py-4 px-2"
                  style={{ height: 120 }}
                >
                  <p className="font-bold text-body text-sm text-center leading-tight">
                    {topProducts[1]?.productName}
                  </p>
                  {topProducts[1]?.selectedOption && (
                    <span className="text-[10px] text-muted mt-0.5 text-center">
                      {topProducts[1].selectedOption}
                    </span>
                  )}
                  <p className="text-xs text-muted mt-1">
                    {topProducts[1]?.totalQty} ออเดอร์
                  </p>
                </div>
              </div>
              {/* 1st */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-4xl mb-2">🥇</span>
                <div
                  className="w-full bg-brick   rounded-t-xl flex flex-col items-center justify-end py-4 px-2"
                  style={{ height: 160 }}
                >
                  <p className="font-bold text-white text-sm text-center leading-tight">
                    {topProducts[0]?.productName}
                  </p>
                  {topProducts[0]?.selectedOption && (
                    <span className="text-[10px] text-cream mt-0.5 text-center">
                      {topProducts[0].selectedOption}
                    </span>
                  )}
                  <p className="text-xs text-cream mt-1">
                    {topProducts[0]?.totalQty} ออเดอร์
                  </p>
                </div>
              </div>
              {/* 3rd */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-3xl mb-2">🥉</span>
                <div
                  className="w-full bg-brick   rounded-t-xl flex flex-col items-center justify-end py-4 px-2"
                  style={{ height: 90 }}
                >
                  <p className="font-bold text-white text-sm text-center leading-tight">
                    {topProducts[2]?.productName}
                  </p>
                  {topProducts[2]?.selectedOption && (
                    <span className="text-[10px] text-cream mt-0.5 text-center">
                      {topProducts[2].selectedOption}
                    </span>
                  )}
                  <p className="text-xs text-cream mt-1">
                    {topProducts[2]?.totalQty} ออเดอร์
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full List */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-line flex items-center justify-between">
            <h2 className="font-bold text-body">📋 รายการทั้งหมด</h2>
            {/* ✅ ส่ง timeFilter ปัจจุบันไปด้วย */}
            <button
              onClick={() => fetchTopProducts(timeFilter)}
              className="text-xs text-brick hover:text-body px-3 py-1.5 bg-warn-bg rounded-lg font-medium"
            >
              🔄 รีเฟรช
            </button>
          </div>

          {/* ✅ ค้นหา + กรองหมวดหมู่ */}
          <div className="px-6 py-4 border-b border-line flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-apricot">
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาสินค้า..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-warn-bg/60 border border-line text-sm focus:outline-none focus:ring-2 focus:ring-brick placeholder-faint/70"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-warn-bg/60 border border-line text-sm text-body focus:outline-none focus:ring-2 focus:ring-brick sm:w-44"
            >
              <option value="all">ทุกหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          {topProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-muted">ยังไม่มีข้อมูลการขาย</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-muted">ไม่พบสินค้าที่ตรงกับการค้นหา</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-line">
                {visibleProducts.map(({ p, originalIndex: i }) => {
                  const badge = getOptionBadge(p.selectedOption);
                  return (
                    <div
                      key={`${p.productName}-${p.selectedOption}-${i}`}
                      className={`flex items-center gap-4 px-6 py-4 hover:bg-warn-bg/50 transition-colors ${i < 3 ? "bg-warn-bg/30" : ""}`}
                    >
                      <div className="w-10 flex-shrink-0 text-center">
                        {i < 3 ? (
                          <span className="text-2xl">{medals[i]}</span>
                        ) : (
                          <span className="text-lg font-bold text-muted">
                            {i + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <p className="font-semibold text-ink truncate">
                              {p.productName}
                            </p>
                            {p.category && (
                              <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-medium bg-warn-soft text-body flex-shrink-0">
                                {getCategoryDisplay(p.category)}
                              </span>
                            )}
                            {badge && (
                              <span
                                className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0 ${badge.bg}`}
                              >
                                {badge.label}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-bold text-brick flex-shrink-0">
                            {p.totalQty} ออเดอร์
                          </span>
                        </div>
                        <div className="w-full bg-sand rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${rankColor(i)} transition-all duration-700`}
                            style={{ width: `${(p.totalQty / maxQty) * 100}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-xs text-muted">
                            รายได้รวม:{" "}
                            <span className="text-ok font-medium">
                              ฿{formatPrice(p.totalRevenue)}
                            </span>
                          </p>
                          <p className="text-xs text-muted">
                            จำนวนออเดอร์:{" "}
                            <span className="text-new-ink font-medium">
                              {p.orderCount} ครั้ง
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!isSearching && filteredProducts.length > 10 && (
                <p className="text-center text-xs text-muted py-4 border-t border-line">
                  แสดง 10 อันดับแรก · พิมพ์ค้นหาเพื่อดูอันดับอื่น (ทั้งหมด{" "}
                  {filteredProducts.length} รายการ)
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
