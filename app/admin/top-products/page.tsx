"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
    fetchTopProducts("all"); // ✅ ส่ง default filter ตอน mount
  }, [router]);

  // ✅ refetch เมื่อ filter เปลี่ยน (ยกเว้นครั้งแรก loading=true)
  useEffect(() => {
    if (!loading) {
      fetchTopProducts(timeFilter);
    }
  }, [timeFilter]);

  const fetchTopProducts = async (filter: "7d" | "30d" | "all") => {
    setLoading(true);
    try {
      const days = filter === "7d" ? "7" : filter === "30d" ? "30" : "all";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/stats/top-products?days=${days}`,
        { cache: "no-store" },
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
  };

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
    if (i === 0) return "from-yellow-400 to-amber-500";
    if (i === 1) return "from-gray-300 to-gray-400";
    if (i === 2) return "from-orange-300 to-orange-400";
    return "from-amber-200 to-amber-300";
  };

  const getOptionBadge = (opt?: string | null) => {
    if (!opt) return null;
    if (opt.includes("ปอนด์"))
      return { bg: "bg-pink-100 text-pink-700", label: opt };
    if (opt.includes("ชิ้น") || opt.includes("slice"))
      return { bg: "bg-amber-100 text-amber-700", label: opt };
    if (opt.includes("ร้อน"))
      return { bg: "bg-red-100 text-red-700", label: "🔥 " + opt };
    if (opt.includes("เย็น"))
      return { bg: "bg-blue-100 text-blue-700", label: "🧊 " + opt };
    if (opt.includes("ปั่น"))
      return { bg: "bg-purple-100 text-purple-700", label: "🌀 " + opt };
    if (opt.includes("ปกติ"))
      return { bg: "bg-sky-100 text-sky-700", label: "🥤 " + opt };
    if (opt.includes("ใหญ่"))
      return { bg: "bg-indigo-100 text-indigo-700", label: "🧋 " + opt };
    return { bg: "bg-gray-100 text-gray-600", label: opt };
  };

  if (loading)
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-amber-600 font-medium">กำลังโหลด...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-amber-800 flex items-center gap-3">
                <span className="text-4xl">🏆</span> Top Products
              </h1>
              <p className="text-amber-600 mt-1">
                รายการสินค้าที่ลูกค้าสั่งซื้อมากที่สุด แยกตามประเภท
              </p>
            </div>
            {/* ✅ ปุ่ม filter */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-amber-100">
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
                      ? "bg-amber-500 text-white shadow"
                      : "text-amber-700 hover:bg-amber-50"
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
          <div className="bg-white rounded-2xl shadow p-5 border-l-4 border-amber-400">
            <p className="text-xs text-gray-500 mb-1">
              รายการสินค้าที่ติดอันดับ
            </p>
            <p className="text-3xl font-bold text-amber-700">
              {summary.totalProductCount}
            </p>
            <p className="text-xs text-gray-400 mt-1">รายการ (รวมแยกประเภท)</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5 border-l-4 border-green-400">
            <p className="text-xs text-gray-500 mb-1">จำนวนขายรวม</p>
            <p className="text-3xl font-bold text-green-700">
              {summary.totalAllOrders.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">ออเดอร์</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5 border-l-4 border-blue-400">
            <p className="text-xs text-gray-500 mb-1">
              รายได้รวมของสินค้าทั้งหมด (ไม่รวมค่าจัดส่ง)
            </p>
            <p className="text-3xl font-bold text-blue-700">
              ฿{formatPrice(summary.totalAllRevenue)}
            </p>
            <p className="text-xs text-gray-400 mt-1">บาท</p>
          </div>
        </div>

        {/* Top 3 Podium */}
        {topProducts.length >= 3 && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h2 className="font-bold text-amber-700 mb-6 text-lg">
              🎖️ Top 3 สินค้าขายดี
            </h2>
            <div className="flex items-end justify-center gap-4">
              {/* 2nd */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-3xl mb-2">🥈</span>
                <div
                  className="w-full bg-gradient-to-t from-gray-300 to-gray-200 rounded-t-xl flex flex-col items-center justify-end py-4 px-2"
                  style={{ height: 120 }}
                >
                  <p className="font-bold text-gray-700 text-sm text-center leading-tight">
                    {topProducts[1]?.productName}
                  </p>
                  {topProducts[1]?.selectedOption && (
                    <span className="text-[10px] text-gray-500 mt-0.5 text-center">
                      {topProducts[1].selectedOption}
                    </span>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {topProducts[1]?.totalQty} ออเดอร์
                  </p>
                </div>
              </div>
              {/* 1st */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-4xl mb-2">🥇</span>
                <div
                  className="w-full bg-gradient-to-t from-amber-500 to-yellow-400 rounded-t-xl flex flex-col items-center justify-end py-4 px-2"
                  style={{ height: 160 }}
                >
                  <p className="font-bold text-white text-sm text-center leading-tight">
                    {topProducts[0]?.productName}
                  </p>
                  {topProducts[0]?.selectedOption && (
                    <span className="text-[10px] text-yellow-100 mt-0.5 text-center">
                      {topProducts[0].selectedOption}
                    </span>
                  )}
                  <p className="text-xs text-yellow-100 mt-1">
                    {topProducts[0]?.totalQty} ออเดอร์
                  </p>
                </div>
              </div>
              {/* 3rd */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-3xl mb-2">🥉</span>
                <div
                  className="w-full bg-gradient-to-t from-orange-400 to-orange-300 rounded-t-xl flex flex-col items-center justify-end py-4 px-2"
                  style={{ height: 90 }}
                >
                  <p className="font-bold text-white text-sm text-center leading-tight">
                    {topProducts[2]?.productName}
                  </p>
                  {topProducts[2]?.selectedOption && (
                    <span className="text-[10px] text-orange-100 mt-0.5 text-center">
                      {topProducts[2].selectedOption}
                    </span>
                  )}
                  <p className="text-xs text-orange-100 mt-1">
                    {topProducts[2]?.totalQty} ออเดอร์
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full List */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-amber-700">📋 รายการทั้งหมด</h2>
            {/* ✅ ส่ง timeFilter ปัจจุบันไปด้วย */}
            <button
              onClick={() => fetchTopProducts(timeFilter)}
              className="text-xs text-amber-600 hover:text-amber-700 px-3 py-1.5 bg-amber-50 rounded-lg font-medium"
            >
              🔄 รีเฟรช
            </button>
          </div>

          {/* ✅ ค้นหา + กรองหมวดหมู่ */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400">
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาสินค้า..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-amber-400/70"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-sm text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400 sm:w-44"
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
              <p className="text-gray-500">ยังไม่มีข้อมูลการขาย</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-gray-500">ไม่พบสินค้าที่ตรงกับการค้นหา</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-50">
                {visibleProducts.map(({ p, originalIndex: i }) => {
                  const badge = getOptionBadge(p.selectedOption);
                  return (
                    <div
                      key={`${p.productName}-${p.selectedOption}-${i}`}
                      className={`flex items-center gap-4 px-6 py-4 hover:bg-amber-50/50 transition-colors ${i < 3 ? "bg-amber-50/30" : ""}`}
                    >
                      <div className="w-10 flex-shrink-0 text-center">
                        {i < 3 ? (
                          <span className="text-2xl">{medals[i]}</span>
                        ) : (
                          <span className="text-lg font-bold text-gray-400">
                            {i + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <p className="font-semibold text-gray-800 truncate">
                              {p.productName}
                            </p>
                            {p.category && (
                              <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-medium bg-amber-100 text-amber-700 flex-shrink-0">
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
                          <span className="text-sm font-bold text-amber-600 flex-shrink-0">
                            {p.totalQty} ออเดอร์
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full bg-gradient-to-r ${rankColor(i)} transition-all duration-700`}
                            style={{ width: `${(p.totalQty / maxQty) * 100}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-xs text-gray-400">
                            รายได้รวม:{" "}
                            <span className="text-green-600 font-medium">
                              ฿{formatPrice(p.totalRevenue)}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400">
                            จำนวนออเดอร์:{" "}
                            <span className="text-blue-600 font-medium">
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
                <p className="text-center text-xs text-gray-400 py-4 border-t border-gray-50">
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
