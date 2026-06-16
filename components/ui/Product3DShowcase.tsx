"use client";

import Link from "next/link";

interface Product {
  id: number;
  name: string;
  img: string;
  category: string;
}
interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
}

const FALLBACK =
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80";

/**
 * Lineup 5 หมวด แถวเดียว 
 *  - มือถือ/iPhone: เลื่อนแนวนอน (snap) ทีละการ์ด
 *  - จอใหญ่/iPad ขึ้นไป: 5 ใบเรียงเต็มแถว
 *  - การ์ดใหญ่กว่า ProductCard เล็กน้อย + ยกตัว/ซูมตอน hover (subtle)
 */
export default function Product3DShowcase({
  products,
  categories,
  categoryImages = {},
}: {
  products: Product[];
  categories: Category[];
  categoryImages?: Record<string, string>;
}) {
  const items = categories.map((cat) => {
    const slugKey = (cat.slug || "").toLowerCase();
    const nameKey = (cat.name || "").toLowerCase();
    const product =
      products.find((p) => p.category?.toLowerCase() === slugKey) ||
      products.find((p) => p.category?.toLowerCase() === nameKey);
    const img = product?.img || categoryImages[cat.slug] || FALLBACK;
    return { cat, product, img };
  });

  if (items.length === 0) return null;

  return (
    <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory lg:grid lg:grid-cols-5 lg:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map(({ cat, product, img }) => (
        <Link
          key={cat.id}
          href={`/${cat.slug}`}
          className="group snap-start shrink-0 w-[68%] sm:w-[40%] md:w-[30%] lg:w-auto"
          style={{ perspective: "1000px" }}
        >
          <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-lg ring-1 ring-black/5 bg-white transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:shadow-2xl">
            <img
              src={img}
              alt={cat.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
              <p className="text-white font-bold text-base sm:text-lg flex items-center gap-1.5 leading-tight">
                <span>{cat.icon}</span>
                <span className="truncate">{cat.name}</span>
              </p>
              {product && (
                <p className="text-white/70 text-xs mt-0.5 truncate">
                  {product.name}
                </p>
              )}
              <span className="mt-2 inline-flex items-center gap-1 text-white/85 text-xs font-medium">
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
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}