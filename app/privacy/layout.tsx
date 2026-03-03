import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - MyBakery",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}