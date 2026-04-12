"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

export default function Footer() {
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    const fetchCategories = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/categories/active");
        if (res.ok) setCategories(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchCategories();
  }, [pathname]);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="bg-amber-900 text-white">
      <div className="w-full mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-center sm:text-left">
          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">
              Pound Bakery
            </h3>
            <p className="text-amber-100 text-xs sm:text-sm">
              อบสดใหม่ด้วยความรักทุกวัน
              ความสุขของคุณคือสิ่งที่เราให้ความสำคัญเป็นอันดับแรก
            </p>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">
              Quick Links
            </h3>
            <ul className="space-y-1.5 sm:space-y-2 text-amber-100 text-xs sm:text-sm">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <a
                    href={`/${cat.slug}`}
                    className="hover:text-white transition"
                  >
                    {cat.icon} {cat.name}
                  </a>
                </li>
              ))}
              <li>
                <a href="/cart" className="hover:text-white transition">
                  🛒 Cart
                </a>
              </li>
            </ul>
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">
              Contact Us
            </h3>
            <ul className="space-y-1.5 sm:space-y-2 text-amber-100 text-xs sm:text-sm">
              <li>📞 Phone: 02-587-9990</li>
              <li>📧 Email: info@Poundbakery.com</li>
              <li>📍 Bangkok, Thailand</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-amber-700 mt-6 sm:mt-8 pt-4 sm:pt-6 text-center text-amber-200 text-xs sm:text-sm">
          <p>© 2026 Pound Bakery. All rights reserved. Made with ❤️</p>
        </div>
      </div>
    </footer>
  );
}
