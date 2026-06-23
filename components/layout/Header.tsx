"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import UserMenu from "@/components/ui/UserMenu";
import Swal from "sweetalert2";

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
}

const adminNavLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
];

interface SearchResult {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}

interface PageResult {
  href: string;
  label: string;
  icon: string;
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    email: string;
    fullname?: string;
    profileImage?: string;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // ✅ Dynamic categories
  const [categories, setCategories] = useState<Category[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [pageResults, setPageResults] = useState<PageResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [allProducts, setAllProducts] = useState<SearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  // ✅ Build nav links dynamically (เดสก์ท็อป: Home + หมวดหมู่ + ตะกร้า)
  const userNavLinks = [
    { href: "/", label: "Home", icon: "🏠" },
    ...categories.map((cat) => ({
      href: `/${cat.slug}`,
      label: cat.name,
      icon: cat.icon,
    })),
    { href: "/cart", label: "Cart", icon: "🛒" },
  ];

  // ✅ เมนูบัญชีผู้ใช้ (แสดงเมื่อกด hamburger บนมือถือ) — ตรงกับ UserMenu
  const accountMenuItems = [
    { href: "/user/profile", label: "ข้อมูลส่วนตัว", icon: "👤" },
    { href: "/user/orders", label: "รายการสั่งซื้อ", icon: "📦" },
    { href: "/user/search-order", label: "ค้นหาคำสั่งซื้อ", icon: "🔍" },
    { href: "/user/reservations", label: "การจองคิว", icon: "📅" },
    { href: "/user/favorites", label: "รายการโปรด", icon: "❤️" },
    { href: "/user/settings", label: "ตั้งค่า", icon: "⚙️" },
  ];

  // ✅ Build page search results dynamically
  const userPages = [
    {
      href: "/user/profile",
      label: "ข้อมูลส่วนตัว",
      icon: "👤",
      keywords: ["profile", "โปรไฟล์", "ข้อมูลส่วนตัว"],
    },
    {
      href: "/user/orders",
      label: "รายการสั่งซื้อ",
      icon: "📦",
      keywords: ["order", "orders", "คำสั่งซื้อ", "รายการสั่งซื้อ"],
    },
    {
      href: "/user/search-order",
      label: "ค้นหาคำสั่งซื้อ",
      icon: "🔍",
      keywords: ["search order", "ค้นหาคำสั่งซื้อ", "ORD"],
    },
    {
      href: "/user/favorites",
      label: "รายการโปรด",
      icon: "❤️",
      keywords: ["favorite", "favorites", "โปรด", "รายการโปรด"],
    },
    {
      href: "/user/settings",
      label: "ตั้งค่า",
      icon: "⚙️",
      keywords: ["setting", "settings", "ตั้งค่า"],
    },
    {
      href: "/cart",
      label: "ตะกร้าสินค้า",
      icon: "🛒",
      keywords: ["cart", "ตะกร้า"],
    },
    {
      href: "/checkout",
      label: "ชำระเงิน",
      icon: "💳",
      keywords: ["checkout", "ชำระเงิน"],
    },
    ...categories.map((cat) => ({
      href: `/${cat.slug}`,
      label: `หน้า ${cat.name}`,
      icon: cat.icon,
      keywords: [cat.slug, cat.name.toLowerCase()],
    })),
  ];

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          const email = parsedUser.email;
          const fullname = parsedUser.fullname || parsedUser.fullName;
          const profileImage = parsedUser.profileImage || "";
          if (email) {
            setUser({ email, fullname, profileImage });
            setIsAdmin(email.endsWith("@empbakery.com"));
          } else {
            setUser(null);
            setIsAdmin(false);
          }
        } catch {
          setUser(null);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    };
    checkLoginStatus();
    window.addEventListener("storage", checkLoginStatus);
    window.addEventListener("userStatusChanged", checkLoginStatus);
    return () => {
      window.removeEventListener("storage", checkLoginStatus);
      window.removeEventListener("userStatusChanged", checkLoginStatus);
    };
  }, []);

  // ✅ Fetch categories
  useEffect(() => {
    if (isAdmin) return;
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
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    const fetchProducts = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/products`,
        );
        if (res.ok) {
          const data = await res.json();
          setAllProducts(
            data.map((p: any) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              price: p.price,
              image: p.image,
            })),
          );
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchProducts();
  }, [isAdmin]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setPageResults([]);
      setShowResults(false);
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    setSearchResults(
      allProducts
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q),
        )
        .slice(0, 10),
    );
    setPageResults(
      userPages.filter(
        (page) =>
          page.label.toLowerCase().includes(q) ||
          page.keywords.some((kw) => kw.toLowerCase().includes(q)),
      ),
    );
    setShowResults(true);
  }, [searchQuery, allProducts, categories]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      const inDesktop = searchRef.current?.contains(t);
      const inMobile = mobileSearchRef.current?.contains(t);
      if (!inDesktop && !inMobile) {
        setShowResults(false);
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user || isAdmin) return;
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = userData.id || userData.userId;
    if (!userId) return;
    const fetchProfileImage = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/profile/${userId}`,
        );
        if (res.ok) {
          const data = await res.json();
          const newImage =
            data.success && data.profile?.profileImage
              ? data.profile.profileImage
              : "";
          if (newImage !== user.profileImage) {
            const updated = { ...userData, profileImage: newImage };
            localStorage.setItem("user", JSON.stringify(updated));
            setUser((prev) =>
              prev ? { ...prev, profileImage: newImage } : prev,
            );
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchProfileImage();
  }, [user?.email, isAdmin]);

  const handleSearchSelect = (product: SearchResult) => {
    setSearchQuery("");
    setShowResults(false);
    setShowSearch(false);
    router.push(
      `/${product.category.toLowerCase()}/${product.name.replace(/\s+/g, "-")}`,
    );
  };

  const handlePageSelect = (page: PageResult) => {
    setSearchQuery("");
    setShowResults(false);
    setShowSearch(false);
    router.push(page.href);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().toUpperCase().startsWith("ORD")) {
      setSearchQuery("");
      setShowResults(false);
      setShowSearch(false);
      router.push(
        `/user/profile/search-order?q=${searchQuery.trim().toUpperCase()}`,
      );
      return;
    }
    if (pageResults.length > 0) handlePageSelect(pageResults[0]);
    else if (searchResults.length > 0) handleSearchSelect(searchResults[0]);
  };

  // ✅ ออกจากระบบ (ใช้ในเมนู hamburger บนมือถือ)
  const handleLogout = async () => {
    setIsMenuOpen(false);
    const result = await Swal.fire({
      title: "ออกจากระบบ?",
      text: "คุณต้องการออกจากระบบหรือไม่?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
    });
    if (result.isConfirmed) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("userStatusChanged"));
      window.location.href = "/login";
    }
  };

  const getInitials = () => {
    if (user?.fullname) {
      return user.fullname
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email.charAt(0).toUpperCase() ?? "U";
  };

  const navLinks = isAdmin ? adminNavLinks : userNavLinks;
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);
  const onMenuPage = pathname?.startsWith("/menu") ?? false;
  // หน้า Menu/Cart/Search (ปลายทาง Bottom Nav) → Header เหลือแค่ hamburger
  const minimalHeader =
    onMenuPage || (pathname?.startsWith("/cart") ?? false) || showSearch;
  const hasAnyResults = searchResults.length > 0 || pageResults.length > 0;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <nav className="sticky top-0 z-50 h-14 bg-amber-100/70 backdrop-blur-xl" />;
  if (pathname?.startsWith("/admin")) return null;

  const SearchDropdown = () => {
    if (!showResults || searchQuery.trim() === "") return null;
    return (
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {pageResults.length > 0 && (
          <div>
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                หน้า
              </p>
            </div>
            {pageResults.map((page) => (
              <button
                key={page.href}
                onClick={() => handlePageSelect(page)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 transition-colors text-left"
              >
                <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-base flex-shrink-0">
                  {page.icon}
                </span>
                <span className="text-sm font-medium text-amber-700">
                  {page.label}
                </span>
                <svg
                  className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ))}
          </div>
        )}
        {searchResults.length > 0 && (
          <div>
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                สินค้า ({searchResults.length} รายการ)
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSearchSelect(product)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 transition-colors text-left"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-700 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">{product.category}</p>
                  </div>
                  <span className="text-sm font-semibold text-amber-600 flex-shrink-0">
                    ฿{product.price}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {!hasAnyResults && (
          <div className="p-6 text-center">
            <p className="text-gray-400 text-sm">
              ไม่พบผลลัพธ์สำหรับ &quot;{searchQuery}&quot;
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-amber-100/70 backdrop-blur-xl backdrop-saturate-150 border-b border-amber-900/10 text-amber-800 shadow-lg">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <Link
              href={isAdmin ? "/admin/dashboard" : "/"}
              className="text-xl sm:text-2xl font-bold text-amber-900 hover:text-amber-600 transition-colors flex items-center gap-2"
            >
              {isAdmin ? (
                <>
                  <span>🏪</span>
                  <span>Pound Bakery</span>
                </>
              ) : (
                <>🧁 Pound Bakery</>
              )}
            </Link>

            <ul className="hidden xl:flex gap-1 xl:gap-4 text-sm xl:text-base font-medium flex-1 justify-center">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex items-center gap-1.5 xl:gap-2 px-2 xl:px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${isActive(link.href) ? (isAdmin ? "bg-slate-600 text-white" : "bg-amber-500 text-white") : isAdmin ? "hover:bg-slate-700 hover:text-white" : "hover:bg-amber-200/70 hover:text-amber-900"}`}
                  >
                    <span className="text-sm xl:text-base">{link.icon}</span>
                    <span className="hidden xl:inline">{link.label}</span>
                    <span className="xl:hidden">
                      {link.label.split(" ")[0]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 sm:gap-3">
              {!isAdmin && (
                <div ref={searchRef} className="relative">
                  <div className="hidden xl:block">
                    <form onSubmit={handleSearchSubmit} className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() =>
                          searchQuery.trim() && setShowResults(true)
                        }
                        placeholder="ค้นหา"
                        className="w-44 lg:w-56 px-4 py-2 pl-9 rounded-lg bg-white/70 border border-amber-300 text-amber-900 placeholder-amber-700/50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
                      />
                      <svg
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-700/70"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </form>
                  </div>
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className={`${minimalHeader ? "hidden" : "xl:hidden"} p-2 rounded-lg hover:bg-amber-200/70 transition-colors`}
                    aria-label="ค้นหา"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </button>
                  {showResults && (
                    <div className="absolute right-0 xl:left-0 top-full mt-2 w-80 z-50 hidden xl:block">
                      <SearchDropdown />
                    </div>
                  )}
                </div>
              )}

              {/* ที่ตั้งร้าน — เดสก์ท็อป (แถบเดียวกับ UserMenu) */}
              <Link
                href="/location"
                className={`hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-amber-200/70 hover:text-amber-900 ${isActive("/location") ? "bg-amber-500 text-white" : ""}`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>ที่ตั้งร้าน</span>
              </Link>

              {/* บัญชีผู้ใช้ — เดสก์ท็อปเท่านั้น (มือถือใช้ hamburger) */}
              {user ? (
                <>
                  {isAdmin && (
                    <span className="hidden xl:inline-block bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                      Admin
                    </span>
                  )}
                  <div className="hidden xl:block">
                    <UserMenu user={user} />
                  </div>
                </>
              ) : (
                <Link
                  href="/login"
                  className="hidden xl:block bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  🔐 Login
                </Link>
              )}

              {/* ✅ ตะกร้าสินค้า — มือถือ/แท็บเล็ต อยู่ข้างปุ่มค้นหา */}
              {!isAdmin && (
                <Link
                  href="/cart"
                  aria-label="ตะกร้าสินค้า"
                  className={`${minimalHeader ? "hidden" : "xl:hidden"} p-2 rounded-lg transition-colors hover:bg-amber-200/70 hover:text-amber-900 ${isActive("/cart") ? "bg-amber-500 text-white" : ""}`}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </Link>
              )}

              {/* ✅ Hamburger → เปิดเมนูบัญชีผู้ใช้ */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`xl:hidden p-2 rounded-lg transition-colors ${isAdmin ? "hover:bg-slate-700" : "hover:bg-amber-200/70"}`}
                aria-label="เมนูผู้ใช้"
              >
                {isMenuOpen ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {showSearch && !isAdmin && (
            <div ref={mobileSearchRef} className="xl:hidden pb-3">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim() && setShowResults(true)}
                  placeholder="ค้นหาสินค้า, หน้า..."
                  autoFocus
                  className="w-full px-4 py-2.5 pl-9 rounded-lg bg-white/70 border border-amber-300 text-amber-900 placeholder-amber-700/50 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-700/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </form>
              {showResults && (
                <div className="mt-2">
                  <SearchDropdown />
                </div>
              )}
            </div>
          )}

          {/* ✅ เมนู hamburger (มือถือ) → ข้อมูล/เมนูบัญชีผู้ใช้ */}
          {isMenuOpen && (
            <div className="xl:hidden pb-4 border-t border-amber-900/10">
              {!isAdmin ? (
                user ? (
                  <div className="mt-4 bg-white rounded-xl shadow-2xl overflow-hidden">
                    {/* หัวการ์ด: โปรไฟล์ */}
                    <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 overflow-hidden bg-amber-500 border-amber-400">
                        {user.profileImage ? (
                          <img
                            src={user.profileImage}
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getInitials()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-700 truncate">
                          {user.fullname || "ผู้ใช้งาน"}
                        </p>
                        <p className="text-xs text-amber-600 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* รายการเมนู */}
                    <div className="py-1">
                      {accountMenuItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 transition-colors"
                        >
                          <span className="w-6 text-center text-lg">
                            {item.icon}
                          </span>
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      ))}
                    </div>

                    {/* ออกจากระบบ */}
                    <div className="border-t border-gray-200 py-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                      >
                        <span className="w-6 text-center text-lg">🚪</span>
                        <span className="font-semibold">ออกจากระบบ</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    🔐 Login
                  </Link>
                )
              ) : (
                /* admin: คงเมนูเดิม (ลิงก์ผู้ดูแล + UserMenu) */
                <ul className="flex flex-col gap-2 mt-4">
                  {navLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive(link.href) ? "bg-slate-600 text-white" : "hover:bg-slate-700 hover:text-white"}`}
                      >
                        <span className="text-xl">{link.icon}</span>
                        <span className="font-medium">{link.label}</span>
                      </Link>
                    </li>
                  ))}
                  {user && (
                    <li className="mt-2 px-2">
                      <div className="bg-red-600 text-white px-3 py-2 rounded text-xs mb-2">
                        🔑 Admin: {user.email}
                      </div>
                      <UserMenu user={user} />
                    </li>
                  )}
                </ul>
              )}

              {/* ที่ตั้งร้าน — มือถือ (โชว์ทุกคนในเมนู hamburger) */}
              <Link
                href="/location"
                onClick={() => setIsMenuOpen(false)}
                className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${isActive("/location") ? "bg-amber-500 text-white" : "bg-amber-200/70 hover:bg-amber-200 text-amber-900"}`}
              >
                <span>📍</span>
                <span>ที่ตั้งร้าน</span>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ✅ Bottom Navigation — Home / Menu / Cart / Search (มือถือ/แท็บเล็ต) */}
      {!isAdmin && (
        <nav className="xl:hidden fixed inset-x-0 bottom-0 z-40 bg-amber-100/90 backdrop-blur-xl backdrop-saturate-150 border-t border-amber-900/10 shadow-[0_-2px_10px_rgba(0,0,0,0.15)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex">
            {/* Home */}
            <Link
              href="/"
              aria-label="Home"
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${pathname === "/" ? "text-amber-700" : "text-amber-800/60 hover:text-amber-900"}`}
            >
              {pathname === "/" && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-amber-500" />
              )}
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h3v-6h4v6h3a1 1 0 001-1v-9" />
              </svg>
              <span className="text-[10px] font-medium leading-none">Home</span>
            </Link>

            {/* Menu */}
            <Link
              href="/menu"
              aria-label="Menu"
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${onMenuPage ? "text-amber-700" : "text-amber-800/60 hover:text-amber-900"}`}
            >
              {onMenuPage && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-amber-500" />
              )}
              <svg className="w-6 h-6 transition-transform active:scale-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 18.5h17" />
                <path d="M5.5 18.5C5.5 12 8.4 8.5 12 8.5C15.6 8.5 18.5 12 18.5 18.5" />
                <path d="M12 8.5V6" />
                <circle cx="12" cy="4.9" r="1.15" fill="currentColor" stroke="none" />
              </svg>
              <span className="text-[10px] font-medium leading-none">Menu</span>
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              aria-label="Cart"
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${isActive("/cart") ? "text-amber-700" : "text-amber-800/60 hover:text-amber-900"}`}
            >
              {isActive("/cart") && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-amber-500" />
              )}
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-[10px] font-medium leading-none">Cart</span>
            </Link>

            {/* Search */}
            <button
              type="button"
              onClick={() => {
                setShowSearch(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              aria-label="Search"
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors text-amber-800/60 hover:text-amber-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-[10px] font-medium leading-none">Search</span>
            </button>
          </div>
        </nav>
      )}
    </>
  );
}