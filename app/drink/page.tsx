"use client";

import { useState, useEffect } from "react";
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

export default function DrinkPage() {
  const [selectedType, setSelectedType] = useState<string>("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("https://bakery-backend-production-6fc9.up.railway.app/api/products/category/drink");
        if (response.ok) {
          const data = await response.json();
          setProducts(data.map((item: any) => ({
            id: item.id, name: item.name, type: item.type || "Other",
            category: item.category, price: item.price, img: item.image,
            description: item.description, stockQuantity: item.stockQuantity, isAvailable: item.isAvailable,
          })));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchProducts();
  }, []);

  const types = ["All", ...new Set(products.map((p) => p.type).filter(Boolean))];
  const filtered = selectedType === "All" ? products : products.filter((p) => p.type === selectedType);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-12 h-12">
            <div className="absolute inset-1 border-2 border-stone-800 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-stone-400 tracking-[0.3em] text-[10px] uppercase">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50" style={{ fontFamily: "'Prompt', sans-serif" }}>
      <section className="relative h-[45vh] sm:h-[50vh] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1600&q=80" alt="Drink" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-stone-50"></div>
        <div className="absolute bottom-0 left-0 right-0 px-5 sm:px-8 lg:px-16 pb-10 sm:pb-14">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extralight text-black/50">
              <span className="font-semibold">Drink</span>
            </h1>
            <p className="text-black text-sm mt-2">เครื่องดื่มสดชื่น คัดสรรคุณภาพ</p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 sm:py-14">
        <div className="flex flex-wrap gap-1.5 mb-8">
          {types.map((t) => (
            <button key={t} onClick={() => setSelectedType(t)}
              className={`px-8 py-3 rounded-full font-medium transition-all duration-300 ${selectedType === t ? "bg-stone-800 text-white" : "bg-white text-stone-500 hover:text-stone-700 border border-stone-200 hover:border-stone-300"}`}>
              {t}
            </button>
          ))}
        </div>
        <p className="text-stone-400 text-xs mb-6">{filtered.length} รายการ</p>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
          {filtered.map((p, i) => (
            <div key={p.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}><ProductCard {...p} /></div>
          ))}
        </div>
        {filtered.length === 0 && (<div className="text-center py-20"><p className="text-stone-300 text-sm">ไม่พบสินค้าในหมวดหมู่นี้</p></div>)}
      </section>
      <style jsx global>{`@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.animate-fade-in{animation:fadeIn .6s ease-out both}`}</style>
    </div>
  );
}