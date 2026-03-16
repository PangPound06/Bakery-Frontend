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

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    new Set(),
  );
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  const categories = [
    { id: "all", name: "ทั้งหมด" },
    { id: "bakery", name: "Bakery" },
    { id: "drink", name: "Drink" },
    { id: "cake", name: "Cake" },
  ];

  // ═══ Scrollytelling — Intersection Observer ═══
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
    );
    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, [loading]);

  const setRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };
  const visible = (id: string) => visibleSections.has(id);

  const getRandomItems = (arr: Product[], count: number) =>
    [...arr].sort(() => Math.random() - 0.5).slice(0, count);
  const getRandomProductsByCategory = (products: Product[]) => {
    const b = products.filter((p) => p.category?.toLowerCase() === "bakery");
    const c = products.filter((p) => p.category?.toLowerCase() === "cake");
    const d = products.filter((p) => p.category?.toLowerCase() === "drink");
    return [
      ...getRandomItems(b, 4),
      ...getRandomItems(c, 4),
      ...getRandomItems(d, 4),
    ].sort(() => Math.random() - 0.5);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(
        "https://bakery-backend-production-6fc9.up.railway.app/api/products",
      );
      if (res.ok) {
        const data = await res.json();
        const fmt = data.map((item: any) => ({
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
        setDisplayProducts(getRandomProductsByCategory(fmt));
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
        const fmt = data.map((item: any) => ({
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
          prev.map((p) => {
            const u = fmt.find((i: Product) => i.id === p.id);
            return u || p;
          }),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredProducts =
    selectedCategory === "all"
      ? displayProducts
      : displayProducts.filter(
          (p) => p.category?.toLowerCase() === selectedCategory,
        );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border border-stone-300 rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-1 border-2 border-stone-800 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-stone-400 tracking-[0.3em] text-[10px] uppercase">
            Loading
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-[#faf8f5] min-h-screen"
      style={{ fontFamily: "'Prompt', sans-serif" }}
    >
      {/* ━━━ HERO ━━━ */}
      <section
        id="hero"
        ref={setRef("hero")}
        className="relative h-[92vh] overflow-hidden"
      >
        <img
          src="https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=1600&q=80"
          alt="Bakery"
          className="w-full h-full object-cover"
          style={{
            transform: visible("hero") ? "scale(1)" : "scale(1.05)",
            transition: "transform 8000ms ease-out",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-transparent to-[#faf8f5]" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-950/30 to-transparent" />

        <div
          className={`absolute inset-0 flex flex-col justify-end pb-16 sm:pb-24 px-5 sm:px-8 lg:px-16 transition-all duration-[1200ms] ease-out ${visible("hero") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-8 h-px bg-amber-200/70" />
              <span className="text-amber-100/80 text-[11px] tracking-[0.4em] uppercase">
                Est. 2024 · Bangkok
              </span>
            </div>
            <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-extralight text-white leading-[0.85] mb-4 sm:mb-6">
              My
              <br />
              <span className="font-semibold">Bakery</span>
            </h1>
            <p className="text-white/70 text-sm sm:text-base max-w-sm leading-relaxed mb-8 sm:mb-10">
              อบสดใหม่ทุกวัน ด้วยส่วนผสมคัดสรร
              <br className="hidden sm:block" />
              เพราะทุกคำควรเป็นความสุข
            </p>
            <div className="flex items-center gap-6">
              <button
                onClick={() =>
                  document
                    .getElementById("bento")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="px-7 py-3 bg-amber-50 text-amber-900 text-sm tracking-wider rounded-full hover:bg-white transition-all duration-300 hover:scale-[1.03]"
              >
                สำรวจเมนู
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("bento")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="group flex items-center gap-3 text-white/60 hover:text-white/90 transition-colors text-sm"
              >
                <span className="w-10 h-px bg-white/30 group-hover:w-16 transition-all duration-700" />
                <svg
                  className="w-3.5 h-3.5 group-hover:translate-y-1 transition-transform duration-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ INTRO STRIP ━━━ */}
      <section
        id="intro"
        ref={setRef("intro")}
        className="py-10 sm:py-14 px-5 sm:px-8 lg:px-16 border-b border-amber-900/8"
      >
        <div
          className={`max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-700 ${visible("intro") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <p className="text-amber-900/50 text-sm sm:text-base leading-relaxed text-center sm:text-left max-w-md">
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
                <p className="text-amber-900/40 text-[10px] tracking-wider uppercase mt-0.5">
                  {l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ BENTO CATEGORY GRID ━━━ */}
      <section
        id="bento"
        ref={setRef("bento")}
        className="px-4 sm:px-6 lg:px-12 py-16 sm:py-24"
      >
        <div
          className={`max-w-7xl mx-auto transition-all duration-[1000ms] delay-100 ${visible("bento") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="mb-10 sm:mb-14">
            <p className="text-stone-400 tracking-[0.3em] text-[10px] uppercase mb-2">
              Browse
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extralight text-stone-800">
              เลือกตาม<span className="font-semibold">หมวดหมู่</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                id: "bakery",
                label: "Bakery",
                sub: "ขนมปัง · ครัวซองค์",
                img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80",
              },
              {
                id: "drink",
                label: "Drink",
                sub: "กาแฟ · สมูทตี้",
                img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80",
              },
              {
                id: "cake",
                label: "Cake",
                sub: "เค้ก · บราวนี่",
                img: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80",
              },
            ].map((cat, i) => (
              <a
                key={cat.id}
                href={`/${cat.id}`}
                className={`group relative overflow-hidden rounded-2xl ${i === 0 ? "col-span-2 row-span-2 h-[320px] sm:h-[420px]" : "h-[200px] sm:h-[200px]"}`}
              >
                <img
                  src={cat.img}
                  alt={cat.label}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute inset-0 bg-amber-900/0 group-hover:bg-amber-900/15 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                  <p className="text-white/50 text-[10px] tracking-widest uppercase mb-0.5">
                    {cat.sub}
                  </p>
                  <h3
                    className={`font-semibold text-white ${i === 0 ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"}`}
                  >
                    {cat.label}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-white/50 group-hover:text-white/80 transition-colors duration-500">
                    <span className="text-xs">ดูทั้งหมด</span>
                    <svg
                      className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-500"
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
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ PRODUCTS ━━━ */}
      <section
        id="products"
        ref={setRef("products")}
        className="px-4 sm:px-6 lg:px-12 pb-16 sm:pb-24"
      >
        <div
          className={`max-w-7xl mx-auto transition-all duration-[1000ms] delay-200 ${visible("products") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5 mb-8 sm:mb-12">
            <div>
              <p className="text-stone-400 tracking-[0.3em] text-[10px] uppercase mb-2">
                Curated
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extralight text-stone-800">
                แนะนำ<span className="font-semibold">สำหรับคุณ</span>
              </h2>
              <p className="text-stone-400 text-xs mt-1.5">
                {filteredProducts.length} รายการ
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-5 py-2 rounded-full text-sm transition-all duration-300 ${
                    selectedCategory === cat.id
                      ? "bg-amber-900 text-amber-50"
                      : "bg-white text-stone-500 hover:text-stone-700 border border-stone-200 hover:border-stone-400"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((item, i) => (
              <div
                key={item.id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <ProductCard {...item} onStockUpdate={handleStockUpdate} />
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-stone-300 text-sm">ไม่พบสินค้า</p>
            </div>
          )}
        </div>
      </section>

      {/* ━━━ STORY ━━━ */}
      <section
        id="story"
        ref={setRef("story")}
        className="relative bg-amber-900 overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 0.5px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div
          className={`relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-16 py-20 sm:py-28 transition-all duration-[1000ms] delay-200 ${visible("story") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="block w-6 h-px bg-amber-300/50" />
                <p className="text-amber-200/60 tracking-[0.4em] text-[10px] uppercase">
                  Our Story
                </p>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extralight text-white leading-tight mb-6">
                อบด้วย<span className="font-semibold">ความรัก</span>
                <br />
                ทุกวัน
              </h2>
              <p className="text-amber-100/60 text-sm leading-relaxed max-w-md">
                ทุกชิ้นของขนมและเครื่องดื่มที่ My Bakery
                ถูกรังสรรค์ด้วยความใส่ใจ ส่วนผสมคุณภาพจากแหล่งที่เราไว้วางใจ
                เพื่อให้ทุกคำเป็นช่วงเวลาแห่งความสุข
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { val: "500+", label: "ลูกค้าที่ไว้ใจ" },
                { val: `${allProducts.length}+`, label: "เมนูให้เลือก" },
                { val: "100%", label: "วัตถุดิบสดใหม่" },
                { val: "7/7", label: "เปิดทุกวัน" },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-5 sm:p-7 text-center border bg-white/[0.02] border-white/10 backdrop-blur-sm"
                >
                  <p className="text-2xl sm:text-3xl font-extralight text-white mb-0.5">
                    {stat.val}
                  </p>
                  <p className="text-amber-200/50 text-[10px] tracking-wider uppercase">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out both;
        }
      `}</style>
    </div>
  );
}
