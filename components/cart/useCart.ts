"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authHeaders, getToken } from "@/lib/auth";
import { cartUrl, type CartMode } from "@/lib/cart";
import type { CartResponse } from "@/types/cart";

/**
 * ตะกร้าใบหนึ่ง — โหลด แก้จำนวน ลบ ล้าง
 *
 * การถามยืนยันก่อนลบเป็นหน้าที่ของหน้าจอ (Dialog) hook นี้ทำตามคำสั่งเลย
 * ยังไม่ login → ไปหน้า login / token หมดอายุ (401) → ล้าง token แล้วไปหน้า login
 */
export function useCart(mode: CartMode) {
  const router = useRouter();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  /** id ของแถวที่กำลังแก้ / "all" = กำลังล้างตะกร้า */
  const [busyId, setBusyId] = useState<number | "all" | null>(null);
  const [error, setError] = useState("");

  const toLogin = useCallback(() => {
    localStorage.removeItem("token");
    router.replace("/login");
  }, [router]);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    try {
      const res = await fetch(cartUrl("", mode), { headers: authHeaders() });
      if (res.status === 401) return toLogin();
      if (res.ok) setCart(await res.json());
      else setError("โหลดตะกร้าไม่สำเร็จ กรุณาลองใหม่");
    } catch {
      setError("เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }, [mode, router, toLogin]);

  useEffect(() => {
    // setState เกิดหลัง await ใน refresh ไม่ใช่ใน effect ตรงๆ
    void refresh();
  }, [refresh]);

  /** ส่งคำสั่งหนึ่งอย่างแล้วโหลดตะกร้าใหม่ — ข้อความผิดพลาดจาก server แสดงใน error */
  const run = async (target: number | "all", request: () => Promise<Response>) => {
    setBusyId(target);
    setError("");
    try {
      const res = await request();
      if (res.status === 401) return toLogin();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "ทำรายการไม่สำเร็จ กรุณาลองใหม่");
      }
      await refresh();
    } catch {
      setError("เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่");
    } finally {
      setBusyId(null);
    }
  };

  const updateQuantity = (cartId: number, quantity: number) => {
    if (quantity < 1) return;
    return run(cartId, () =>
      fetch(cartUrl(`/${cartId}`, mode), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ quantity }),
      }),
    );
  };

  const removeItem = (cartId: number) =>
    run(cartId, () => fetch(cartUrl(`/${cartId}`, mode), { method: "DELETE", headers: authHeaders() }));

  const clearAll = () => run("all", () => fetch(cartUrl("/clear", mode), { method: "DELETE", headers: authHeaders() }));

  return { cart, loading, busyId, error, refresh, updateQuantity, removeItem, clearAll };
}
