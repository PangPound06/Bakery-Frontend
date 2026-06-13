import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Location - PoundBakery",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
