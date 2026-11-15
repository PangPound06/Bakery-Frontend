import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dine-in Cart - PoundBakery",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
