"use client";

import { useState, useEffect } from "react";
import ProductCard from "@/components/ui/ProductCard";

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
        }
      } catch (e) {
        console.error(e);
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
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (selectedSlug) {
      setSelectedType("All");
      fetchProducts(selectedSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* ส่วนหัว — sticky บนมือถือ, ปกติบนเดสก์ท็อป (เลี่ยงทับ Header หลัก) */}
      <div className="bg-[#faf7f2] border-b border-stone-200/70">
        {/* แท็บหมวดหมู่ — มือถือชิดซ้าย(เลื่อนได้), แท็บเล็ต/คอมพ์จัดกลาง */}
        <div className="flex gap-2 overflow-x-auto px-3 pt-2 pb-3 xl:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((cat) => {
            const active = cat.slug === selectedSlug;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedSlug(cat.slug)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  active
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-white text-stone-500 border border-stone-200 hover:border-amber-300 hover:text-amber-700"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ที่มาของหมวดที่เลือก (storytelling) ── */}
      {story && (
        <div className="bg-white">
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-20">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
              <div className="order-2 lg:order-1">
                <p className="text-amber-500 sm:text-lg tracking-[0.3em] uppercase mb-4">
                  {story.tagline}
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-amber-700 leading-[1.1] mb-5">
                  {story.title}
                </h2>
                <p className="text-stone-500 text-base sm:text-lg leading-relaxed max-w-xl">
                  {story.body}
                </p>
              </div>
              <div className="order-1 lg:order-2 relative h-60 sm:h-80 lg:h-[460px] rounded-3xl overflow-hidden shadow-xl ring-1 ring-black/5">
                {heroImage && (
                  <img
                    src={heroImage}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </section>

          <section className="px-4 sm:px-6 lg:px-12 pb-12 sm:pb-20">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extralight text-amber-900 leading-snug">
                {story.highlight}
              </h2>
              <p className="mt-3 text-stone-500 text-sm tracking-wide">
                {story.highlightBody}
              </p>
            </div>
          </section>
        </div>
      )}

      {/* สินค้า */}
      <div className="mx-auto max-w-7xl px-4 py-5 pb-28">
        {loadingProducts ? (
          <div className="flex justify-center py-20">
            <div
              className="w-10 h-10 rounded-full animate-spin"
              style={{
                borderWidth: 3,
                borderStyle: "solid",
                borderColor: "#f59e0b transparent transparent transparent",
              }}
            />
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-stone-400 text-sm py-20">
            ไม่พบสินค้าในหมวดหมู่นี้
          </p>
        ) : (
          <>
            {/* แถวกรองประเภท + จำนวนรายการ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
              <div className="flex flex-wrap gap-2">
                {types.map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setSelectedType(tp)}
                    className={`px-5 py-2 rounded-full text-sm transition-all duration-300 ${selectedType === tp ? "bg-amber-900 text-amber-50" : "bg-white text-stone-500 hover:text-stone-700 border border-stone-200 hover:border-stone-400"}`}
                  >
                    {tp}
                  </button>
                ))}
              </div>
              <p className="text-stone-400 text-xs">{filtered.length} รายการ</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  {...p}
                  onStockUpdate={() => fetchProducts(selectedSlug)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}