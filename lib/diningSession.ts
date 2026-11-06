"use client";

import { useEffect, useState } from "react";
import { authHeaders } from "@/lib/auth";

/**
 * มื้อทานในร้านที่กำลังดำเนินอยู่ — ใช้แสดงเวลาบุฟเฟต์ที่เหลือ
 *
 * เวลาที่เหลือคิดที่ server (GET /api/dinein/session) แล้วหน้าเว็บนับถอยหลังต่อเอง
 * จึงไม่ขึ้นกับนาฬิกาในเครื่องลูกค้า — ส่วนการห้ามสั่งตัดสินที่ backend เสมอ
 */

/** ให้หน้าอื่นโหลดสถานะมื้อใหม่ (เช่น หลังส่งออเดอร์แรก → เริ่มนับเวลา) */
export const DINING_SESSION_CHANGED = "diningSessionChanged";

const REFRESH_MS = 60_000;

export interface BuffetTimer {
  /** ยังไม่ได้สั่งรอบแรก — ยังไม่เริ่มนับ */
  notStarted: boolean;
  /** วินาทีที่เหลือให้สั่ง */
  secondsLeft: number;
  expired: boolean;
  /** เวลาบุฟเฟต์ทั้งหมด (นาที) */
  totalMinutes: number;
}

interface SessionResponse {
  active: boolean;
  dineType?: string;
  canOrder: boolean;
  secondsLeft?: number | null;
  buffetMinutes: number;
}

async function fetchSession(tableNo: string): Promise<SessionResponse | null> {
  const query = tableNo ? `?tableNo=${encodeURIComponent(tableNo)}` : "";
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dinein/session${query}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.success ? (data as SessionResponse) : null;
}

/**
 * เวลาบุฟเฟต์ที่เหลือ — null = ไม่ใช่บุฟเฟต์ (หรือยังโหลดไม่เสร็จ)
 *
 * @param isBuffet ลูกค้าเลือกบุฟเฟต์ไว้ (localStorage dineType) — à la carte ไม่ต้องเรียก API
 */
export function useBuffetTimer(isBuffet: boolean, tableNo: string): BuffetTimer | null {
  const [deadline, setDeadline] = useState<{ endsAtMs: number | null; totalMinutes: number } | null>(null);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    if (!isBuffet) return;
    let cancelled = false;

    const load = () => {
      fetchSession(tableNo)
        .then((s) => {
          if (cancelled || !s) return;
          const started = s.active && s.dineType === "buffet" && typeof s.secondsLeft === "number";
          setNowMs(Date.now());
          setDeadline({
            endsAtMs: started ? Date.now() + (s.secondsLeft as number) * 1000 : null,
            totalMinutes: s.buffetMinutes,
          });
        })
        .catch(() => {
          /* ลองใหม่รอบถัดไป */
        });
    };

    load();
    const refresh = setInterval(load, REFRESH_MS);
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    window.addEventListener(DINING_SESSION_CHANGED, load);
    return () => {
      cancelled = true;
      clearInterval(refresh);
      clearInterval(tick);
      window.removeEventListener(DINING_SESSION_CHANGED, load);
    };
  }, [isBuffet, tableNo]);

  if (!isBuffet || !deadline) return null;
  if (deadline.endsAtMs === null) {
    return { notStarted: true, secondsLeft: deadline.totalMinutes * 60, expired: false, totalMinutes: deadline.totalMinutes };
  }
  const secondsLeft = Math.max(0, Math.ceil((deadline.endsAtMs - nowMs) / 1000));
  return { notStarted: false, secondsLeft, expired: secondsLeft === 0, totalMinutes: deadline.totalMinutes };
}

/** 6000 → "1:40:00", 300 → "5:00" */
export const formatDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};
