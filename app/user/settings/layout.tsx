import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "การตั้งค่า",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}