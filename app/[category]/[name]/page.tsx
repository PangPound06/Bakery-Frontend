"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import ProductDetail from "@/components/ui/ProductDetail";

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const categorySlug = params.category as string;

  const [categoryInfo, setCategoryInfo] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/categories");
        if (res.ok) {
          const cats: Category[] = await res.json();
          const found = cats.find((c) => c.slug === categorySlug);
          if (found) setCategoryInfo(found);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchCategory();
  }, [categorySlug]);

  // ✅ Dynamic page title
  useEffect(() => {
    const name = (params.name as string).replace(/-/g, " ");
    document.title = `${name} - PoundBakery`;
  }, [params.name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ProductDetail
      category={categorySlug}
      categoryIcon={categoryInfo?.icon || "📦"}
      categoryLabel={categoryInfo?.name || categorySlug}
    />
  );
}
