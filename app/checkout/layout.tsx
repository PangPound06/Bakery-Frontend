import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ชำระเงิน",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}