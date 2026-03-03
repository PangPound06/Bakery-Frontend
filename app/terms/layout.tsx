import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - MyBakery",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}