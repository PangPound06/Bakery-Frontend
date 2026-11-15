"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import UserMenu from "@/components/ui/UserMenu";
import Swal from "sweetalert2";
import type { ApiProduct } from "@/types/product";
import { authHeaders } from "@/lib/auth";
import { CART_PAGE } from "@/lib/cart";
import { useOrderMode } from "@/lib/useOrderMode";

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

interface SearchablePage extends PageResult {
  keywords: string[];
}

/** หน้าที่ค้นหาได้จากช่องค้นหา (หน้าหมวดหมู่เติมเพิ่มตอน runtime) */
const STATIC_USER_PAGES: SearchablePage[] = [
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
];

/** true เฉพาะตอนรันในเบราว์เซอร์ — ใช้กัน hydration mismatch แทน useEffect(setMounted) */
const subscribeNoop = () => () => {};
const useIsClient = () =>
  useSyncExternalStore(subscribeNoop, () => true, () => false);

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
  // ตะกร้าสั่งกลับบ้านกับทานในร้านอยู่คนละหน้า
  const cartHref = CART_PAGE[useOrderMode()];

  // ✅ Dynamic categories
  const [categories, setCategories] = useState<Category[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
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
    { href: cartHref, label: "Cart", icon: "🛒" },
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
  const userPages = useMemo<SearchablePage[]>(
    () => [
      ...STATIC_USER_PAGES,
      ...categories.map((cat) => ({
        href: `/${cat.slug}`,
        label: `หน้า ${cat.name}`,
        icon: cat.icon,
        keywords: [cat.slug, cat.name.toLowerCase()],
      })),
    ],
    [categories],
  );

  // ผลค้นหาคำนวณจากคำค้นโดยตรง — ไม่ต้องเก็บเป็น state แยก
  const query = searchQuery.toLowerCase().trim();
  const searchResults = useMemo<SearchResult[]>(
    () =>
      query === ""
        ? []
        : allProducts
            .filter(
              (p) =>
                p.name.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query),
            )
            .slice(0, 10),
    [query, allProducts],
  );
  const pageResults = useMemo<PageResult[]>(
    () =>
      query === ""
        ? []
        : userPages.filter(
            (page) =>
              page.label.toLowerCase().includes(query) ||
              page.keywords.some((kw) => kw.toLowerCase().includes(query)),
          ),
    [query, userPages],
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowResults(value.trim() !== "");
  };

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
            data.map((p: ApiProduct) => ({
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

  const userEmail = user?.email;
  useEffect(() => {
    if (!userEmail || isAdmin) return;
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const fetchProfileImage = async () => {
      try {
        // /me อ่านตัวตนจาก token — เดิมเรียก /api/profile/{id} โดยไม่แนบ token จึงได้ 401 ทุกครั้ง
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/profile/me`,
          { headers: authHeaders() },
        );
        if (res.ok) {
          const data = await res.json();
          const newImage =
            data.success && data.profile?.profileImage
              ? data.profile.profileImage
              : "";
          if (newImage !== (userData.profileImage || "")) {
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
  }, [userEmail, isAdmin]);

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
      confirmButtonColor: "#a84a0e",
      cancelButtonColor: "#6b5e52",
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
    onMenuPage || (pathname?.startsWith(cartHref) ?? false) || showSearch;
  const hasAnyResults = searchResults.length > 0 || pageResults.length > 0;

  const mounted = useIsClient();
  if (!mounted) return <nav className="sticky top-0 z-50 h-[72px] border-b border-line bg-cream/80 backdrop-blur-xl" />;
  if (pathname?.startsWith("/admin")) return null;

  const renderSearchDropdown = () => {
    if (!showResults || searchQuery.trim() === "") return null;
    return (
      <div className="bg-white rounded-xl shadow-2xl border border-line overflow-hidden">
        {pageResults.length > 0 && (
          <div>
            <div className="px-3 py-2 bg-sand border-b border-line">
              <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">
                หน้า
              </p>
            </div>
            {pageResults.map((page) => (
              <button
                key={page.href}
                onClick={() => handlePageSelect(page)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-warn-bg transition-colors text-left"
              >
                <span className="w-8 h-8 rounded-lg bg-warn-soft flex items-center justify-center text-base flex-shrink-0">
                  {page.icon}
                </span>
                <span className="text-sm font-medium text-body">
                  {page.label}
                </span>
                <svg
                  className="w-4 h-4 text-faint ml-auto flex-shrink-0"
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
            <div className="px-3 py-2 bg-sand border-b border-line">
              <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">
                สินค้า ({searchResults.length} รายการ)
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSearchSelect(product)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-warn-bg transition-colors text-left"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-body truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted">{product.category}</p>
                  </div>
                  <span className="text-sm font-semibold text-brick flex-shrink-0">
                    ฿{product.price}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {!hasAnyResults && (
          <div className="p-6 text-center">
            <p className="text-muted text-sm">
              ไม่พบผลลัพธ์สำหรับ &quot;{searchQuery}&quot;
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-cream/80 backdrop-blur-xl backdrop-saturate-150 border-b border-line text-ink font-body">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <Link
              href={isAdmin ? "/admin/dashboard" : "/"}
              className="font-display text-xl sm:text-[22px] font-bold tracking-tight text-ink hover:text-brick transition-colors flex items-center gap-2"
            >
              {isAdmin ? (
                <>
                  <span>🏪</span>
                  <span>Pound Bakery</span>
                </>
              ) : (
                <>Pound Bakery</>
              )}
            </Link>

            <ul className="hidden xl:flex mx-auto gap-1 rounded-full border border-line bg-white p-1.5 text-[15px] font-medium">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-colors whitespace-nowrap ${isActive(link.href) ? "bg-ink text-cream" : "hover:bg-sand"}`}
                  >
                    <span className="hidden" aria-hidden="true">{link.icon}</span>
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
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onFocus={() =>
                          searchQuery.trim() && setShowResults(true)
                        }
                        placeholder="ค้นหา"
                        className="w-44 lg:w-56 px-4 py-2 pl-9 rounded-full bg-white border border-line text-ink placeholder-faint/50 text-sm focus:outline-none focus:ring-2 focus:ring-brick focus:bg-white transition-all"
                      />
                      <svg
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-body/70"
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
                    className={`${minimalHeader ? "hidden" : "xl:hidden"} p-2 rounded-full hover:bg-sand transition-colors`}
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
                      {renderSearchDropdown()}
                    </div>
                  )}
                </div>
              )}

              {/* ที่ตั้งร้าน — เดสก์ท็อป (แถบเดียวกับ UserMenu) */}
              <Link
                href="/location"
                className={`hidden xl:flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors hover:bg-sand hover:text-ink ${isActive("/location") ? "bg-ink text-cream" : ""}`}
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
                    <span className="hidden xl:inline-block bg-error text-white text-xs px-2 py-1 rounded-full font-semibold">
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
                  className="hidden xl:block bg-brick hover:bg-brick-hover text-white px-5 py-2.5 rounded-full font-semibold transition-colors"
                >
                  🔐 Login
                </Link>
              )}

              {/* ✅ ตะกร้าสินค้า — มือถือ/แท็บเล็ต อยู่ข้างปุ่มค้นหา */}
              {!isAdmin && (
                <Link
                  href={cartHref}
                  aria-label="ตะกร้าสินค้า"
                  className={`${minimalHeader ? "hidden" : "xl:hidden"} p-2 rounded-full transition-colors hover:bg-sand hover:text-ink ${isActive(cartHref) ? "bg-ink text-cream" : ""}`}
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
                className={`xl:hidden p-2 rounded-full transition-colors ${isAdmin ? "hover:bg-body" : "hover:bg-sand"}`}
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
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => searchQuery.trim() && setShowResults(true)}
                  placeholder="ค้นหาสินค้า, หน้า..."
                  autoFocus
                  className="w-full px-4 py-2.5 pl-9 rounded-full bg-white border border-line text-ink placeholder-faint/50 text-base focus:outline-none focus:ring-2 focus:ring-brick"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-body/70"
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
                  {renderSearchDropdown()}
                </div>
              )}
            </div>
          )}

          {/* ✅ เมนู hamburger (มือถือ) → ข้อมูล/เมนูบัญชีผู้ใช้ */}
          {isMenuOpen && (
            <div className="xl:hidden pb-4 border-t border-line">
              {!isAdmin ? (
                user ? (
                  <div className="mt-4 bg-white rounded-xl shadow-2xl overflow-hidden">
                    {/* หัวการ์ด: โปรไฟล์ */}
                    <div className="px-4 py-3 border-b border-line bg-cream   flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 overflow-hidden bg-brick border-line-strong">
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
                        <p className="text-sm font-semibold text-body truncate">
                          {user.fullname || "ผู้ใช้งาน"}
                        </p>
                        <p className="text-xs text-brick truncate">
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
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-body hover:bg-warn-bg transition-colors"
                        >
                          <span className="w-6 text-center text-lg">
                            {item.icon}
                          </span>
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      ))}
                    </div>

                    {/* ออกจากระบบ */}
                    <div className="border-t border-line py-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-danger-soft transition-colors w-full"
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
                    className="mt-4 w-full bg-brick hover:bg-brick-hover text-white px-4 py-3 rounded-full font-semibold transition-colors flex items-center justify-center gap-2"
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
                        className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 ${isActive(link.href) ? "bg-ink text-cream" : "hover:bg-sand"}`}
                      >
                        <span className="text-xl">{link.icon}</span>
                        <span className="font-medium">{link.label}</span>
                      </Link>
                    </li>
                  ))}
                  {user && (
                    <li className="mt-2 px-2">
                      <div className="bg-error text-white px-3 py-2 rounded text-xs mb-2">
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
                className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full font-semibold transition-colors ${isActive("/location") ? "bg-ink text-cream" : "bg-sand hover:bg-line text-ink"}`}
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
        <nav className="xl:hidden fixed inset-x-0 bottom-0 z-40 bg-cream/95 backdrop-blur-xl backdrop-saturate-150 border-t border-line font-body pb-[env(safe-area-inset-bottom)]">
          <div className="flex">
            {/* Home */}
            <Link
              href="/"
              aria-label="Home"
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${pathname === "/" ? "text-brick" : "text-muted hover:text-ink"}`}
            >
              {pathname === "/" && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-brick" />
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
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${onMenuPage ? "text-brick" : "text-muted hover:text-ink"}`}
            >
              {onMenuPage && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-brick" />
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
              href={cartHref}
              aria-label="Cart"
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${isActive(cartHref) ? "text-brick" : "text-muted hover:text-ink"}`}
            >
              {isActive(cartHref) && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-brick" />
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
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors text-muted hover:text-ink"
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