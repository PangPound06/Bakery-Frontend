"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link"; // ใช้ Link สำหรับ Next.js
import ProductCard from "@/components/ui/ProductCard";
import PopularCarousel from "@/components/ui/PopularCarousel";

// ━━━ TYPES ━━━
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
  options?: string | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

// Hero images per category slug (fallback for new categories)
const HERO_IMAGES: Record<string, string> = {
  // "/images/hero/category.jpg", สำหรับรูปภาพที่มาจากเครื่อง อยยู่ใน public/images/hero/
  bakery: "/images/hero/Bakery.jpg",
  cake: "/images/hero/Cake.jpg",
  drink: "/images/hero/Drink.jpg",
  food: "/images/hero/Food.jpg",
  appetizer: "/images/hero/Appetizer.jpg",
  // ใส่เพิ่มตรงนี้ได้เลยถ้ามีหมวดใหม่
};

// ━━━ COMPONENTS ━━━
function BentoGrid({ categories }: { categories: Category[] }) {
  const FALLBACK =
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/${cat.slug}`}
          className="group relative overflow-hidden rounded-3xl h-[280px] sm:h-[360px] lg:h-[420px]"
        >
          <img
            src={HERO_IMAGES[cat.slug] || FALLBACK}
            alt={cat.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
          <div className="absolute inset-0 bg-amber-900/0 group-hover:bg-amber-900/15 transition-colors duration-500" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <h3 className="font-semibold text-white text-3xl sm:text-4xl">
              {cat.icon} {cat.name}
            </h3>
            <div className="mt-2 flex items-center gap-2 text-white/60 group-hover:text-white/90 transition-colors duration-500">
              <span className="text-sm">ดูทั้งหมด</span>
              <svg
                className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-500"
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
        </Link>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]); // สำหรับหน้าแรกสุ่ม
  const [loading, setLoading] = useState(true);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    new Set(),
  );
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);

  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // ━━━ FETCH LOGIC ━━━
  const formatProductData = (data: any[]): Product[] => {
    return data.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type || "Other",
      category: item.category,
      price: item.price,
      img: item.image,
      description: item.description,
      stockQuantity: item.stockQuantity,
      isAvailable: item.isAvailable,
      options: item.options ?? null,
    }));
  };

  const getRandomItems = (arr: Product[], count: number) =>
    [...arr].sort(() => Math.random() - 0.5).slice(0, count);

  const getRandomProductsByCategory = useCallback((products: Product[]) => {
    const uniqueCategories = [
      ...new Set(products.map((p) => p.category?.toLowerCase())),
    ];
    return uniqueCategories
      .flatMap((cat) =>
        getRandomItems(
          products.filter((p) => p.category?.toLowerCase() === cat),
          4,
        ),
      )
      .sort(() => Math.random() - 0.5);
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, catRes, topRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories/active`),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/orders/stats/top-products?days=all`,
        ),
      ]);

      let fmt: Product[] = [];
      if (prodRes.ok) {
        const data = await prodRes.json();
        fmt = formatProductData(data);
        setAllProducts(fmt);
        setDisplayProducts(getRandomProductsByCategory(fmt));
      }
      if (catRes.ok) {
        setCategoryList(await catRes.json());
      }
      // เมนูยอดนิยม: เอาอันดับจาก top-products มา match สินค้าจริง (เอารูป/ราคา)
      if (topRes.ok && fmt.length > 0) {
        const topData = await topRes.json();
        const tops: { productName: string }[] = topData.topProducts || [];
        const seen = new Set<string>();
        const pop: Product[] = [];
        for (const t of tops) {
          const m = fmt.find((p) => p.name === t.productName);
          if (
            m &&
            !seen.has(m.name) &&
            m.isAvailable &&
            (m.stockQuantity > 0 || m.stockQuantity === 9999)
          ) {
            seen.add(m.name);
            pop.push(m);
          }
          if (pop.length >= 10) break;
        }
        setPopularProducts(pop);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [getRandomProductsByCategory]);

  const handleStockUpdate = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products`,
      );
      if (res.ok) {
        const data = await res.json();
        const fmt = formatProductData(data);
        setAllProducts(fmt);
        // อัปเดตข้อมูลใน displayProducts ที่แสดงอยู่ด้วย
        setDisplayProducts((prev) =>
          prev.map((p) => fmt.find((i) => i.id === p.id) || p),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ━━━ SCROLL OBSERVER ━━━
  useEffect(() => {
    if (loading) return;

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

    const currentRefs = sectionRefs.current;
    Object.values(currentRefs).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [loading]);

  const setRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  const visible = (id: string) => visibleSections.has(id);

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
      className="bg-amber-50 min-h-screen"
      style={{ fontFamily: "'Prompt', sans-serif" }}
    >
      {/* HERO SECTION */}
      <section
        id="hero"
        ref={setRef("hero")}
        className="relative h-[92vh] overflow-hidden"
      >
        <img
          src="https://www.orchardhotel.com.au/wp-content/uploads/2024/10/The-Orchard-Hotel-Chatswood-Restaurant-Bar-48.jpg"
          alt="Bakery Hero"
          className="w-full h-full object-cover"
          style={{
            transform: visible("hero") ? "scale(1)" : "scale(1.05)",
            transition: "transform 8000ms ease-out",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-transparent to-[#faf8f5]" />

        <div
          className={`absolute inset-0 flex flex-col justify-end pb-16 sm:pb-24 px-5 sm:px-8 lg:px-16 transition-all duration-[1200ms] ease-out ${visible("hero") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-8 h-px bg-amber-200/70" />
              <span className="text-amber-900 text-[11px] tracking-[0.4em] uppercase">
                Est. 2026 · Bangkok
              </span>
            </div>
            <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-extralight text-amber-700/80 leading-[0.85] mb-4 sm:mb-6">
              Pound
              <br />
              <span className="font-semibold">Bakery</span>
            </h1>
            <p className="text-amber-800/70 text-sm sm:text-base max-w-sm leading-relaxed mb-8 sm:mb-10">
              อบสดใหม่ทุกวัน ด้วยส่วนผสมคัดสรร เพราะทุกคำควรเป็นความสุข
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
            </div>
          </div>
        </div>
      </section>

      {/* INTRO STRIP */}
      <section
        id="intro"
        ref={setRef("intro")}
        className="py-10 sm:py-14 px-5 sm:px-8 lg:px-16 border-b border-amber-900/8"
      >
        <div
          className={`max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-700 ${visible("intro") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <p className="text-amber-900/50 text-sm sm:text-base text-center sm:text-left max-w-md">
            เบเกอรี่ เครื่องดื่ม เค้กสุดพิเศษ และอาหารนานาชาติ —
            เลือกสรรวัตถุดิบทุกชิ้นด้วยมือ
          </p>
          <div className="flex items-center gap-8 text-center">
            {[
              [`${allProducts.length}+`, "เมนู"],
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

      {/* BENTO GRID */}
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
          <BentoGrid categories={categoryList} />
        </div>
      </section>

      {/* POPULAR (เมนูยอดนิยม) */}
      {popularProducts.length > 0 && (
        <section
          id="popular"
          ref={setRef("popular")}
          className="px-4 sm:px-6 lg:px-12 pb-4 sm:pb-10"
        >
          <div
            className={`max-w-7xl mx-auto transition-all duration-[1000ms] ${visible("popular") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            <div className="mb-8 sm:mb-10">
              <p className="text-stone-400 tracking-[0.3em] text-[10px] uppercase mb-2">
                Trending
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extralight text-stone-800">
                เมนู<span className="font-semibold">ยอดนิยม</span>
              </h2>
            </div>
            <PopularCarousel
              items={popularProducts}
              onStockUpdate={handleStockUpdate}
            />
          </div>
        </section>
      )}

      {/* STORY SECTION */}
      <section
        id="story"
        ref={setRef("story")}
        className="relative bg-amber-50 overflow-hidden py-20 sm:py-28"
      >
        <div
          className={`relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-16 transition-all duration-[1000ms] ${visible("story") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-5xl font-extralight text-amber-700 leading-tight mb-6">
                อบด้วย<span className="font-semibold">ความรัก</span> ทุกวัน
              </h2>
              <p className="text-amber-700 text-sm leading-relaxed max-w-md">
                ทุกชิ้นของขนม เครื่องดื่ม และอาหารที่ Pound Bakery
                ถูกรังสรรค์ด้วยความใส่ใจ
                เพื่อให้ทุกคำเป็นช่วงเวลาแห่งความสุขของคุณ
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { v: "500+", l: "ลูกค้า" },
                { v: `${allProducts.length}+`, l: "เมนู" },
                { v: "100%", l: "สดใหม่" },
                { v: "7/7", l: "บริการ" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-6 text-center border border-amber-900/80 bg-amber-100/[0.02] backdrop-blur-sm"
                >
                  <p className="text-2xl font-light text-amber-700">{s.v}</p>
                  <p className="text-amber-500 text-[10px] tracking-wider uppercase">
                    {s.l}
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