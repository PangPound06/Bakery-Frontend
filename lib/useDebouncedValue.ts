"use client";

import { useEffect, useState } from "react";

/**
 * คืนค่าที่ "นิ่ง" แล้ว — อัปเดตหลังผู้ใช้หยุดพิมพ์ครบ delay มิลลิวินาที
 * ใช้กับช่องค้นหาที่ยิง API เพื่อไม่ให้ยิงทุกตัวอักษร
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
