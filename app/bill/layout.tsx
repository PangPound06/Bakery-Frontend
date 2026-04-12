import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Receipt details - PoundBakery",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}