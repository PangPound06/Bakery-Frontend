"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ButtonLink, cx, Spinner } from "@/components/ds";
import PopularCarousel from "@/components/ui/PopularCarousel";
import { productHref } from "@/components/ui/ProductCard";
import { formatBaht } from "@/lib/dineIn";
import type { ApiProduct, Category } from "@/types/product";

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

/** รูปประจำหมวด (public/images/hero/) — หมวดใหม่ที่ยังไม่มีรูปใช้พื้นสีแทน */
const CATEGORY_IMAGES: Record<string, string> = {
  bakery: "/images/hero/Bakery.jpg",
  cake: "/images/hero/Cake.jpg",
  drink: "/images/hero/Drink.jpg",
  food: "/images/hero/Food.jpg",
  appetizer: "/images/hero/Appetizer.jpg",
};

/** เมนูยอดนิยมที่แสดงสูงสุด */
const POPULAR_LIMIT = 10;
/** เมนูแนะนำในกล่องใหญ่ (สลับดูได้) */
const FEATURED_LIMIT = 3;

const toProduct = (item: ApiProduct): Product => ({
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
});

const inStock = (p: Product) => p.isAvailable && (p.stockQuantity > 0 || p.stockQuantity === 9999);

/**
 * หน้าแรก — หัวเรื่อง + ปุ่มเริ่มสั่ง, กล่องลัด (เมนูแนะนำ จองโต๊ะ สาขา ทานที่ร้าน),
 * หมวดหมู่ และเมนูขายดีจากยอดขายจริง (GET /api/orders/stats/top-products)
 */
export default function HomePage() {
  const { products, categories, popular, loading } = useHomeData();
  const [featuredIndex, setFeaturedIndex] = useState(0);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-brick">
        <Spinner className="size-10" />
      </div>
    );

  const featuredList = (popular.length > 0 ? popular : products.filter(inStock)).slice(0, FEATURED_LIMIT);
  const featured = featuredList[Math.min(featuredIndex, featuredList.length - 1)];

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      {/* ── หัวเรื่อง ── */}
      <section className="mx-auto flex max-w-[1240px] flex-wrap items-end gap-10 px-4 pt-12 pb-10 sm:px-6 lg:pt-18 lg:pb-12">
        <div className="min-w-0 flex-[999_1_560px]">
          <h1 className="m-0 font-display text-[52px] leading-[1.1] font-bold tracking-tight sm:text-[88px]">
            เนยแท้
            <br />
            หอมทั้งบ้าน
          </h1>
        </div>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-6 pb-3">
          <p className="m-0 text-lg leading-relaxed text-subtle">
            ปอนด์เค้ก ขนมปัง และขนมอบ อบใหม่ทุกวัน สั่งออนไลน์ให้ส่งถึงบ้าน มารับที่ร้าน หรือนั่งทานที่ร้าน
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/order-mode" size="lg">
              เริ่มสั่งเลย
            </ButtonLink>
            <ButtonLink href="/reservation" variant="secondary" size="lg">
              จองโต๊ะ
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ── กล่องลัด ── */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6" aria-label="ทางลัด">
        <div className="grid auto-rows-[minmax(220px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-rows-[260px] lg:grid-cols-4">
          {featured && (
            <div className="relative flex min-w-0 flex-col justify-between gap-6 overflow-hidden rounded-[32px] bg-sand p-7 sm:col-span-2 sm:row-span-2 sm:p-8">
              {featured.img && (
                <img
                  key={featured.id}
                  src={featured.img}
                  alt=""
                  className="pointer-events-none absolute right-0 bottom-0 h-3/5 w-3/5 rounded-tl-[32px] object-cover opacity-90 motion-safe:animate-fade"
                />
              )}
              {featuredList.length > 1 && (
                <div role="tablist" aria-label="เมนูแนะนำ" className="relative flex flex-wrap gap-2">
                  {featuredList.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      role="tab"
                      aria-selected={p.id === featured.id}
                      onClick={() => setFeaturedIndex(i)}
                      className={cx(
                        "min-h-10 rounded-full px-4 text-sm font-semibold transition-colors",
                        p.id === featured.id ? "bg-ink text-cream" : "bg-white/70 text-ink hover:bg-white",
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              <div key={featured.id} className="relative max-w-[60%] motion-safe:animate-rise">
                <p className="m-0 mb-2 text-sm font-semibold text-subtle">{popular.length > 0 ? "ขายดีของร้าน" : "เมนูแนะนำ"}</p>
                <h2 className="m-0 font-display text-[34px] leading-tight font-bold break-words sm:text-[52px]">{featured.name}</h2>
                <div className="mt-6">
                  <ButtonLink href={productHref(featured.category, featured.name)} variant="secondary">
                    ดูสินค้า · {formatBaht(featured.price)}
                  </ButtonLink>
                </div>
              </div>
            </div>
          )}

          <ShortcutTile href="/reservation" tone="dark" title="จองโต๊ะ" description="เลือกวัน เวลา จำนวนคน" icon={<CalendarIcon />} />
          <ShortcutTile href="/location" tone="green" title="สาขาของเรา" description="ที่อยู่ เวลาเปิด และแผนที่" icon={<PinIcon />} />
          <ShortcutTile href="/order-mode" tone="light" title="ทานที่ร้าน" description="นั่งโต๊ะแล้วสั่งได้หลายรอบ จ่ายทีเดียวตอนเช็กบิล" />
          <ShortcutTile href="/menu" tone="light" title="เมนูทั้งหมด" description={`${products.length} รายการ`} />
        </div>
      </section>

      {/* ── หมวดหมู่ ── */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-[1240px] px-4 pt-20 sm:px-6 lg:pt-28" aria-labelledby="home-categories">
          <h2 id="home-categories" className="m-0 mb-8 font-display text-[32px] font-bold sm:text-[44px]">
            เลือกตามหมวด
          </h2>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:grid lg:grid-cols-5 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/${cat.slug}`}
                className="group relative block aspect-[4/5] w-[68%] flex-none snap-start overflow-hidden rounded-[28px] bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick sm:w-[40%] lg:w-auto"
              >
                {CATEGORY_IMAGES[cat.slug] && (
                  <img
                    src={CATEGORY_IMAGES[cat.slug]}
                    alt=""
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                  />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-5 text-cream">
                  <span className="block font-display text-2xl font-bold">{cat.name}</span>
                  <span className="mt-1 block text-sm text-mist group-hover:text-cream">ดูทั้งหมด →</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── ขายดี ── */}
      {popular.length > 0 && (
        <section className="mt-20 bg-ink py-16 text-cream lg:mt-28 lg:py-24" aria-labelledby="home-popular">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <p className="m-0 mb-2 text-sm tracking-[0.12em] text-apricot">จากยอดขายจริงของร้าน</p>
            <h2 id="home-popular" className="m-0 mb-10 font-display text-[32px] font-bold sm:text-[44px]">
              เมนูขายดี
            </h2>
            <PopularCarousel items={popular} />
          </div>
        </section>
      )}

      {/* ── เรื่องของร้าน ── */}
      <section className="mx-auto grid max-w-[1240px] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
        <div>
          <h2 className="m-0 mb-6 font-display text-[36px] leading-tight font-bold sm:text-5xl">อบด้วยความใส่ใจ ทุกวัน</h2>
          <p className="m-0 max-w-md leading-relaxed text-subtle">
            ทุกชิ้นของขนม เครื่องดื่ม และอาหารที่ Pound Bakery ถูกรังสรรค์ด้วยความใส่ใจ เพื่อให้ทุกคำเป็นช่วงเวลาแห่งความสุขของคุณ
          </p>
        </div>
        <dl className="m-0 grid grid-cols-2 gap-4">
          {[
            [`${products.length}`, "เมนู"],
            [`${categories.length}`, "หมวด"],
            ["ทุกวัน", "อบใหม่"],
            ["3 แบบ", "ส่ง · รับ · ทานที่ร้าน"],
          ].map(([value, label]) => (
            <div key={label} className="flex flex-col-reverse rounded-[24px] border border-line bg-white p-6 text-center">
              <dt className="mt-1 text-sm text-muted">{label}</dt>
              <dd className="m-0 text-3xl font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

/** สินค้าทั้งหมด หมวดที่เปิด และเมนูขายดี (จับคู่ชื่อจากสถิติกับสินค้าที่ยังขายอยู่) */
function useHomeData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [popular, setPopular] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const api = process.env.NEXT_PUBLIC_API_URL;
    const load = async () => {
      try {
        const [prodRes, catRes, topRes] = await Promise.all([
          fetch(`${api}/api/products`),
          fetch(`${api}/api/categories/active`),
          fetch(`${api}/api/orders/stats/top-products?days=all`),
        ]);
        const all: Product[] = prodRes.ok ? ((await prodRes.json()) as ApiProduct[]).map(toProduct) : [];
        const cats: Category[] = catRes.ok ? await catRes.json() : [];
        const tops: { productName: string }[] = topRes.ok ? ((await topRes.json()).topProducts ?? []) : [];

        const seen = new Set<string>();
        const pop: Product[] = [];
        for (const t of tops) {
          const match = all.find((p) => p.name === t.productName);
          if (match && !seen.has(match.name) && inStock(match)) {
            seen.add(match.name);
            pop.push(match);
          }
          if (pop.length >= POPULAR_LIMIT) break;
        }
        if (cancelled) return;
        setProducts(all);
        setCategories(cats);
        setPopular(pop);
      } catch {
        /* โหลดไม่ได้ — แสดงส่วนที่ไม่ต้องใช้ข้อมูลไปก่อน */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { products, categories, popular, loading };
}

const TILE_TONES = {
  dark: "bg-ink text-cream",
  green: "bg-success-soft text-success-ink",
  light: "border border-line bg-white text-ink",
} as const;

function ShortcutTile({
  href,
  tone,
  title,
  description,
  icon,
}: {
  href: string;
  tone: keyof typeof TILE_TONES;
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "flex min-h-[200px] flex-col justify-between rounded-[32px] p-7 transition-[transform,box-shadow] duration-300 hover:shadow-[0_18px_40px_rgba(31,26,22,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick motion-safe:hover:-translate-y-1",
        TILE_TONES[tone],
      )}
    >
      <span aria-hidden="true">{icon ?? "→"}</span>
      <span>
        <span className="block font-display text-[28px] font-bold">{title}</span>
        <span className={cx("mt-1.5 block text-[15px]", tone === "dark" ? "text-mist" : "opacity-80")}>{description}</span>
      </span>
    </Link>
  );
}

function CalendarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
