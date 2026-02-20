"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import UserMenu from "./UserMenu";

const userNavLinks = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/bakery", label: "Bakery", icon: "🥐" },
  { href: "/drink", label: "Drink", icon: "☕" },
  { href: "/cake", label: "Cake", icon: "🎂" },
  { href: "/cart", label: "Cart", icon: "🛒" },
];

const adminNavLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/crudproduct", label: "Manage Product", icon: "📦" },
  { href: "/admin/order", label: "คำสั่งซื้อ", icon: "🛒" },
  { href: "/admin/reports", label: "รายงาน", icon: "📋" },
  { href: "/admin/users", label: "User Management", icon: "👥" },
  { href: "/admin/account", label: "บัญชี", icon: "⚙️" },
];

// ═══ User Pages สำหรับค้นหา ═══
const userPages = [
  {
    href: "/user/profile",
    label: "ข้อมูลส่วนตัว",
    icon: "👤",
    keywords: [
      "profile",
      "โปรไฟล์",
      "ข้อมูลส่วนตัว",
      "แก้ไขข้อมูล",
      "ชื่อ",
      "อีเมล",
    ],
  },
  {
    href: "/user/orders",
    label: "รายการสั่งซื้อ",
    icon: "📦",
    keywords: [
      "order",
      "orders",
      "คำสั่งซื้อ",
      "รายการสั่งซื้อ",
      "ประวัติ",
      "สั่งซื้อ",
    ],
  },
  {
    href: "/user/search-order",
    label: "ค้นหาคำสั่งซื้อ",
    icon: "🔍",
    keywords: [
      "search order",
      "ค้นหาคำสั่งซื้อ",
      "ORD",
      "หมายเลขคำสั่งซื้อ",
      "ติดตามคำสั่งซื้อ",
    ],
  },
  {
    href: "/user/favorites",
    label: "รายการโปรด",
    icon: "❤️",
    keywords: ["favorite", "favorites", "โปรด", "รายการโปรด", "ถูกใจ", "ชอบ"],
  },
  {
    href: "/user/settings",
    label: "ตั้งค่า",
    icon: "⚙️",
    keywords: ["setting", "settings", "ตั้งค่า", "การตั้งค่า", "config"],
  },
  {
    href: "/cart",
    label: "ตะกร้าสินค้า",
    icon: "🛒",
    keywords: ["cart", "ตะกร้า", "ตะกร้าสินค้า"],
  },
  {
    href: "/checkout",
    label: "ชำระเงิน",
    icon: "💳",
    keywords: ["checkout", "ชำระเงิน", "จ่ายเงิน", "payment"],
  },
  {
    href: "/bakery",
    label: "หน้า Bakery",
    icon: "🥐",
    keywords: ["bakery", "เบเกอรี่", "ขนมปัง"],
  },
  {
    href: "/drink",
    label: "หน้า Drink",
    icon: "☕",
    keywords: ["drink", "เครื่องดื่ม", "กาแฟ", "ชา"],
  },
  { href: "/cake", label: "หน้า Cake", icon: "🎂", keywords: ["cake", "เค้ก"] },
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
  const [user, setUser] = useState<{ email: string; fullname?: string } | null>(
    null,
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [pageResults, setPageResults] = useState<PageResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [allProducts, setAllProducts] = useState<SearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          const email = parsedUser.email;
          const fullname = parsedUser.fullname || parsedUser.fullName;
          if (email) {
            setUser({ email, fullname });
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
    const handler = () => checkLoginStatus();
    window.addEventListener("storage", handler);
    window.addEventListener("userStatusChanged", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("userStatusChanged", handler);
    };
  }, []);

  useEffect(() => {
    if (isAdmin) return;
    const fetchProducts = async () => {
      try {
        const res = await fetch(
          "https://bakery-backend-production-6fc9.up.railway.app/api/products",
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

  // ═══ Search logic — ค้นหาทั้งสินค้า + หน้า ═══
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setPageResults([]);
      setShowResults(false);
      return;
    }

    const q = searchQuery.toLowerCase().trim();

    // ค้นหาสินค้า — ชื่อสินค้า หรือ category
    const productResults = allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
    setSearchResults(productResults.slice(0, 10));

    // ค้นหาหน้า — label หรือ keywords
    const matchedPages = userPages.filter(
      (page) =>
        page.label.toLowerCase().includes(q) ||
        page.keywords.some((kw) => kw.toLowerCase().includes(q)),
    );
    setPageResults(matchedPages);

    setShowResults(true);
  }, [searchQuery, allProducts]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSelect = (product: SearchResult) => {
    setSearchQuery("");
    setShowResults(false);
    setShowSearch(false);
    router.push(
      `/${product.category.toLowerCase()}/${encodeURIComponent(product.name)}`,
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

    // ถ้าพิมพ์ ORD... → ไปหน้าค้นหาคำสั่งซื้อเลย
    if (searchQuery.trim().toUpperCase().startsWith("ORD")) {
      setSearchQuery("");
      setShowResults(false);
      setShowSearch(false);
      router.push(
        `/user/profile/search-order?q=${searchQuery.trim().toUpperCase()}`,
      );
      return;
    }

    if (pageResults.length > 0) {
      handlePageSelect(pageResults[0]);
    } else if (searchResults.length > 0) {
      handleSearchSelect(searchResults[0]);
    }
  };

  const navLinks = isAdmin ? adminNavLinks : userNavLinks;
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  const hasAnyResults = searchResults.length > 0 || pageResults.length > 0;

  // ═══ Dropdown Component (ใช้ร่วม Desktop + Mobile) ═══
  const SearchDropdown = () => {
    if (!showResults || searchQuery.trim() === "") return null;

    return (
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Page Results */}
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
                <span className="text-sm font-medium text-gray-800">
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

        {/* Product Results */}
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
                    <p className="text-sm font-medium text-gray-800 truncate">
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

        {/* No Results */}
        {!hasAnyResults && (
          <div className="p-6 text-center">
            <p className="text-gray-400 text-sm">
              ไม่พบผลลัพธ์สำหรับ "{searchQuery}"
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="bg-amber-900 text-white shadow-lg">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center py-3 sm:py-4">
          {/* Logo */}
          <Link
            href={isAdmin ? "/admin/dashboard" : "/"}
            className="text-xl sm:text-2xl font-bold text-amber-100 hover:text-white transition-colors flex items-center gap-2"
          >
            {isAdmin ? (
              <>
                <span>🏪</span>
                <span>My Bakery</span>
              </>
            ) : (
              <>🧁 My Bakery</>
            )}
          </Link>

          {/* Desktop Menu */}
          <ul className="hidden lg:flex gap-4 xl:gap-6 text-base font-medium flex-1 justify-center">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive(link.href)
                      ? isAdmin
                        ? "bg-slate-600 text-white"
                        : "bg-amber-700 text-white"
                      : isAdmin
                        ? "hover:bg-slate-700 hover:text-amber-200"
                        : "hover:bg-amber-800 hover:text-amber-200"
                  }`}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search (User only) */}
            {!isAdmin && (
              <div ref={searchRef} className="relative">
                {/* Desktop */}
                <div className="hidden sm:block">
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchQuery.trim() && setShowResults(true)}
                      placeholder="ค้นหา"
                      className="w-44 lg:w-56 px-4 py-2 pl-9 rounded-lg bg-amber-800/60 border border-amber-700/50 text-white placeholder-amber-300/60 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-amber-800 transition-all"
                    />
                    <svg
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/70"
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

                {/* Mobile toggle */}
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="sm:hidden p-2 rounded-lg hover:bg-amber-800 transition-colors"
                  aria-label="Search"
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
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>

                {/* Desktop Dropdown */}
                {showResults && (
                  <div className="absolute right-0 sm:left-0 top-full mt-2 w-80 z-50 hidden sm:block">
                    <SearchDropdown />
                  </div>
                )}
              </div>
            )}

            {/* Auth */}
            {user ? (
              <>
                {isAdmin && (
                  <span className="hidden sm:inline-block bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                    Admin
                  </span>
                )}
                <div className="hidden sm:block">
                  <UserMenu user={user} />
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="hidden sm:block bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
              >
                🔐 Login
              </Link>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`lg:hidden p-2 rounded-lg transition-colors ${isAdmin ? "hover:bg-slate-700" : "hover:bg-amber-800"}`}
              aria-label="Toggle menu"
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

        {/* Mobile Search (expanded) */}
        {showSearch && !isAdmin && (
          <div className="sm:hidden pb-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim() && setShowResults(true)}
                placeholder="ค้นหาสินค้า, หน้า..."
                autoFocus
                className="w-full px-4 py-2.5 pl-9 rounded-lg bg-amber-800/60 border border-amber-700/50 text-white placeholder-amber-300/60 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/70"
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
            {/* Mobile Dropdown */}
            {showResults && (
              <div className="mt-2">
                <SearchDropdown />
              </div>
            )}
          </div>
        )}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div
            className={`lg:hidden pb-4 border-t ${isAdmin ? "border-slate-700" : "border-amber-800"}`}
          >
            <ul className="flex flex-col gap-2 mt-4">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive(link.href)
                        ? isAdmin
                          ? "bg-slate-600 text-white"
                          : "bg-amber-700 text-white"
                        : isAdmin
                          ? "hover:bg-slate-700 hover:text-amber-200"
                          : "hover:bg-amber-800 hover:text-amber-200"
                    }`}
                  >
                    <span className="text-xl">{link.icon}</span>
                    <span className="font-medium">{link.label}</span>
                  </Link>
                </li>
              ))}
              {user ? (
                <li className="mt-2 px-2">
                  <div
                    className={`${isAdmin ? "bg-red-600" : "bg-green-600"} text-white px-3 py-2 rounded text-xs mb-2`}
                  >
                    {isAdmin ? "🔑 Admin: " : "✅ Logged in: "}
                    {user.email}
                  </div>
                  <UserMenu user={user} />
                </li>
              ) : (
                <li className="mt-2">
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    🔐 Login
                  </Link>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
