import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ค้นหาสินค้าที่ซื้อแล้ว",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}