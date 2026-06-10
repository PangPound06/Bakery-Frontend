"use client";

import { useState, useEffect } from "react";
import { api } from "./api";

export interface StoreStatus {
  onlineOrdering: boolean;
  message: string;
  reopenAt: string;
  loading: boolean;
}

interface StatusResponse {
  onlineOrdering?: boolean;
  message?: string;
  reopenAt?: string;
}

/**
 * อ่านสถานะเปิด/ปิดรับออเดอร์ออนไลน์ (public endpoint)
 * ถ้าเช็คไม่ได้ (network พลาด) จะถือว่า "เปิด" ไว้ก่อน เพื่อไม่บล็อกลูกค้าเกินจำเป็น
 * — ด่านจริงอยู่ที่ backend (POST /api/orders จะตอบ 403 ถ้าปิด)
 */
export function useStoreStatus(): StoreStatus {
  const [status, setStatus] = useState<StoreStatus>({
    onlineOrdering: true,
    message: "",
    reopenAt: "",
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.get<StatusResponse>("/api/store/status", {
          noAuth: true,
        });
        if (alive) {
          setStatus({
            onlineOrdering: data.onlineOrdering !== false,
            message: data.message || "",
            reopenAt: data.reopenAt || "",
            loading: false,
          });
        }
      } catch {
        if (alive) setStatus((s) => ({ ...s, loading: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return status;
}