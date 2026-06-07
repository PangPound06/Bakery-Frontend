"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

export default function PopularCarousel({
  items,
  onStockUpdate,
  interval = 3500,
}: {
  items: Product[];
  onStockUpdate?: () => void;
  interval?: number;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // เลื่อน track ให้สไลด์ที่ idx มาอยู่ซ้ายสุด
  const scrollToIndex = useCallback((idx: number) => {
    const track = trackRef.current;
    if (!track) return;
    const child = track.children[idx] as HTMLElement | undefined;
    if (!child) return;
    track.scrollTo({
      left: child.offsetLeft - track.offsetLeft,
      behavior: "smooth",
    });
  }, []);

  // เลื่อนอัตโนมัติไปทางขวา (วนกลับเมื่อถึงตัวสุดท้าย)
  useEffect(() => {
    if (paused || items.length <= 1) return;
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % items.length);
    }, interval);
    return () => clearInterval(id);
  }, [paused, items.length, interval]);

  // เมื่อ current เปลี่ยน → เลื่อน track
  useEffect(() => {
    scrollToIndex(current);
  }, [current, scrollToIndex]);

  // ถ้า items เปลี่ยน รีเซ็ตกลับตัวแรก
  useEffect(() => {
    setCurrent(0);
  }, [items.length]);

  if (!items || items.length === 0) return null;

  const go = (idx: number) => {
    setCurrent(((idx % items.length) + items.length) % items.length);
  };

  return (
    <div className="relative">
      {/* ปุ่มเลื่อนซ้าย/ขวา (โชว์เฉพาะ ≥ sm) */}
      <button
        type="button"
        onClick={() => {
          setPaused(true);
          go(current - 1);
        }}
        aria-label="ก่อนหน้า"
        className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-md text-amber-700 hover:bg-white hover:scale-105 transition-all"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => {
          setPaused(true);
          go(current + 1);
        }}
        aria-label="ถัดไป"
        className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-md text-amber-700 hover:bg-white hover:scale-105 transition-all"
      >
        ›
      </button>

      {/* แทร็คเลื่อน */}
      <div
        ref={trackRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="flex gap-3 sm:gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth pb-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="snap-start shrink-0 w-[78%] sm:w-[46%] md:w-[31.5%] lg:w-[23.5%]"
          >
            <ProductCard {...item} onStockUpdate={onStockUpdate} />
          </div>
        ))}
      </div>

      {/* จุด (dots) + ปุ่มหยุด/เล่น */}
      <div className="flex items-center justify-center gap-2 mt-5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setPaused(true);
              setCurrent(i);
            }}
            aria-label={`ไปสไลด์ที่ ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current
                ? "w-6 bg-amber-600"
                : "w-2 bg-amber-300 hover:bg-amber-400"
            }`}
          />
        ))}
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "เล่นสไลด์" : "หยุดสไลด์"}
          className="ml-2 w-7 h-7 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 flex items-center justify-center text-[11px] transition-colors"
        >
          {paused ? "▶" : "❚❚"}
        </button>
      </div>
    </div>
  );
}