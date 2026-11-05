"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

/** บัญชีพนักงาน/แอดมินใช้อีเมลโดเมนนี้เสมอ (ดู AdminAuthController.registerAdmin) */
const STAFF_EMAIL_DOMAIN = "@empbakery.com";

/**
 * กันคนที่ไม่ใช่แอดมินเข้าหน้าหลังบ้าน — ยังไม่ login ไปหน้า login, ลูกค้าเด้งกลับหน้าแรก
 *
 * เป็นแค่ด่าน UX — สิทธิ์จริงตรวจที่ backend (SecurityConfig) ทุกคำขอ
 */
export function useRequireAdmin() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    if (!token || !raw) {
      router.replace("/login");
      return;
    }
    try {
      const user = JSON.parse(raw);
      if (!user.email?.endsWith(STAFF_EMAIL_DOMAIN)) {
        Swal.fire({
          icon: "error",
          title: "ไม่มีสิทธิ์เข้าถึง",
          text: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
          confirmButtonColor: "#f97316",
        }).then(() => router.replace("/"));
      }
    } catch {
      router.replace("/login");
    }
  }, [router]);
}
