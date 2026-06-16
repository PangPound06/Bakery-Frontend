"use client";

import Link from "next/link";
import { useRef, useState } from "react";

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
 * โชว์ทุกหมวด (5 หมวด) เรียงแถวเดียว แบบ 3 มิติ (CSS perspective)
 *  - แต่ละการ์ด = 1 หมวด ใช้รูปสินค้าที่ match ได้ ถ้าไม่เจอใช้รูปหมวด (categoryImages) → ไม่มีช่องว่าง
 *  - ทั้งแถวเอียงตามเมาส์ + การ์ดลอยเบาๆ (subtle)
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

  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: py * -6, ry: px * 7 });
  };
  const reset = () => setTilt({ rx: 0, ry: 0 });

  if (items.length === 0) return null;

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className="grid grid-cols-5 gap-2 sm:gap-4 py-6"
      style={{ perspective: "1200px" }}
    >
      {items.map(({ cat, product, img }, i) => (
        <Link
          key={cat.id}
          href={`/${cat.slug}`}
          className="group block"
          style={{
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            transformStyle: "preserve-3d",
            transition: "transform 0.25s ease-out",
          }}
        >
          <div
            className="card3d relative rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 bg-white"
            style={{ animationDelay: `${i * 0.4}s` }}
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              <img
                src={img}
                alt={cat.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                <p className="text-white font-semibold text-xs sm:text-base leading-tight flex items-center gap-1">
                  <span>{cat.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </p>
                {product && (
                  <p className="hidden sm:block text-white/70 text-[11px] mt-0.5 truncate">
                    {product.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}

      <style jsx>{`
        @keyframes float3d {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        .card3d {
          animation: float3d 5s ease-in-out infinite;
          will-change: transform;
        }
        .group:hover .card3d {
          animation-play-state: paused;
          transform: translateZ(30px) scale(1.05);
          transition: transform 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}