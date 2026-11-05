"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { fetchOrdersPage, fetchOrdersSummary } from "./orderApi";
import { dateRangeBounds } from "./orderUtils";
import type { ChannelKey, DateRangeKey, Order } from "./types";

/** ถามรายการใหม่ทุก 2 วินาที — ออเดอร์ใหม่ขึ้นเองโดยไม่ต้องรีเฟรชหน้า */
const POLL_MS = 2000;

/** key ของ channelCounts จาก backend ไม่ตรงกับ key ของปุ่ม */
const CHANNEL_COUNT_KEY: Record<ChannelKey, string> = {
  all: "all",
  online: "online",
  pos: "pos",
  "dine-in": "dineIn",
  "dine-in-alacarte": "alacarte",
  "dine-in-buffet": "buffet",
};

const NEW_ORDER_SOUND =
  "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczFjlkp9/LpnQyHEBvruHLn2kvGT5wse7TpWcqFTpxsvLWpWUnEzlxtPfaqmMkETd0t/3grGAgDDR3u8U";

function announceNewOrder(total: number) {
  try {
    const audio = new Audio(NEW_ORDER_SOUND);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {
    /* เบราว์เซอร์ไม่ให้เล่นเสียงก็ข้ามไป */
  }
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "granted") {
    new Notification("🛒 คำสั่งซื้อใหม่!", { body: `มีคำสั่งซื้อใหม่เข้ามา (ทั้งหมด ${total} รายการ)` });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

/**
 * รายการคำสั่งซื้อของแอดมิน — กรอง + แบ่งหน้าที่ฝั่ง server และตัวเลขสรุปของทั้งช่วงเวลา
 *
 * - หน้าจอโหลดเต็มจอเฉพาะครั้งแรก ตอนกรอง/ค้นหาตารางเดิมค้างไว้จนข้อมูลใหม่มา (กันจอกระพริบ)
 * - ค้นหายิง API หลังหยุดพิมพ์ 300ms
 * - คำตอบของคำขอเก่าที่มาช้ากว่าจะถูกทิ้ง ไม่ทับผลล่าสุด
 * - เปลี่ยนตัวกรองแล้วกลับไปหน้าแรกเสมอ
 */
export function useAdminOrders() {
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState<ChannelKey>("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [summaryTotal, setSummaryTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [channelCounts, setChannelCounts] = useState<Record<string, number>>({});

  const debouncedSearch = useDebouncedValue(search.trim());
  const latestRequest = useRef(0);
  const previousTotal = useRef(0);

  const load = useCallback(
    async (background: boolean) => {
      const requestId = ++latestRequest.current;
      const { from, to } = dateRangeBounds(dateRange, customFrom, customTo);

      const params = new URLSearchParams({ page: String(page), size: String(pageSize) });
      if (status !== "all") params.set("status", status);
      if (channel !== "all") params.set("channel", channel);
      if (debouncedSearch) params.set("search", debouncedSearch);
      // ตัวเลขบนการ์ด/แท็บใช้ช่วงเวลาเดียวกับตาราง
      const range = new URLSearchParams();
      if (from) {
        params.set("from", from);
        range.set("from", from);
      }
      if (to) {
        params.set("to", to);
        range.set("to", to);
      }

      try {
        const [pageResult, summaryResult] = await Promise.all([
          fetchOrdersPage(params),
          fetchOrdersSummary(range),
        ]);
        if (requestId !== latestRequest.current) return;

        if (pageResult.ok) {
          setOrders(pageResult.data.content || []);
          setTotalPages(pageResult.data.totalPages || 1);
          setTotalElements(pageResult.data.totalElements || 0);
        }
        if (summaryResult.ok) {
          const total = summaryResult.data.totalOrderCount || 0;
          if (background && previousTotal.current > 0 && total > previousTotal.current) {
            announceNewOrder(total);
          }
          previousTotal.current = total;
          setSummaryTotal(total);
          setStatusCounts(summaryResult.data.statusCounts || {});
          setChannelCounts(summaryResult.data.channelCounts || {});
        }
      } catch (error) {
        if (!background) console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, status, channel, debouncedSearch, dateRange, customFrom, customTo],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  // poll ด้วยตัวกรองล่าสุดเสมอ (ref กัน stale closure โดยไม่ต้องตั้ง interval ใหม่ทุกครั้งที่กรอง)
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    const interval = setInterval(() => loadRef.current(true), POLL_MS);
    return () => clearInterval(interval);
  }, []);

  /** เปลี่ยนค่าแล้วกลับไปหน้าแรก */
  const resetPage =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(0);
    };

  return {
    loading,
    orders,
    refresh: useCallback(() => load(false), [load]),

    filters: {
      status,
      setStatus: resetPage(setStatus),
      channel,
      setChannel: resetPage(setChannel),
      search,
      setSearch: resetPage(setSearch),
      dateRange,
      setDateRange: resetPage(setDateRange),
      customFrom,
      setCustomFrom: resetPage(setCustomFrom),
      customTo,
      setCustomTo: resetPage(setCustomTo),
    },

    summary: {
      total: summaryTotal,
      statusCount: (key: string) => (key === "all" ? summaryTotal : statusCounts[key] || 0),
      channelCount: (key: ChannelKey) => channelCounts[CHANNEL_COUNT_KEY[key]] || 0,
    },

    pagination: {
      page,
      totalPages,
      totalElements,
      pageSize,
      onPageChange: setPage,
      onPageSizeChange: resetPage(setPageSize),
    },
  };
}
