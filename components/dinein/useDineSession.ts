"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken } from "@/lib/auth";
import { DINE_KEYS, fetchRounds, parseDineType, parsePax, UnauthorizedError, type Round } from "@/lib/dineIn";
import { useStoredValue } from "@/lib/useOrderMode";

/** ถามสถานะรอบจากครัวทุกกี่มิลลิวินาที (หยุดตอนแท็บซ่อนอยู่) */
const ROUNDS_POLL_MS = 5000;

/**
 * มื้อทานในร้านที่กำลังเปิดอยู่ — ใช้ร่วมกันทั้งหน้าเมนูและหน้าเช็กบิล
 *
 *  - ยังไม่ login → /login · ไม่ได้อยู่โหมดทานในร้าน / ยังไม่เลือกโต๊ะ → /order-mode
 *  - รอบที่ส่งแล้วโหลดใหม่เองทุก 5 วินาที เพื่อให้สถานะครัวอัปเดต
 *  - ประเภทการทานยึดตามรอบแรกที่ server บันทึกไว้ก่อน ค่าในเครื่องใช้เมื่อยังไม่เคยส่งรอบ
 *
 * @param active false = มื้อจบแล้ว (จ่ายบิลแล้ว) — ไม่พาออกจากหน้าและหยุดถามสถานะรอบ
 */
export function useDineSession(active = true) {
  const router = useRouter();
  const tableNo = useStoredValue(DINE_KEYS.table);
  const storedType = parseDineType(useStoredValue(DINE_KEYS.type));
  const pax = parsePax(useStoredValue(DINE_KEYS.pax));
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundsLoaded, setRoundsLoaded] = useState(false);
  const [roundsError, setRoundsError] = useState(false);

  const toLogin = useCallback(() => {
    removeToken();
    router.replace("/login");
  }, [router]);

  // อ่าน localStorage ตรงๆ ใน effect — ค่าจาก hook รอบ hydrate ยังเป็นค่าว่างของฝั่ง server
  useEffect(() => {
    if (!active) return;
    if (!getToken()) router.replace("/login");
    else if (localStorage.getItem(DINE_KEYS.mode) !== "dinein" || !localStorage.getItem(DINE_KEYS.table))
      router.replace("/order-mode");
  }, [active, router, tableNo]);

  const reloadRounds = useCallback(async () => {
    if (!tableNo) return;
    try {
      setRounds(await fetchRounds(tableNo));
      setRoundsError(false);
    } catch (e) {
      if (e instanceof UnauthorizedError) toLogin();
      else setRoundsError(true);
    } finally {
      setRoundsLoaded(true);
    }
  }, [tableNo, toLogin]);

  useEffect(() => {
    if (!active || !tableNo) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (!document.hidden) await reloadRounds();
      if (!stopped) timer = setTimeout(tick, ROUNDS_POLL_MS);
    };
    timer = setTimeout(tick, 0);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [active, tableNo, reloadRounds]);

  const recordedType = rounds.find((r) => r.dineType)?.dineType;
  const dineType = recordedType ? parseDineType(recordedType) : storedType;

  return { tableNo, dineType, pax, rounds, roundsLoaded, roundsError, reloadRounds, toLogin };
}
