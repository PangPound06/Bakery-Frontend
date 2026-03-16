"use client";

import { useState, useEffect, useRef } from "react";
import ProductCard from "./components/ProductCard";

interface Product {
  id: number;
  name: string;
  type: string;
  category: string;
  price: number;
  img: string;
  description: string;
  stockQuantity: number;
  isAvailable: boolean;
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const hero = useInView(0.1);
  const intro = useInView(0.2);
  const cats = useInView(0.15);
  const picks = useInView(0.1);
  const story = useInView(0.15);

  const categories = [
    { id: "all", label: "All" },
    { id: "bakery", label: "Bakery" },
    { id: "drink", label: "Drink" },
    { id: "cake", label: "Cake" },
  ];

  const shuffle = (arr: Product[]) => [...arr].sort(() => Math.random() - 0.5);
  const pick = (arr: Product[], cat: string, n: number) =>
    shuffle(arr.filter((p) => p.category?.toLowerCase() === cat)).slice(0, n);

  const fetchProducts = async () => {
    try {
      const res = await fetch(
        "https://bakery-backend-production-6fc9.up.railway.app/api/products",
      );
      if (res.ok) {
        const data = await res.json();
        const fmt: Product[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          type: item.type || "Other",
          category: item.category,
          price: item.price,
          img: item.image,
          description: item.description,
          stockQuantity: item.stockQuantity,
          isAvailable: item.isAvailable,
        }));
        setAllProducts(fmt);
        setDisplayProducts(
          shuffle([
            ...pick(fmt, "bakery", 4),
            ...pick(fmt, "cake", 4),
            ...pick(fmt, "drink", 4),
          ]),
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleStockUpdate = async () => {
    try {
      const res = await fetch(
        "https://bakery-backend-production-6fc9.up.railway.app/api/products",
      );
      if (res.ok) {
        const data = await res.json();
        const fmt: Product[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          type: item.type || "Other",
          category: item.category,
          price: item.price,
          img: item.image,
          description: item.description,
          stockQuantity: item.stockQuantity,
          isAvailable: item.isAvailable,
        }));
        setAllProducts(fmt);
        setDisplayProducts((prev) =>
          prev.map((p) => fmt.find((i: Product) => i.id === p.id) || p),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered =
    selectedCategory === "all"
      ? displayProducts
      : displayProducts.filter(
          (p) => p.category?.toLowerCase() === selectedCategory,
        );

  if (loading)
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border border-amber-800/30 border-t-amber-800 rounded-full animate-spin mx-auto" />
          <p className="text-amber-900/40 text-[11px] tracking-[0.4em] uppercase font-light">
            Loading
          </p>
        </div>
      </div>
    );

  return (
    <div
      className="bg-[#faf8f5] min-h-screen"
      
    >
      {/* ━━━ HERO ━━━ */}
      <section
        ref={hero.ref as React.RefObject<HTMLElement>}
        className="relative h-screen overflow-hidden"
      >
        <img
          src="https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=1800&q=85"
          alt="hero"
          className="absolute inset-0 w-full h-full object-cover scale-[1.04] transition-transform duration-[8000ms] ease-out"
          style={{ transform: hero.inView ? "scale(1)" : "scale(1.04)" }}
        />
        {/* Warm vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-transparent to-[#faf8f5]" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-950/30 to-transparent" />

        <div
          className={`absolute inset-0 flex flex-col justify-end pb-20 sm:pb-28 px-6 sm:px-12 lg:px-20 transition-all duration-1000 ${hero.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="max-w-xl">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-8 h-px bg-amber-200/70" />
              <span
                className="text-amber-100/80 text-[11px] tracking-[0.4em] uppercase font-light"
                style={{ fontFamily: "system-ui" }}
              >
                Est. 2024 · Bangkok
              </span>
            </div>

            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-light text-white leading-[0.9] mb-6">
              My
              <br />
              <em className="not-italic font-semibold">Bakery</em>
            </h1>

            <p
              className="text-white/70 text-base sm:text-lg font-light leading-relaxed mb-10 max-w-sm"
              style={{ fontFamily: "system-ui" }}
            >
              อบสดทุกเช้า ด้วยส่วนผสมที่คัดมาเพื่อ
              <br />
              ทุกคำแห่งความสุข
            </p>

            <div className="flex items-center gap-6">
              <button
                onClick={() =>
                  document
                    .getElementById("picks")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="px-7 py-3 bg-amber-50 text-amber-900 text-sm tracking-wider rounded-full hover:bg-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                style={{ fontFamily: "system-ui", fontWeight: 500 }}
              >
                สำรวจเมนู
              </button>
              <a
                href="/bakery"
                className="flex items-center gap-2 text-white/60 hover:text-white/90 transition-colors text-sm"
                style={{ fontFamily: "system-ui" }}
              >
                <span>ดูทั้งหมด</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 right-8 flex flex-col items-center gap-2">
          <div className="w-px h-10 bg-white/20 relative overflow-hidden">
            <div className="absolute top-0 w-full h-1/2 bg-white/60 animate-bounce" />
          </div>
          <span
            className="text-white/30 text-[9px] tracking-[0.3em] uppercase rotate-90 origin-center mt-4"
            style={{ fontFamily: "system-ui" }}
          >
            scroll
          </span>
        </div>
      </section>

      {/* ━━━ INTRO STRIP ━━━ */}
      <section
        ref={intro.ref as React.RefObject<HTMLElement>}
        className="py-12 sm:py-16 px-6 sm:px-12 lg:px-20 border-b border-amber-900/8"
      >
        <div
          className={`max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-700 ${intro.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <p
            className="text-amber-900/50 text-sm sm:text-base font-light max-w-lg leading-relaxed text-center sm:text-left"
            style={{ fontFamily: "system-ui" }}
          >
            เบเกอรี่ เครื่องดื่ม และเค้กสุดพิเศษ —
            เลือกสรรวัตถุดิบทุกชิ้นด้วยมือ
          </p>
          <div className="flex items-center gap-8 text-center">
            {[
              ["50+", "เมนู"],
              ["100%", "สดใหม่"],
              ["7", "วัน/สัปดาห์"],
            ].map(([n, l]) => (
              <div key={l}>
                <p className="text-2xl sm:text-3xl font-light text-amber-900">
                  {n}
                </p>
                <p
                  className="text-amber-900/40 text-[11px] tracking-wider uppercase mt-0.5"
                  style={{ fontFamily: "system-ui" }}
                >
                  {l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ CATEGORY CARDS ━━━ */}
      <section
        ref={cats.ref as React.RefObject<HTMLElement>}
        id="categories"
        className="py-16 sm:py-24 px-6 sm:px-12 lg:px-20"
      >
        <div className="max-w-7xl mx-auto">
          <div
            className={`mb-10 sm:mb-14 transition-all duration-700 ${cats.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            <p
              className="text-amber-800/50 text-[11px] tracking-[0.4em] uppercase mb-3"
              style={{ fontFamily: "system-ui" }}
            >
              Browse
            </p>
            <h2 className="text-4xl sm:text-5xl font-light text-amber-950">
              เลือกตาม<em className="not-italic font-semibold">หมวดหมู่</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {[
              {
                id: "bakery",
                label: "Bakery",
                sub: "ขนมปัง · ครัวซองค์ · มัฟฟิน",
                img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&q=80",
                span: "sm:row-span-2 sm:h-full h-64",
              },
              {
                id: "drink",
                label: "Drink",
                sub: "กาแฟ · ชา · สมูทตี้",
                img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80",
                span: "h-52 sm:h-auto",
              },
              {
                id: "cake",
                label: "Cake",
                sub: "เค้กวันเกิด · บราวนี่",
                img: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=900&q=80",
                span: "h-52 sm:h-auto",
              },
            ].map((cat, i) => (
              <a
                key={cat.id}
                href={`/${cat.id}`}
                className={`group relative overflow-hidden rounded-2xl ${cat.span} transition-all duration-500 ${cats.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${i * 120}ms`, minHeight: "220px" }}
              >
                <img
                  src={cat.img}
                  alt={cat.label}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                {/* Hover tint */}
                <div className="absolute inset-0 bg-amber-900/0 group-hover:bg-amber-900/15 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                  <p
                    className="text-white/50 text-[10px] tracking-widest uppercase mb-1 font-light"
                    style={{ fontFamily: "system-ui" }}
                  >
                    {cat.sub}
                  </p>
                  <h3 className="text-white text-2xl sm:text-3xl font-light mb-2">
                    {cat.label}
                  </h3>
                  <span
                    className="inline-flex items-center gap-2 text-white/50 group-hover:text-white/80 transition-colors text-xs"
                    style={{ fontFamily: "system-ui" }}
                  >
                    ดูทั้งหมด
                    <svg
                      className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ PRODUCT PICKS ━━━ */}
      <section
        ref={picks.ref as React.RefObject<HTMLElement>}
        id="picks"
        className="py-16 sm:py-24 px-6 sm:px-12 lg:px-20 bg-amber-950/[0.02]"
      >
        <div className="max-w-7xl mx-auto">
          <div
            className={`flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-10 sm:mb-14 transition-all duration-700 ${picks.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            <div>
              <p
                className="text-amber-800/50 text-[11px] tracking-[0.4em] uppercase mb-3"
                style={{ fontFamily: "system-ui" }}
              >
                Curated Picks
              </p>
              <h2 className="text-4xl sm:text-5xl font-light text-amber-950">
                แนะนำ<em className="not-italic font-semibold">สำหรับคุณ</em>
              </h2>
            </div>
            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-5 py-2 rounded-full text-sm transition-all duration-300 ${selectedCategory === cat.id ? "bg-amber-900 text-amber-50" : "bg-white border border-amber-900/15 text-amber-900/60 hover:border-amber-900/40 hover:text-amber-900/80"}`}
                  style={{ fontFamily: "system-ui" }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <p
            className="text-amber-900/30 text-xs mb-6"
            style={{ fontFamily: "system-ui" }}
          >
            {filtered.length} รายการ
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {filtered.map((item, i) => (
              <div
                key={item.id}
                className={`transition-all duration-500 ${picks.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <ProductCard {...item} onStockUpdate={handleStockUpdate} />
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p
                className="text-amber-900/25 text-sm"
                style={{ fontFamily: "system-ui" }}
              >
                ไม่พบสินค้า
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ━━━ STORY SECTION ━━━ */}
      <section
        ref={story.ref as React.RefObject<HTMLElement>}
        className="relative overflow-hidden bg-amber-900"
      >
        {/* Subtle grain texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
          }}
        />

        <div
          className={`relative max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-20 sm:py-32 grid lg:grid-cols-2 gap-12 lg:gap-24 items-center transition-all duration-1000 ${story.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="block w-6 h-px bg-amber-300/50" />
              <span
                className="text-amber-200/60 text-[11px] tracking-[0.4em] uppercase"
                style={{ fontFamily: "system-ui" }}
              >
                Our Story
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-light text-white leading-tight mb-6">
              อบด้วย
              <br />
              <em className="not-italic font-semibold">ความรัก</em>
            </h2>
            <p
              className="text-amber-100/60 text-base leading-relaxed max-w-md font-light"
              style={{ fontFamily: "system-ui" }}
            >
              ทุกชิ้นของขนมและเครื่องดื่มที่ My Bakery ถูกรังสรรค์ด้วยความใส่ใจ
              ส่วนผสมคุณภาพจากแหล่งที่เราไว้วางใจ
              เพื่อให้ทุกคำเป็นช่วงเวลาแห่งความสุข
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { val: "500+", label: "ลูกค้าที่ไว้ใจ" },
              { val: `${allProducts.length}+`, label: "เมนูให้เลือก" },
              { val: "100%", label: "วัตถุดิบสดใหม่" },
              { val: "7/7", label: "เปิดทุกวัน" },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-white/[0.06] border border-white/10 rounded-2xl p-6 sm:p-8 text-center backdrop-blur-sm"
              >
                <p className="text-3xl sm:text-4xl font-light text-white mb-1">
                  {s.val}
                </p>
                <p
                  className="text-amber-200/50 text-[11px] tracking-wider uppercase"
                  style={{ fontFamily: "system-ui" }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}