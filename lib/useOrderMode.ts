"use client";

import { useSyncExternalStore } from "react";
import { currentCartMode, type CartMode } from "@/lib/cart";

/** หน้าเลือกโหมด (order-mode) ยิง event นี้ทุกครั้งที่ลูกค้าสลับโหมด */
const ORDER_MODE_CHANGED = "orderModeChanged";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(ORDER_MODE_CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ORDER_MODE_CHANGED, onChange);
  };
};

/**
 * โหมดที่ลูกค้าเลือกอยู่ (สั่งกลับบ้าน / ทานในร้าน) — อัปเดตเองเมื่อสลับโหมด
 *
 * ฝั่ง server render ถือเป็น online เสมอ (ไม่มี localStorage)
 */
export const useOrderMode = (): CartMode =>
  useSyncExternalStore(subscribe, currentCartMode, () => "online");

/**
 * ค่าที่หน้าเลือกโหมดเก็บไว้ใน localStorage (เช่น tableNo, dineType) — อัปเดตเองเมื่อสลับโหมด
 *
 * ฝั่ง server render ได้สตริงว่าง
 */
export const useStoredValue = (key: string): string =>
  useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) ?? "",
    () => "",
  );
