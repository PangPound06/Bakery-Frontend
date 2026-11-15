"use client";

import { useEffect } from "react";

/** ขณะเปิดกล่องโต้ตอบ: กด Esc เพื่อปิด และล็อกการเลื่อนหน้าหลัง */
export function useModal(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
}
