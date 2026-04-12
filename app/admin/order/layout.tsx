import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Orders - PoundBakery",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}