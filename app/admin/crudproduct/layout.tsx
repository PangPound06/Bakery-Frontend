import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Products",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}