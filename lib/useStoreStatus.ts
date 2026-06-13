"use client";

import { useState, useEffect } from "react";
import { api } from "./api";

export interface StoreStatus {
  onlineOrdering: boolean;
  message: string;
  reopenAt: string;
  loading: boolean;
  /** อยู่โหมดทานในร้าน (orderMode === "dinein") */
  isDineIn: boolean;
  /** ควรบล็อกการสั่งไหม = ปิดรับออนไลน์ และ ไม่ได้อยู่โหมด dine-in */
  blockOnline: boolean;
}

interface StatusResponse {
  onlineOrdering?: boolean;
  message?: string;
  reopenAt?: string;
}

// เช็คสถานะซ้ำทุกกี่มิลลิวินาที (ปรับได้ — เลขน้อยลง = อัปเดตไวขึ้นแต่ยิง request ถี่ขึ้น)
const POLL_MS = 6000;

/**
 * อ่านสถานะเปิด/ปิดรับออเดอร์ออนไลน์ + รู้ว่ากำลังทานในร้านหรือไม่
 *  - poll ซ้ำทุก POLL_MS วินาที และเช็คซ้ำทันทีเมื่อกลับมาโฟกัสที่แท็บ
 *    → admin กดเปิด/ปิด แล้วฝั่งลูกค้าอัปเดตเองโดยไม่ต้อง refresh
 *  - การปิดรับ "ออนไลน์" ไม่กระทบลูกค้าที่นั่งทานในร้าน (dine-in)
 *  - ถ้าเช็คไม่ได้ (network พลาด) ถือว่า "เปิด" ไว้ก่อน — ด่านจริงอยู่ที่ backend
 */
export function useStoreStatus(): StoreStatus {
  const [data, setData] = useState({
    onlineOrdering: true,
    message: "",
    reopenAt: "",
    loading: true,
  });
  const [isDineIn, setIsDineIn] = useState(false);

  useEffect(() => {
    let alive = true;

    const fetchStatus = async () => {
      try {
        const d = await api.get<StatusResponse>("/api/store/status", {
          noAuth: true,
        });
        if (alive) {
          setData({
            onlineOrdering: d.onlineOrdering !== false,
            message: d.message || "",
            reopenAt: d.reopenAt || "",
            loading: false,
          });
        }
      } catch {
        if (alive) setData((s) => ({ ...s, loading: false }));
      }
    };

    fetchStatus(); // ครั้งแรกตอน mount

    const interval = setInterval(fetchStatus, POLL_MS); // เช็คซ้ำเรื่อยๆ

    // กลับมาที่แท็บ/โฟกัสหน้าต่าง → เช็คทันที (รู้สึกอัปเดตทันที)
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchStatus();
    };
    window.addEventListener("focus", fetchStatus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener("focus", fetchStatus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    const check = () =>
      setIsDineIn(localStorage.getItem("orderMode") === "dinein");
    check();
    window.addEventListener("storage", check);
    window.addEventListener("orderModeChanged", check);
    return () => {
      window.removeEventListener("storage", check);
      window.removeEventListener("orderModeChanged", check);
    };
  }, []);

  return {
    ...data,
    isDineIn,
    blockOnline: !data.onlineOrdering && !isDineIn,
  };
}