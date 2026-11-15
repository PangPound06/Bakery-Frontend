"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/categories/active`,
        );
        if (res.ok) setCategories(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchCategories();
  }, [pathname]);

  if (pathname?.startsWith("/admin")) return null;

  return (
    // pb-24 บนมือถือ — เว้นที่ให้แถบนำทางด้านล่างของ Header (xl:hidden)
    <footer className="bg-ink px-4 pt-16 pb-24 font-body text-mist sm:px-6 xl:pb-10">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-12">
        <div className="flex flex-wrap justify-between gap-10">
          <div className="flex-[1_1_280px]">
            <p className="m-0 mb-2.5 font-display text-[26px] font-bold text-cream">Pound Bakery</p>
            <p className="m-0 text-[15px] leading-relaxed">
              อบใหม่ทุกวัน · กรุงเทพฯ
              <br />
              โทร 02-587-9990 · info@poundbakery.com
            </p>
          </div>
          <nav aria-label="ลิงก์ท้ายเว็บ" className="flex flex-wrap gap-14 text-[15px]">
            <FooterColumn title="ร้าน">
              <FooterLink href="/menu">เมนู</FooterLink>
              {categories.map((cat) => (
                <FooterLink key={cat.id} href={`/${cat.slug}`}>
                  {cat.name}
                </FooterLink>
              ))}
              <FooterLink href="/order-mode">ทานที่ร้าน</FooterLink>
              <FooterLink href="/location">สาขา</FooterLink>
            </FooterColumn>
            <FooterColumn title="ของฉัน">
              <FooterLink href="/user/orders">คำสั่งซื้อ</FooterLink>
              <FooterLink href="/user/reservations">การจอง</FooterLink>
              <FooterLink href="/user/favorites">รายการโปรด</FooterLink>
            </FooterColumn>
            <FooterColumn title="ช่วยเหลือ">
              <FooterLink href="/user/search-order">ค้นหาออเดอร์</FooterLink>
              <FooterLink href="/terms">ข้อกำหนด</FooterLink>
              <FooterLink href="/privacy">ความเป็นส่วนตัว</FooterLink>
            </FooterColumn>
          </nav>
        </div>
        <div className="border-t border-ink-line pt-6 text-[13px] text-faint">© 2026 Pound Bakery · poundbakeryshop.com</div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-semibold text-cream">{title}</span>
      {children}
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-mist transition-colors hover:text-apricot">
      {children}
    </Link>
  );
}
