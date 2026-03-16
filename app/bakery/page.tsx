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

export default function BakeryPage() {
  const [selectedType, setSelectedType] = useState<string>("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [heroVisible, setHeroVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
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
  }, [loading]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(
        "https://bakery-backend-production-6fc9.up.railway.app/api/products/category/bakery",
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

    const interval = setInterval(() => {
      fetchProducts();
    }, 2000);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-12 h-12">
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
      className="bg-[#faf8f5] min-h-screen"
      style={{ fontFamily: "'Prompt', sans-serif" }}
    >
      {/* ━━━ HERO ━━━ */}
      <section
        ref={heroRef}
        className="relative h-[55vh] sm:h-[65vh] overflow-hidden"
      >
        <img
          src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1600&q=80"
          alt="Bakery"
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
                My Bakery
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extralight text-white leading-[0.9]">
              <span className="font-semibold">Bakery</span>
            </h1>
            <p className="text-white/60 text-sm sm:text-base mt-3">
              เบเกอรี่สดใหม่ อบทุกวัน ด้วยส่วนผสมคุณภาพ
            </p>
          </div>
        </div>
      </section>

      {/* ━━━ CONTENT ━━━ */}
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
                className={`px-5 py-2 rounded-full text-sm transition-all duration-300 ${
                  selectedType === t
                    ? "bg-amber-900 text-amber-50"
                    : "bg-white text-stone-500 hover:text-stone-700 border border-stone-200 hover:border-stone-400"
                }`}
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
              <ProductCard {...p} />
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
