"use client";

import { useEffect, useRef } from "react";
import { getToken } from "./auth";
import { Reservation } from "@/types/reservation";

/**
 * Polling reservation list ทุก ๆ N วินาที สำหรับหน้า admin
 * 
 * - ส่ง list ล่าสุดทั้งหมดผ่าน callback
 * - หยุด poll เมื่อ tab ถูกซ่อน (กัน request เปล่า)
 * - คืน function cleanup เมื่อ component unmount
 */
export function useReservationPolling(
  onUpdate: (data: Reservation[]) => void,
  intervalMs = 3000,
  enabled = true,
) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled) return;
    const token = getToken();
    if (!token) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/reservations/admin/all`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok || cancelled) return;
        const data: Reservation[] = await res.json();
        if (!cancelled) onUpdateRef.current(data);
      } catch (err) {
        console.warn("[Polling] failed:", err);
      }
    };

    const id = setInterval(() => {
      if (document.hidden) return; // ไม่ poll ตอน tab ซ่อน
      poll();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, intervalMs]);
}