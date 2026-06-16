"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import ProductCard from "@/components/ui/ProductCard";

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
  displayOrder: number;
  isActive: boolean;
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

// เรื่องเล่าประจำแต่ละหมวด (เล่าความเป็นมา สไตล์ storytelling)
const CATEGORY_STORY: Record<
  string,
  {
    tagline: string;
    title: string;
    body: string;
    highlight: string;
    highlightBody: string;
  }
> = {
  bakery: {
    tagline: "FRESHLY BAKED",
    title: "อบสดใหม่ทุกเช้า ด้วยมือ",
    body: "ขนมปังและเพสตรีทุกชิ้นของเรานวด พัก และอบใหม่ทุกเช้า คัดแป้งและเนยคุณภาพ เพื่อกลิ่นหอมและเนื้อสัมผัสที่ดีที่สุดในทุกคำ",
    highlight: "เพราะขนมปังที่ดี เริ่มจากความใส่ใจตั้งแต่ก้อนแป้ง",
    highlightBody: "ไม่มีทางลัด มีแต่เวลาและความตั้งใจ",
  },
  cake: {
    tagline: "MADE TO CELEBRATE",
    title: "เค้กสำหรับทุกช่วงเวลาพิเศษ",
    body: "ตั้งแต่เลเยอร์เค้กเนื้อนุ่มไปจนถึงชีสเค้กเนียนละมุน เรารังสรรค์ทุกชิ้นให้สวยและอร่อยสมการเฉลิมฉลอง ไม่ว่าจะวันเกิด วันครบรอบ หรือวันธรรมดาที่อยากให้พิเศษ",
    highlight: "ทุกชิ้นคือความสุขที่ตัดแบ่งกันได้",
    highlightBody: "หวานกำลังดี สวยกำลังงาม",
  },
  drink: {
    tagline: "SIP & RELAX",
    title: "เครื่องดื่มที่ใช่ ในทุกอารมณ์",
    body: "ตั้งแต่กาแฟคั่วสด ชาหอมกลมกล่อม ไปจนถึงเครื่องดื่มเย็นชื่นใจ เราคัดเมล็ดและวัตถุดิบอย่างพิถีพิถัน เพื่อจิบแรกที่ลงตัวและจิบสุดท้ายที่ยังประทับใจ",
    highlight: "ช้าลงสักครู่ แล้วดื่มด่ำกับแก้วโปรดของคุณ",
    highlightBody: "ทุกแก้วชงสดเพื่อคุณ",
  },
  food: {
    tagline: "REAL, HEARTY FOOD",
    title: "อิ่มอร่อย ด้วยวัตถุดิบคัดสรร",
    body: "จานอาหารของเราปรุงจากวัตถุดิบสดใหม่ คัดเลือกอย่างตั้งใจ ตั้งแต่จานเบาๆ ไปจนถึงมื้อเต็มอิ่ม เพื่อความอร่อยที่จริงใจในทุกคำ",
    highlight: "อาหารดีๆ ทำให้ทุกวันดีขึ้น",
    highlightBody: "สดใหม่ ปรุงเมื่อสั่ง",
  },
  appetizer: {
    tagline: "SHARE THE JOY",
    title: "ของทานเล่น ที่แชร์กันได้ทั้งโต๊ะ",
    body: "ของว่างกรอบนอกนุ่มใน เสิร์ฟร้อนๆ พร้อมซอสเด็ด เหมาะกับการแบ่งปันความอร่อยกับคนที่คุณรักในทุกช่วงเวลาดีๆ",
    highlight: "ความอร่อยยิ่งแชร์ ยิ่งสนุก",
    highlightBody: "เสิร์ฟร้อน อร่อยทันที",
  },
};

const RESERVED_PATHS = [
  "bill",
  "order-detail",
  "cart",
  "checkout",
  "login",
  "profile",
  "register",
  "order-mode",
  "qr-code",
];

export default function CategoryPage() {
  const params = useParams();
  const categorySlug = params.category as string;
  const router = useRouter();

  // ✅ เช็คก่อนเลย ถ้าเป็น reserved path
  const isReserved = RESERVED_PATHS.includes(categorySlug);

  const [categoryInfo, setCategoryInfo] = useState<Category | null>(null);
  const [selectedType, setSelectedType] = useState<string>("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);

  // ✅ Redirect ถ้าเป็น reserved path
  useEffect(() => {
    if (isReserved) {
      window.location.href = `/${categorySlug}`;
    }
  }, [isReserved, categorySlug]);

  useEffect(() => {
    if (isReserved) return; // ← ไม่ fetch ถ้าเป็น reserved
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.target === heroRef.current && e.isIntersecting)
            setHeroVisible(true);
          if (e.target === contentRef.current && e.isIntersecting)
            setContentVisible(true);
        }),
      { threshold: 0.1 },
    );
    if (heroRef.current) obs.observe(heroRef.current);
    if (contentRef.current) obs.observe(contentRef.current);
    return () => obs.disconnect();
  }, [loading, isReserved]);

  useEffect(() => {
    if (isReserved) return; // ← ไม่ fetch ถ้าเป็น reserved
    const fetchCategory = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/categories`,
        );
        if (res.ok) {
          const cats: Category[] = await res.json();
          const found = cats.find((c) => c.slug === categorySlug);
          if (found) setCategoryInfo(found);
          else setNotFoundState(true);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchCategory();
  }, [categorySlug, isReserved]);

  useEffect(() => {
    if (categoryInfo) {
      document.title = `${categoryInfo.name} - PoundBakery`;
    }
  }, [categoryInfo]);

  const fetchProducts = async () => {
    if (isReserved) return; // ← ไม่ fetch ถ้าเป็น reserved
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products/category/${categorySlug}`,
      );
      if (response.ok) {
        const data = await response.json();
        setProducts(
          data.map((item: any) => ({
            id: item.id,
            name: item.name,
            type: item.type || "Other",
            category: item.category,
            price: item.price,
            img: item.image,
            description: item.description,
            stockQuantity: item.stockQuantity,
            isAvailable: item.isAvailable,
            options: item.options,
          })),
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReserved) return; // ← ไม่ fetch ถ้าเป็น reserved
    fetchProducts();
    const interval = setInterval(() => fetchProducts(), 2000);
    return () => clearInterval(interval);
  }, [categorySlug, isReserved]);

  // ✅ แสดง loading spinner ขณะ redirect
  if (isReserved) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFoundState) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold text-amber-700 mb-2">
            ไม่พบหมวดหมู่
          </h2>
          <p className="text-gray-500 mb-6">
            หมวดหมู่ &quot;{categorySlug}&quot; ไม่มีอยู่ในระบบ
          </p>
          <a
            href="/"
            className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium"
          >
            ← กลับหน้าหลัก
          </a>
        </div>
      </div>
    );
  }

  const types = [
    "All",
    ...new Set(products.map((p) => p.type).filter(Boolean)),
  ];
  const filtered =
    selectedType === "All"
      ? products
      : products.filter((p) => p.type === selectedType);
  const heroImage = HERO_IMAGES[categorySlug];
  const displayName = categoryInfo?.name || categorySlug;
  const displayIcon = categoryInfo?.icon || "";
  const story = CATEGORY_STORY[categorySlug];

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

  return (
    <div
      className="bg-amber-50 min-h-screen"
      style={{ fontFamily: "'Prompt', sans-serif" }}
    >
      <section
        ref={heroRef}
        className="relative h-[55vh] sm:h-[65vh] overflow-hidden"
      >
        <img
          src={heroImage}
          alt={displayName}
          className="w-full h-full object-cover"
          style={{
            transform: heroVisible ? "scale(1)" : "scale(1.05)",
            transition: "transform 8000ms ease-out",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/25 via-transparent to-[#faf8f5]" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-950/30 to-transparent" />
        <div
          className={`absolute inset-0 flex flex-col justify-end pb-12 sm:pb-20 px-5 sm:px-8 lg:px-16 transition-all duration-1000 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3 mb-4">
              <span className="block w-6 h-px bg-amber-200/70" />
              <span className="text-amber-100/70 text-[11px] tracking-[0.4em] uppercase">
                Pound Bakery
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extralight text-white leading-[0.9]">
              <span className="font-semibold">
                {displayIcon} {displayName}
              </span>
            </h1>
          </div>
        </div>
      </section>

      {/* ── STORY: เล่าความเป็นมาของหมวด ── */}
      {story && (
        <div className="bg-white">
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-14 sm:py-24">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
              <div className="order-2 lg:order-1">
                <p className="text-amber-500 text-[11px] tracking-[0.3em] uppercase mb-4">
                  {story.tagline}
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-800 leading-[1.1] mb-5">
                  {story.title}
                </h2>
                <p className="text-stone-500 text-base sm:text-lg leading-relaxed max-w-xl">
                  {story.body}
                </p>
              </div>
              <div className="order-1 lg:order-2 relative h-60 sm:h-80 lg:h-[460px] rounded-3xl overflow-hidden shadow-xl ring-1 ring-black/5">
                <img
                  src={heroImage}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </section>

          <section className="px-4 sm:px-6 lg:px-12 pb-14 sm:pb-24">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extralight text-amber-900 leading-snug">
                {story.highlight}
              </h2>
              <p className="mt-3 text-stone-400 text-sm tracking-wide">
                {story.highlightBody}
              </p>
            </div>
          </section>
        </div>
      )}

      <section
        ref={contentRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 sm:py-14"
      >
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-10 transition-all duration-700 ${contentVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-5 py-2 rounded-full text-sm transition-all duration-300 ${selectedType === t ? "bg-amber-900 text-amber-50" : "bg-white text-stone-500 hover:text-stone-700 border border-stone-200 hover:border-stone-400"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="text-stone-400 text-xs">{filtered.length} รายการ</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
          {filtered.map((p, i) => (
            <div
              key={p.id}
              className="animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <ProductCard {...p} onStockUpdate={fetchProducts} />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-stone-300 text-sm">ไม่พบสินค้าในหมวดหมู่นี้</p>
          </div>
        )}
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