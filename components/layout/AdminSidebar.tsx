"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNavLinks = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    ),
  },
  {
    href: "/admin/crudproduct",
    label: "Manage products",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
        />
      </svg>
    ),
  },
  {
    href: "/admin/reservations",
    label: "Reservations",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    href: "/admin/restaurant",
    label: "Restaurant",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"
        />
      </svg>
    ),
  },
  {
    href: "/admin/order",
    label: "Orders",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
  {
    href: "/admin/top-products",
    label: "Top Products",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
    ),
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    href: "/admin/supplier",
    label: "Supplier",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Manage Users",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
  {
    href: "/admin/account",
    label: "My Account",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

interface AdminSidebarProps {
  onToggle?: (collapsed: boolean) => void;
}

export default function AdminSidebar({ onToggle }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<{
    email: string;
    fullname?: string;
    profileImage?: string;
  } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const load = () => {
      const userData = localStorage.getItem("user");
      if (userData) {
        try {
          const p = JSON.parse(userData);
          setUser({
            email: p.email,
            fullname: p.fullname || p.fullName,
            profileImage: p.profileImage || "",
          });
        } catch {
          setUser(null);
        }
      }
    };
    load();
    window.addEventListener("storage", load);
    window.addEventListener("userStatusChanged", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("userStatusChanged", load);
    };
  }, []);

  const isActive = (href: string) => pathname?.startsWith(href);

  const getInitials = () => {
    if (user?.fullname)
      return user.fullname
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    return user?.email?.charAt(0).toUpperCase() || "A";
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out ${collapsed ? "w-[72px]" : "w-60"}`}
      style={{
        background:
          "linear-gradient(180deg, #78350f 0%, #92400e 50%, #78350f 100%)",
      }}
    >
      {/* ── Logo ── */}
      <div className="flex items-center px-4 py-5 border-b border-amber-700/40 min-h-[68px]">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-3 min-w-0"
        >
          <span className="text-2xl flex-shrink-0">🏪</span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white font-bold text-base leading-tight truncate">
                Pound Bakery
              </p>
              <p className="text-amber-300/70 text-[10px] tracking-widest uppercase">
                Admin Panel
              </p>
            </div>
          )}
        </Link>
        <button
          onClick={() => {
            const next = !collapsed;
            setCollapsed(next);
            onToggle?.(next);
          }}
          className="ml-auto flex-shrink-0 w-7 h-7 rounded-lg bg-amber-700/40 hover:bg-amber-600/60 flex items-center justify-center transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 text-amber-200 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {!collapsed && (
          <p className="text-amber-400/50 text-[10px] tracking-[0.3em] uppercase px-3 pb-2 pt-1">
            เมนูหลัก
          </p>
        )}
        {adminNavLinks.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                active
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-amber-200/70 hover:bg-white/8 hover:text-white"
              }`}
            >
              {/* Active indicator */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-300 rounded-r-full" />
              )}
              <span
                className={`flex-shrink-0 transition-colors ${active ? "text-white" : "text-amber-300/70 group-hover:text-amber-200"}`}
              >
                {link.icon}
              </span>
              {!collapsed && (
                <span className="text-sm font-medium truncate">
                  {link.label}
                </span>
              )}
              {/* Tooltip when collapsed */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-amber-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-amber-700/50 z-50">
                  {link.label}
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-amber-900" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User Profile ── */}
      <div className="border-t border-amber-700/40 p-3">
        {collapsed ? (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-full bg-amber-600 border-2 border-amber-400/50 flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials()
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-600 border-2 border-amber-400/50 flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
              {user?.profileImage ? (
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
              <p className="text-white text-sm font-medium truncate">
                {user?.fullname || "Admin"}
              </p>
              <p className="text-amber-300/60 text-[11px] truncate">
                {user?.email}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
