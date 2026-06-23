"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

export default function MenuPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

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
    if (selectedSlug) fetchProducts(selectedSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug]);

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* ส่วนหัว — sticky บนมือถือ, ปกติบนเดสก์ท็อป (เลี่ยงทับ Header หลัก) */}
      <div className="sticky top-0 z-30 xl:static bg-[#faf7f2]/90 backdrop-blur-xl border-b border-stone-200/70">
        {/* แถบหัวสไตล์ iPhone (เฉพาะมือถือ/แท็บเล็ต) */}
        <div className="xl:hidden relative flex items-center justify-center h-12 px-2">
          <button
            onClick={() => router.back()}
            aria-label="ย้อนกลับ"
            className="absolute left-1 flex items-center text-amber-700 active:opacity-50 transition-opacity"
          >
            {/* chevron แบบ iOS */}
            <svg
              className="w-7 h-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-stone-800">เมนู</h1>
        </div>

        {/* แท็บหมวดหมู่ */}
        <div className="flex gap-2 overflow-x-auto px-3 pt-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                {...p}
                onStockUpdate={() => fetchProducts(selectedSlug)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}