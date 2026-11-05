"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchOrderDetail } from "./orderApi";
import type { Order, OrderItem } from "./types";

/** โมดัลที่เปิดค้างต้องรีเฟรชด้วย — ไม่งั้นแอดมินจะเห็นข้อมูลก่อนลูกค้าแจ้งโอน/ก่อนอนุมัติคำขอยกเลิก */
const POLL_MS = 2000;

/** รายละเอียด order ที่เปิดดูอยู่ (โมดัล) */
export function useOrderDetail() {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  /** id ที่เปิดอยู่จริง — คำตอบที่มาหลังปิดโมดัลจะไม่เปิดโมดัลกลับขึ้นมา */
  const openId = useRef<number | null>(null);

  const load = useCallback(async (orderId: number, background: boolean) => {
    if (!background) setLoading(true);
    try {
      const result = await fetchOrderDetail(orderId);
      if (result.ok && openId.current === orderId) {
        setOrder(result.data.order);
        setItems(result.data.items || []);
      }
    } catch (error) {
      if (!background) console.error("Error fetching order detail:", error);
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  const open = useCallback(
    (orderId: number) => {
      openId.current = orderId;
      load(orderId, false);
    },
    [load],
  );

  const close = useCallback(() => {
    openId.current = null;
    setOrder(null);
  }, []);

  /** โหลดใหม่ถ้า order นี้เปิดอยู่ (หลังกดเปลี่ยนสถานะ/คืนเงิน) */
  const reloadIfOpen = useCallback(
    (orderId: number) => {
      if (openId.current === orderId) load(orderId, false);
    },
    [load],
  );

  /** อัปเดตยอดทันทีจากคำตอบของ backend ไม่ต้องรอ poll รอบถัดไป */
  const applyTotals = useCallback((subtotal: number, total: number) => {
    setOrder((prev) => (prev ? { ...prev, subtotal, total } : prev));
  }, []);

  const orderId = order?.id;
  useEffect(() => {
    if (orderId === undefined) return;
    const interval = setInterval(() => load(orderId, true), POLL_MS);
    return () => clearInterval(interval);
  }, [orderId, load]);

  return { order, items, setItems, loading, open, close, reloadIfOpen, applyTotals };
}
