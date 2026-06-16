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

/**
 * โชว์เคสสินค้า 1 ชิ้น/หมวด แบบ 3 มิติ (CSS perspective)
 *  - ทั้งแถวเอียงตามเมาส์ (parallax) + การ์ดลอยเบาๆ
 *  - subtle/มินิมอล ไม่ใช้ WebGL เลยไม่ติด CORS ของรูป
 */
export default function Product3DShowcase({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const items = categories
    .map((cat) => {
      const slugKey = (cat.slug || "").toLowerCase();
      const nameKey = (cat.name || "").toLowerCase();
      const p =
        products.find((pr) => pr.category?.toLowerCase() === slugKey) ||
        products.find((pr) => pr.category?.toLowerCase() === nameKey);
      return p ? { product: p, cat } : null;
    })
    .filter((x): x is { product: Product; cat: Category } => x !== null);

  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: py * -7, ry: px * 9 });
  };
  const reset = () => setTilt({ rx: 0, ry: 0 });

  if (items.length === 0) return null;

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className="flex flex-wrap justify-center gap-6 sm:gap-9 py-6"
      style={{ perspective: "1200px" }}
    >
      {items.map(({ product, cat }, i) => (
        <Link
          key={product.id}
          href={`/${cat.slug}`}
          className="group block"
          style={{
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            transformStyle: "preserve-3d",
            transition: "transform 0.25s ease-out",
          }}
        >
          <div
            className="card3d relative w-40 sm:w-48 rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 bg-white"
            style={{ animationDelay: `${i * 0.5}s` }}
          >
            <div className="relative h-52 sm:h-60 overflow-hidden">
              <img
                src={product.img}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <span className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/90 text-amber-700 backdrop-blur-sm">
                {cat.icon ? `${cat.icon} ` : ""}
                {cat.name}
              </span>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white font-semibold text-sm leading-tight line-clamp-2">
                  {product.name}
                </p>
              </div>
            </div>
          </div>
        </Link>
      ))}

      <style jsx>{`
        @keyframes float3d {
          0%,
          100% {
            transform: translateY(0) translateZ(0);
          }
          50% {
            transform: translateY(-10px) translateZ(20px);
          }
        }
        .card3d {
          animation: float3d 5.5s ease-in-out infinite;
          will-change: transform;
        }
        .group:hover .card3d {
          animation-play-state: paused;
          transform: translateZ(40px) scale(1.04);
          transition: transform 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}