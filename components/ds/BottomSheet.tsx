"use client";

import type { ReactNode } from "react";
import { useModal } from "./useModal";

interface Props {
  open: boolean;
  onClose: () => void;
  /** ชื่อของแผ่น (สำหรับโปรแกรมอ่านหน้าจอ) */
  label: string;
  children: ReactNode;
}

/**
 * แผ่นเลื่อนขึ้นจากล่างจอแบบไม่มีกรอบของตัวเอง — เนื้อหาจัดหน้าตาเอง (เช่น กล่องพื้นมืดของรอบสั่ง)
 *
 * แตะพื้นหลังหรือกด Esc เพื่อปิด
 */
export default function BottomSheet({ open, onClose, label, children }: Props) {
  useModal(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-ink/45 backdrop-blur-sm motion-safe:animate-fade" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto pb-[env(safe-area-inset-bottom)] motion-safe:animate-sheet"
      >
        {children}
      </div>
    </div>
  );
}
