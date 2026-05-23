"use client";

import { useEffect, useRef } from "react";
import { getToken } from "./auth";

type ReservationEvent = {
  type: "CREATED" | "UPDATED" | "DELETED" | "STATUS_CHANGED";
  id: number;
  reservation: unknown; // เป็น Reservation หรือ "" (เมื่อ DELETED)
};

/**
 * Subscribe การเปลี่ยนแปลงของ reservation แบบ real-time ผ่าน SSE
 * 
 * ใช้กับ admin page เพื่อ update รายการอัตโนมัติเมื่อ:
 * - user สร้างจองใหม่ (CREATED)
 * - admin/user เปลี่ยนสถานะ/ยกเลิก (STATUS_CHANGED)
 * - admin แก้ไขข้อมูล (UPDATED)
 * - admin ลบ (DELETED)
 * 
 * Note: token ส่งผ่าน query string เพราะ EventSource API
 * ของ browser ไม่รองรับ custom header
 */
export function useReservationStream(
  onEvent: (e: ReservationEvent) => void,
  enabled = true,
) {
  // เก็บ callback ล่าสุดไว้ใน ref กัน effect re-run ทุกครั้งที่ parent re-render
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;

    const token = getToken();
    if (!token) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const url = `${baseUrl}/api/reservations/admin/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.addEventListener("connected", () => {
      console.log("[SSE] connected");
    });

    es.addEventListener("reservation", (event) => {
      try {
        const data: ReservationEvent = JSON.parse(
          (event as MessageEvent).data,
        );
        onEventRef.current(data);
      } catch (err) {
        console.error("[SSE] parse error", err);
      }
    });

    es.onerror = (err) => {
      // EventSource จะ reconnect ให้เองอัตโนมัติ
      console.warn("[SSE] connection error, will auto-reconnect", err);
    };

    return () => {
      es.close();
    };
  }, [enabled]);
}