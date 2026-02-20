"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface UserMenuProps {
  user: {
    email: string;
    fullname?: string;
  };
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // ตรวจสอบว่าเป็น Admin หรือไม่
    setIsAdmin(user.email?.endsWith("@empbakery.com") || false);

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, user.email]);

  const handleLogout = () => {
    const confirmed = window.confirm("คุณต้องการออกจากระบบหรือไม่?");

    if (confirmed) {
      // ลบข้อมูลทั้งหมด
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // แจ้งเตือน
      alert("ออกจากระบบสำเร็จ! 👋");

      // ใช้ window.location.href เพื่อ refresh หน้าใหม่ทั้งหมด
      window.location.href = "/login";
    }
  };

  const getInitials = () => {
    if (user.fullname) {
      return user.fullname
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email.charAt(0).toUpperCase();
  };

  // เมนูสำหรับ User ทั่วไป
  const userMenuItems = [
    { href: "/user/profile", label: "ข้อมูลส่วนตัว", icon: "profile" },
    { href: "/user/orders", label: "รายการสั่งซื้อ", icon: "orders" },
    {
      href: "/user/profile/search-order",
      label: "ค้นหาคำสั่งซื้อ",
      icon: "search",
    },
    { href: "/user/favorites", label: "รายการโปรด", icon: "favorites" },
    { href: "/user/settings", label: "ตั้งค่า", icon: "settings" },
  ];

  // เมนูสำหรับ Admin
  const adminMenuItems = [
    { href: "/admin/account", label: "ข้อมูลส่วนตัว", icon: "profile" },
    { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/admin/reports", label: "รายงาน", icon: "orders" },
    { href: "/admin/users", label: "จัดการผู้ใช้", icon: "users" },
  ];

  const menuItems = isAdmin ? adminMenuItems : userMenuItems;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "profile":
        return (
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        );
      case "orders":
        return (
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        );
      case "search":
        return (
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-amber-600"
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
        );
      case "favorites":
        return (
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        );
      case "settings":
        return (
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        );
      case "dashboard":
        return (
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        );
      case "users":
        return (
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isAdmin ? "hover:bg-slate-700" : "hover:bg-amber-800"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm border-2 ${
            isAdmin
              ? "bg-slate-600 border-slate-500"
              : "bg-amber-500 border-amber-400"
          }`}
        >
          {getInitials()}
        </div>

        <span className="text-white text-sm font-medium hidden md:block max-w-[150px] truncate">
          {user.email}
        </span>

        <svg
          className={`w-4 h-4 text-white transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl py-2 z-50 border border-gray-200 overflow-hidden">
          <div
            className={`px-4 py-3 border-b border-gray-200 ${
              isAdmin
                ? "bg-gradient-to-r from-slate-50 to-gray-50"
                : "bg-gradient-to-r from-amber-50 to-orange-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 ${
                  isAdmin
                    ? "bg-slate-600 border-slate-500"
                    : "bg-amber-500 border-amber-400"
                }`}
              >
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {user.fullname || "ผู้ใช้งาน"}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                {isAdmin && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="py-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors group ${
                  isAdmin ? "hover:bg-slate-50" : "hover:bg-amber-50"
                }`}
              >
                {getIcon(item.icon)}
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="border-t border-gray-200 py-1 mt-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full group"
            >
              <svg
                className="w-5 h-5 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="font-semibold">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
