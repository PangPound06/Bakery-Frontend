import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order list - MyBakery",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}