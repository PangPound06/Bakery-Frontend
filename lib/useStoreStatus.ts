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

/**
 * อ่านสถานะเปิด/ปิดรับออเดอร์ออนไลน์ + รู้ว่ากำลังทานในร้านหรือไม่
 * การปิดรับ "ออนไลน์" จะไม่กระทบลูกค้าที่นั่งทานในร้าน (dine-in)
 * ถ้าเช็คสถานะไม่ได้ (network พลาด) ถือว่า "เปิด" ไว้ก่อน — ด่านจริงอยู่ที่ backend
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
    (async () => {
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
    })();
    return () => {
      alive = false;
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