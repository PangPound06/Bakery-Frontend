"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { authHeaders, getToken } from "@/lib/auth";
import { cartUrl, type CartMode } from "@/lib/cart";
import type { CartResponse } from "@/types/cart";

/**
 * ตะกร้าใบหนึ่ง (ออนไลน์ หรือ ทานในร้าน) — โหลด แก้จำนวน ลบ ล้าง
 *
 * ใช้ร่วมกันทั้งสองหน้าตะกร้า หน้าแต่ละหน้าแค่บอกว่าเป็นตะกร้าใบไหน
 * ยังไม่ login → ไปหน้า login / token หมดอายุ (401) → ล้าง token แล้วไปหน้า login
 */
export function useCart(mode: CartMode) {
  const router = useRouter();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  /** id ของแถวที่กำลังแก้จำนวน */
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    try {
      const res = await fetch(cartUrl("", mode), { headers: authHeaders() });
      if (res.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }
      if (res.ok) setCart(await res.json());
    } catch (error) {
      console.error("โหลดตะกร้าไม่สำเร็จ:", error);
    } finally {
      setLoading(false);
    }
  }, [mode, router]);

  useEffect(() => {
    // setState เกิดหลัง await ใน refresh ไม่ใช่ใน effect ตรงๆ
    void refresh();
  }, [refresh]);

  const updateQuantity = async (cartId: number, quantity: number) => {
    if (quantity < 1) return;
    setUpdatingId(cartId);
    try {
      const res = await fetch(cartUrl(`/${cartId}`, mode), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ quantity }),
      });
      if (res.ok) await refresh();
    } catch (error) {
      console.error("แก้จำนวนไม่สำเร็จ:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (cartId: number) => {
    const confirm = await Swal.fire({
      title: "ลบสินค้า?",
      text: "ต้องการลบสินค้านี้ออกจากตะกร้าหรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!confirm.isConfirmed) return;
    try {
      const res = await fetch(cartUrl(`/${cartId}`, mode), { method: "DELETE", headers: authHeaders() });
      if (res.ok) await refresh();
    } catch (error) {
      console.error("ลบสินค้าไม่สำเร็จ:", error);
    }
  };

  const clearAll = async () => {
    const confirm = await Swal.fire({
      title: "ล้างตะกร้า?",
      text: "ต้องการลบสินค้าทั้งหมดออกจากตะกร้าหรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ล้างตะกร้า",
      cancelButtonText: "ยกเลิก",
    });
    if (!confirm.isConfirmed) return;
    try {
      const res = await fetch(cartUrl("/clear", mode), { method: "DELETE", headers: authHeaders() });
      if (res.ok) await refresh();
    } catch (error) {
      console.error("ล้างตะกร้าไม่สำเร็จ:", error);
    }
  };

  return { cart, loading, updatingId, refresh, updateQuantity, removeItem, clearAll };
}
