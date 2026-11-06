import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pay bill - PoundBakery",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
