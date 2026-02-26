import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drink - MyBakery",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}