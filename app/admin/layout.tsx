"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/layout/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setCollapsed(detail.collapsed);
    };
    window.addEventListener("sidebarToggle", handler);
    return () => window.removeEventListener("sidebarToggle", handler);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar
        onToggle={(c: boolean) =>
          window.dispatchEvent(
            new CustomEvent("sidebarToggle", { detail: { collapsed: c } }),
          )
        }
      />
      <main
        className={`flex-1 min-w-0 transition-all duration-300 ${collapsed ? "pl-[72px]" : "pl-60"}`}
      >
        {children}
      </main>
    </div>
  );
}
