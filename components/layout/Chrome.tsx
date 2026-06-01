"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import DineInBar from "@/components/layout/DineInBar";

// หน้าที่ไม่ต้องแสดง Header / Footer / DineInBar
const HIDE_CHROME_ON = ["/order-mode"];

export default function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = HIDE_CHROME_ON.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (hideChrome) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {children}
      <DineInBar />
      <Footer />
    </>
  );
}