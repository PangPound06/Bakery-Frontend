import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "รายการสั่งซื้อ",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}