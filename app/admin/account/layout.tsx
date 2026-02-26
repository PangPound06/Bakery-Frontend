import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Account - MyBakery",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}