"use client";

import { useState, useEffect, useRef } from "react";
import ProductCard from "../components/ProductCard";

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

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export default function CakePage() {
  const [selectedType, setSelectedType] = useState<string>("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const hero = useInView(0.1);
  const content = useInView(0.1);

  const fetchProducts = async () => {
    try {
      const response = await fetch(
        "https://cake-backend-production-6fc9.up.railway.app/api/products/category/cake",
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
    fetchProducts();
    const interval = setInterval(fetchProducts, 30000);
    return () => clearInterval(interval);
  }, []);

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
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border border-amber-800/30 border-t-amber-800 rounded-full animate-spin mx-auto" />
          <p
            className="text-amber-900/40 text-[11px] tracking-[0.4em] uppercase font-light"
            style={{ fontFamily: "system-ui" }}
          >
            Loading
          </p>
        </div>
      </div>
    );

  return (
    <div
      className="bg-[#faf8f5] min-h-screen"
      
    >
      {/* HERO */}
      <section
        ref={hero.ref as React.RefObject<HTMLElement>}
        className="relative h-[55vh] sm:h-[65vh] overflow-hidden"
      >
        <img
          src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1800&q=85"
          alt="Cake"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[8000ms]"
          style={{ transform: hero.inView ? "scale(1)" : "scale(1.05)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/25 via-transparent to-[#faf8f5]" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-950/30 to-transparent" />

        <div
          className={`absolute inset-0 flex flex-col justify-end pb-14 sm:pb-20 px-6 sm:px-12 lg:px-20 transition-all duration-1000 ${hero.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3 mb-4">
              <span className="block w-6 h-px bg-amber-200/70" />
              <span
                className="text-amber-100/70 text-[11px] tracking-[0.4em] uppercase font-light"
                style={{ fontFamily: "system-ui" }}
              >
                My Cake
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light text-white leading-[0.9]">
              <em className="not-italic font-semibold">Cake</em>
            </h1>
            <p
              className="text-white/60 text-sm sm:text-base mt-3 font-light"
              style={{ fontFamily: "system-ui" }}
            >
              เค้กสุดพิเศษ สำหรับทุกโอกาส
            </p>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section
        ref={content.ref as React.RefObject<HTMLElement>}
        className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-12 sm:py-18"
      >
        {/* Filter + count */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 sm:mb-12 transition-all duration-700 ${content.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-5 py-2 rounded-full text-sm transition-all duration-300 ${selectedType === t ? "bg-amber-900 text-amber-50" : "bg-white border border-amber-900/15 text-amber-900/60 hover:border-amber-900/40 hover:text-amber-900/80"}`}
                style={{ fontFamily: "system-ui" }}
              >
                {t}
              </button>
            ))}
          </div>
          <p
            className="text-amber-900/30 text-xs"
            style={{ fontFamily: "system-ui" }}
          >
            {filtered.length} รายการ
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
          {filtered.map((p, i) => (
            <div
              key={p.id}
              className={`transition-all duration-500 ${content.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <ProductCard {...p} />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-24">
            <p
              className="text-amber-900/25 text-sm"
              style={{ fontFamily: "system-ui" }}
            >
              ไม่พบสินค้าในหมวดหมู่นี้
            </p>
          </div>
        )}
      </section>
    </div>
  );
}