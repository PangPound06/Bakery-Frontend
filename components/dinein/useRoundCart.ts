"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authHeaders } from "@/lib/auth";
import { cartUrl } from "@/lib/cart";
import { UnauthorizedError } from "@/lib/dineIn";
import type { CartItem, CartResponse } from "@/types/cart";
import type { MenuChoice, MenuProduct } from "./menu";

/**
 * รอบที่กำลังเลือก = ตะกร้าทานในร้านของลูกค้า (tb_cart, cart_mode = dinein)
 *
 * เก็บที่ server ไม่ใช่ในเครื่อง — ส่งรอบเมื่อไหร่ backend อ่านรายการและคิดราคาจากตะกร้าเอง
 * ทุกคำสั่งทำทีละอย่าง (busy) กันกดรัวจนจำนวนเพี้ยน
 */
export function useRoundCart(onUnauthorized: () => void) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(cartUrl("", "dinein"), { headers: authHeaders() });
      if (res.status === 401) throw new UnauthorizedError();
      if (!res.ok) throw new Error(`cart ${res.status}`);
      const data: CartResponse = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setSubtotal(typeof data.totalAmount === "number" ? data.totalAmount : 0);
    } catch (e) {
      if (e instanceof UnauthorizedError) onUnauthorized();
      else setError("โหลดรายการในรอบนี้ไม่สำเร็จ");
    } finally {
      setLoaded(true);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    // setState เกิดหลัง await ใน load ไม่ใช่ใน effect ตรงๆ
    void load();
  }, [load]);

  /** ทำคำสั่งหนึ่งอย่างแล้วโหลดรอบใหม่ — คืน false ถ้าไม่สำเร็จ (ข้อความอยู่ใน error) */
  const run = useCallback(
    async (request: () => Promise<Response>): Promise<boolean> => {
      if (busyRef.current) return false;
      busyRef.current = true;
      setBusy(true);
      setError("");
      try {
        const res = await request();
        if (res.status === 401) throw new UnauthorizedError();
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(typeof data.error === "string" ? data.error : "ทำรายการไม่สำเร็จ กรุณาลองใหม่");
          await load();
          return false;
        }
        await load();
        return true;
      } catch (e) {
        if (e instanceof UnauthorizedError) onUnauthorized();
        else setError("เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่");
        return false;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [load, onUnauthorized],
  );

  const add = useCallback(
    (product: MenuProduct, choice: MenuChoice) =>
      run(() =>
        fetch(cartUrl("/add", "dinein"), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            productId: product.id,
            name: product.name,
            price: choice.unitPrice,
            category: product.category,
            image: product.image,
            quantity: choice.pieces,
            selectedOption: choice.optionLabel,
          }),
        }),
      ),
    [run],
  );

  /** ตั้งจำนวนใหม่ (สินค้าที่ไม่ใช่เค้กปอนด์ — 1 หน่วย = 1 ชิ้น) / 0 = เอาออก */
  const setQuantity = useCallback(
    (item: CartItem, quantity: number) =>
      run(() =>
        quantity <= 0
          ? fetch(cartUrl(`/${item.id}`, "dinein"), { method: "DELETE", headers: authHeaders() })
          : fetch(cartUrl(`/${item.id}`, "dinein"), {
              method: "PUT",
              headers: { "Content-Type": "application/json", ...authHeaders() },
              body: JSON.stringify({ quantity }),
            }),
      ),
    [run],
  );

  const remove = useCallback((item: CartItem) => setQuantity(item, 0), [setQuantity]);

  return { items, subtotal, loaded, busy, error, clearError: () => setError(""), reload: load, add, setQuantity, remove };
}
