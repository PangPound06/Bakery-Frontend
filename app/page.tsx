"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link"; // ใช้ Link สำหรับ Next.js
import ProductCard from "@/components/ui/ProductCard";

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
  // สมมติ bakery: "/folder/image.jpg", สำหรับรูปภาพที่มาจากเครื่อง
  bakery: "/images/hero/bakery.jpg",
  cake: "/images/hero/cake.jpg",
  drink: "/images/hero/drink.jpg",
  food: "/images/hero/food.jpg",
  appetizer: "/images/hero/appetizer.jpg",
  // ใส่เพิ่มตรงนี้ได้เลยถ้ามีหมวดใหม่
};

// ━━━ COMPONENTS ━━━
function BentoGrid({ categories }: { categories: Category[] }) {
  // คำนวณ: ตัวแรกใช้ 4 ช่อง, ที่เหลือใช้ 1 ช่อง
  // แถวละ 4 ช่อง → หาว่าแถวสุดท้ายมีกี่ช่องว่าง แล้วกระจายให้ตัวท้ายๆ
  const rest = categories.slice(1);
  const restCount = rest.length;
  // ช่องที่ใช้ทั้งหมด: Bakery (4) + ที่เหลือ
  // แถวที่ 1-2: Bakery กิน 4 ช่อง (col-span-2 row-span-2) + ข้างขวา 2 ช่อง x 2 แถว = 4 ช่อง
  // ดังนั้นแถว 1-2 รับได้ 4 ตัว (ไม่รวม Bakery)
  // แถวถัดๆ ไป: แถวละ 4 ช่อง

  const rightSide = Math.min(restCount, 4); // ตัวที่อยู่ข้างขวา Bakery (แถว 1-2)
  const bottomItems = rest.slice(rightSide); // ตัวที่อยู่แถวล่าง

  // คำนวณ span สำหรับแถวล่าง: กระจายให้เต็ม 4 ช่อง
  const getBottomSpans = (items: Category[]): number[] => {
    if (items.length === 0) return [];
    const count = items.length;
    // หาว่าต้องกี่แถว
    const rows = Math.ceil(count / 4);
    const totalSlots = rows * 4;
    const extraSlots = totalSlots - count;

    // กระจาย extra ให้ตัวท้ายๆ ของแต่ละแถว
    const spans = new Array(count).fill(1);

    // แจก extra slots ให้ items ตัวสุดท้ายของแต่ละแถว
    let distributed = 0;
    for (let r = rows - 1; r >= 0 && distributed < extraSlots; r--) {
      // หา index ของตัวสุดท้ายในแถวนี้
      const rowEnd = Math.min((r + 1) * 4, count) - 1;
      const canAdd = Math.min(3, extraSlots - distributed); // col-span สูงสุด 4
      spans[rowEnd] += canAdd;
      distributed += canAdd;
    }

    return spans;
  };

  const bottomSpans = getBottomSpans(bottomItems);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {/* Bakery — ตัวแรก ใหญ่สุด */}
      {categories.length > 0 && (
        <Link
          key={categories[0].id}
          href={`/${categories[0].slug}`}
          className="group relative overflow-hidden rounded-2xl col-span-2 md:row-span-2 h-[200px] sm:h-[280px] md:h-[420px]"
        >
          <img
            src={HERO_IMAGES[categories[0].slug] || HERO_IMAGES.bakery}
            alt={categories[0].name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-0 bg-amber-900/0 group-hover:bg-amber-900/15 transition-colors duration-500" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <h3 className="font-semibold text-white text-2xl sm:text-3xl">
              {categories[0].icon} {categories[0].name}
            </h3>
            <div className="mt-1.5 flex items-center gap-2 text-white/50 group-hover:text-white/80 transition-colors duration-500">
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
        </Link>
      )}

      {/* ข้างขวา Bakery (แถว 1-2) — สูงสุด 4 ตัว */}
      {rest.slice(0, rightSide).map((cat) => (
        <Link
          key={cat.id}
          href={`/${cat.slug}`}
          className="group relative overflow-hidden rounded-2xl h-[155px] sm:h-[202px]"
        >
          <img
            src={
              HERO_IMAGES[cat.slug] ||
              "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80"
            }
            alt={cat.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-0 bg-amber-900/0 group-hover:bg-amber-900/15 transition-colors duration-500" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
            <h3 className="font-semibold text-white text-lg sm:text-xl">
              {cat.icon} {cat.name}
            </h3>
            <div className="mt-1.5 flex items-center gap-2 text-white/50 group-hover:text-white/80 transition-colors duration-500">
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
        </Link>
      ))}

      {/* แถวล่าง — กระจายเต็ม 4 ช่อง */}
      {bottomItems.map((cat, i) => (
        <Link
          key={cat.id}
          href={`/${cat.slug}`}
          className={`group relative overflow-hidden rounded-2xl h-[160px] sm:h-[200px] ${bottomSpans[i] >= 3 ? "md:col-span-3" : bottomSpans[i] === 2 ? "md:col-span-2" : ""}`}
        >
          <img
            src={
              HERO_IMAGES[cat.slug] ||
              "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80"
            }
            alt={cat.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-0 bg-amber-900/0 group-hover:bg-amber-900/15 transition-colors duration-500" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
            <h3 className="font-semibold text-white text-lg sm:text-xl">
              {cat.icon} {cat.name}
            </h3>
            <div className="mt-1.5 flex items-center gap-2 text-white/50 group-hover:text-white/80 transition-colors duration-500">
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
        </Link>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]); // สำหรับหน้าแรกสุ่ม
  const [loading, setLoading] = useState(true);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    new Set(),
  );
  const [categoryList, setCategoryList] = useState<Category[]>([]);

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
      const [prodRes, catRes] = await Promise.all([
        fetch("http://${process.env.NEXT_PUBLIC_API_URL}/api/products"),
        fetch("http://${process.env.NEXT_PUBLIC_API_URL}/api/categories/active"),
      ]);

      if (prodRes.ok) {
        const data = await prodRes.json();
        const fmt = formatProductData(data);
        setAllProducts(fmt);
        setDisplayProducts(getRandomProductsByCategory(fmt));
      }
      if (catRes.ok) {
        setCategoryList(await catRes.json());
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
      const res = await fetch("http://${process.env.NEXT_PUBLIC_API_URL}/api/products");
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

  // ━━━ FILTERING ━━━
  // ถ้าเลือก "ทั้งหมด" ให้ใช้ displayProducts (ที่สุ่มมา)
  // แต่ถ้าเลือกหมวดหมู่เจาะจง ให้กรองจาก allProducts เพื่อให้เห็นครบทุกชิ้น
  const filteredProducts =
    selectedCategory === "all"
      ? displayProducts
      : allProducts.filter(
          (p) => p.category?.toLowerCase() === selectedCategory,
        );

  const categoriesTab = [
    { id: "all", name: "ทั้งหมด" },
    ...categoryList.map((c) => ({ id: c.slug, name: c.name })),
  ];

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

      {/* PRODUCT LIST */}
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
            </div>
            <div className="flex gap-2 flex-wrap">
              {categoriesTab.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-5 py-2 rounded-full text-sm transition-all duration-300 ${
                    selectedCategory === cat.id
                      ? "bg-amber-900 text-amber-50"
                      : "bg-white text-stone-500 hover:text-stone-700 border border-stone-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((item, i) => (
              <div
                key={item.id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <ProductCard {...item} onStockUpdate={handleStockUpdate} />
              </div>
            ))}
          </div>
        </div>
      </section>

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
