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
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
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
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    Object.values(sectionRefs.current).forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, [loading]);

  const setRef = (id: string) => (el: HTMLElement | null) => { sectionRefs.current[id] = el; };
  const visible = (id: string) => visibleSections.has(id);

  const getRandomItems = (arr: Product[], count: number) => [...arr].sort(() => Math.random() - 0.5).slice(0, count);
  const getRandomProductsByCategory = (products: Product[]) => {
    const b = products.filter((p) => p.category?.toLowerCase() === "bakery");
    const c = products.filter((p) => p.category?.toLowerCase() === "cake");
    const d = products.filter((p) => p.category?.toLowerCase() === "drink");
    return [...getRandomItems(b, 4), ...getRandomItems(c, 4), ...getRandomItems(d, 4)].sort(() => Math.random() - 0.5);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/products");
      if (res.ok) {
        const data = await res.json();
        const fmt = data.map((item: any) => ({
          id: item.id, name: item.name, type: item.type || "Other",
          category: item.category, price: item.price, img: item.image,
          description: item.description, stockQuantity: item.stockQuantity, isAvailable: item.isAvailable,
        }));
        setAllProducts(fmt);
        setDisplayProducts(getRandomProductsByCategory(fmt));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleStockUpdate = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/products");
      if (res.ok) {
        const data = await res.json();
        const fmt = data.map((item: any) => ({
          id: item.id, name: item.name, type: item.type || "Other",
          category: item.category, price: item.price, img: item.image,
          description: item.description, stockQuantity: item.stockQuantity, isAvailable: item.isAvailable,
        }));
        setAllProducts(fmt);
        setDisplayProducts((prev) => prev.map((p) => { const u = fmt.find((i: Product) => i.id === p.id); return u || p; }));
      }
    } catch (e) { console.error(e); }
  };

  const filteredProducts = selectedCategory === "all"
    ? displayProducts
    : displayProducts.filter((p) => p.category?.toLowerCase() === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border border-stone-300 rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-1 border-2 border-stone-800 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-stone-400 tracking-[0.3em] text-[10px] uppercase">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 via-orange-50 min-h-screen" style={{ fontFamily: "'Prompt', sans-serif" }}>

      {/* ━━━━━ HERO ━━━━━ */}
      <section id="hero" ref={setRef("hero")} className="relative h-[92vh] overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=1600&q=80" alt="Bakery" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-stone-50"></div>
        </div>

        <div className={`relative h-full flex flex-col justify-end pb-16 sm:pb-24 px-5 sm:px-8 lg:px-16 transition-all duration-[1200ms] ease-out ${visible("hero") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="max-w-2xl">
            <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-extralight text-black/50 leading-[0.85] mb-4 sm:mb-6">
              My<br /><span className="font-semibold">Bakery</span>
            </h1>
            <p className="text-black text-sm sm:text-base max-w-sm leading-relaxed mb-8 sm:mb-10">
              อบสดใหม่ทุกวัน ด้วยส่วนผสมคัดสรร<br className="hidden sm:block" />เพราะทุกคำควรเป็นความสุข
            </p>
            <button
              onClick={() => document.getElementById("bento")?.scrollIntoView({ behavior: "smooth" })}
              className="group flex items-center gap-4 text-black/70 hover:text-stone-800 transition-colors duration-500"
            >
              <span className="text-xs tracking-[0.25em] uppercase">สำรวจเมนู</span>
              <span className="w-10 h-[0.5px] bg-white/40 group-hover:w-16 transition-all duration-700"></span>
              <svg className="w-3.5 h-3.5 group-hover:translate-y-1 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ━━━━━ BENTO CATEGORY GRID ━━━━━ */}
      <section id="bento" ref={setRef("bento")} className="px-4 sm:px-6 lg:px-12 py-16 sm:py-24">
        <div className={`max-w-7xl mx-auto transition-all duration-[1000ms] delay-100 ${visible("bento") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="mb-10 sm:mb-14">
            <p className="text-stone-400 tracking-[0.3em] text-[10px] uppercase mb-2">Browse</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extralight text-stone-800">
              เลือกตาม<span className="font-semibold">หมวดหมู่</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { id: "bakery", label: "Bakery", sub: "ขนมปัง · ครัวซองค์", img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80", tall: true },
              { id: "drink", label: "Drink", sub: "กาแฟ · สมูทตี้", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80", tall: false },
              { id: "cake", label: "Cake", sub: "เค้ก · บราวนี่", img: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80", tall: false },
            ].map((cat, i) => (
              <a
                key={cat.id}
                href={`/${cat.id}`}
                className={`group relative overflow-hidden rounded-2xl ${i === 0 ? "col-span-2 row-span-2 h-[320px] sm:h-[420px]" : "h-[200px] sm:h-[200px]"}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <img src={cat.img} alt={cat.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                  <p className="text-white/50 text-[10px] tracking-widest uppercase mb-0.5">{cat.sub}</p>
                  <h3 className={`font-semibold text-white ${i === 0 ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"}`}>{cat.label}</h3>
                  <div className="mt-2 flex items-center gap-2 text-white/50 group-hover:text-white/80 transition-colors duration-500">
                    <span className="text-xs">ดูทั้งหมด</span>
                    <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━ PRODUCTS ━━━━━ */}
      <section id="products" ref={setRef("products")} className="px-4 sm:px-6 lg:px-12 pb-16 sm:pb-24">
        <div className={`max-w-7xl mx-auto transition-all duration-[1000ms] delay-200 ${visible("products") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5 mb-8 sm:mb-12">
            <div>
              <p className="text-stone-400 tracking-[0.3em] text-[10px] uppercase mb-2">Curated</p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extralight text-stone-800">
                แนะนำ<span className="font-semibold">สำหรับคุณ</span>
              </h2>
              <p className="text-stone-400 text-xs mt-1.5">{filteredProducts.length} รายการ</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-8 py-3 rounded-full font-medium transition-all duration-300 ${
                    selectedCategory === cat.id
                      ? "bg-stone-800 text-white"
                      : "bg-white text-stone-500 hover:text-stone-700 border border-stone-200 hover:border-stone-300"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((item, i) => (
              <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
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

      {/* ━━━━━ STORY — Scrollytelling ━━━━━ */}
      <section id="story" ref={setRef("story")} className="relative bg-amber-900 overflow-hidden">
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 0.5px, transparent 0)", backgroundSize: "32px 32px" }}></div>

        <div className={`relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-16 py-20 sm:py-28 transition-all duration-[1000ms] delay-200 ${visible("story") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="text-white tracking-[0.4em] text-[10px] uppercase mb-3">Our Story</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extralight text-white leading-tight mb-6">
                อบด้วย<span className="font-semibold">ความรัก</span><br />ทุกวัน
              </h2>
              <p className="text-white text-sm leading-relaxed max-w-md">
                ทุกชิ้นของขนมและเครื่องดื่มที่ My Bakery ถูกรังสรรค์ด้วยความใส่ใจ
                ส่วนผสมคุณภาพจากแหล่งที่เราไว้วางใจ เพื่อให้ทุกคำเป็นช่วงเวลาแห่งความสุข
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { val: "500+", label: "ลูกค้าที่ไว้ใจ", accent: true },
                { val: `${allProducts.length}+`, label: "เมนูให้เลือก", accent: false },
                { val: "100%", label: "วัตถุดิบสดใหม่", accent: false },
                { val: "7/7", label: "เปิดทุกวัน", accent: true },
              ].map((stat, i) => (
                <div
                  key={i}
                  className={`rounded-2xl p-5 sm:p-7 text-center border ${
                    stat.accent
                      ? "bg-white/[0.02] border-white/10 backdrop-blur-sm"
                      : "bg-white/[0.02] border-white/5"
                  }`}
                >
                  <p className="text-2xl sm:text-3xl font-extralight text-white mb-0.5">{stat.val}</p>
                  <p className="text-white text-[10px] tracking-wider uppercase">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CSS animation for staggered fade in */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out both;
        }
      `}</style>
    </div>
  );
}