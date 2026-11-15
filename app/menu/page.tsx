"use client";

import { useState, useEffect } from "react";
import { cx, Spinner } from "@/components/ds";
import ProductCard from "@/components/ui/ProductCard";
import type { ApiProduct } from "@/types/product";

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
}

interface Product {
  id: number;
  name: string;
  type: string;
  category: string;
  price: number;
  img: string;
  description?: string;
  stockQuantity?: number;
  isAvailable?: boolean;
  options?: string | null;
}

// รูป hero ประจำแต่ละหมวด (อยู่ใน public/images/hero/)
const HERO_IMAGES: Record<string, string> = {
  bakery: "/images/hero/Bakery.jpg",
  cake: "/images/hero/Cake.jpg",
  drink: "/images/hero/Drink.jpg",
  food: "/images/hero/Food.jpg",
  appetizer: "/images/hero/Appetizer.jpg",
};

// เรื่องเล่า/ที่มาประจำแต่ละหมวด (ชุดเดียวกับหน้าหมวดหมู่)
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

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  // โหลดหมวดหมู่ แล้วเลือกอันแรกเป็นค่าเริ่มต้น
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/categories/active`,
        );
        if (res.ok) {
          const data: Category[] = await res.json();
          setCategories(data);
          if (data.length > 0) setSelectedSlug(data[0].slug);
          else setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // โหลดสินค้าตามหมวดหมู่ที่เลือก
  const fetchProducts = async (slug: string) => {
    if (!slug) return;
    setLoadingProducts(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products/category/${slug}`,
      );
      if (res.ok) {
        const data = await res.json();
        setProducts(
          data.map((item: ApiProduct) => ({
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
      setLoadingProducts(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSlug) {
      setSelectedType("All");
      fetchProducts(selectedSlug);
    }
  }, [selectedSlug]);

  const story = CATEGORY_STORY[selectedSlug];
  const heroImage = HERO_IMAGES[selectedSlug];
  const displayName =
    categories.find((c) => c.slug === selectedSlug)?.name || selectedSlug;
  // ประเภทย่อยในหมวด (All + type ที่มีจริง)
  const types = [
    "All",
    ...new Set(products.map((p) => p.type).filter(Boolean)),
  ];
  const filtered =
    selectedType === "All"
      ? products
      : products.filter((p) => p.type === selectedType);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-brick">
        <Spinner className="size-10" />
      </div>
    );

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <main className="mx-auto max-w-[1240px] px-4 pt-10 pb-28 sm:px-6 lg:pt-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 lg:mb-8">
          <div>
            <p className="m-0 mb-2 text-sm text-muted">{loadingProducts ? "กำลังโหลด…" : `${filtered.length} รายการ`}</p>
            <h1 className="m-0 font-display text-[40px] leading-tight font-bold sm:text-[64px]">{displayName || "เมนู"}</h1>
          </div>
        </div>

        {/* หมวดหมู่ — มือถือเลื่อนซ้ายขวาได้ */}
        <div className="-mx-4 mb-6 px-4 sm:mx-0 sm:px-0">
          <div role="tablist" aria-label="หมวดหมู่" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((cat) => {
              const active = cat.slug === selectedSlug;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedSlug(cat.slug)}
                  className={cx(
                    "min-h-11 flex-none rounded-full border-[1.5px] px-5 text-[15px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick",
                    active ? "border-ink bg-ink text-cream" : "border-line bg-white text-ink hover:border-line-strong",
                  )}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
          {types.length > 2 && (
            <div role="radiogroup" aria-label="ประเภท" className="mt-2 flex flex-wrap gap-2">
              {types.map((tp) => (
                <button
                  key={tp}
                  type="button"
                  role="radio"
                  aria-checked={selectedType === tp}
                  onClick={() => setSelectedType(tp)}
                  className={cx(
                    "min-h-9 rounded-full px-4 text-sm transition-colors",
                    selectedType === tp ? "bg-sand font-semibold text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  {tp === "All" ? "ทั้งหมด" : tp}
                </button>
              ))}
            </div>
          )}
        </div>

        {loadingProducts ? (
          <div className="flex justify-center py-20 text-brick">
            <Spinner className="size-8" />
          </div>
        ) : products.length === 0 ? (
          <p className="rounded-[28px] border-[1.5px] border-dashed border-line-strong px-6 py-16 text-center text-muted">
            ยังไม่มีเมนูในหมวดนี้
          </p>
        ) : (
          <div key={`${selectedSlug}-${selectedType}`} className="grid grid-cols-2 gap-3 motion-safe:animate-rise sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] sm:gap-6">
            {filtered.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        )}
      </main>

      {/* ── ที่มาของหมวดที่เลือก ── */}
      {story && (
        <section className="bg-white">
          <div className="mx-auto grid max-w-[1240px] items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-20">
            <div className="order-2 lg:order-1">
              <p className="m-0 mb-4 text-sm tracking-[0.3em] text-brick uppercase">{story.tagline}</p>
              <h2 className="m-0 mb-5 font-display text-3xl leading-tight font-bold sm:text-5xl">{story.title}</h2>
              <p className="m-0 max-w-xl text-base leading-relaxed text-subtle sm:text-lg">{story.body}</p>
              <p className="m-0 mt-8 font-display text-xl font-bold sm:text-2xl">{story.highlight}</p>
              <p className="m-0 mt-2 text-sm text-muted">{story.highlightBody}</p>
            </div>
            <div className="relative order-1 h-60 overflow-hidden rounded-[32px] bg-sand sm:h-80 lg:order-2 lg:h-[460px]">
              {heroImage && <img src={heroImage} alt={displayName} className="size-full object-cover" />}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
