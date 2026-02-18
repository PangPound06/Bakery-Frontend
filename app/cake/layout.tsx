import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "เค้ก",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}