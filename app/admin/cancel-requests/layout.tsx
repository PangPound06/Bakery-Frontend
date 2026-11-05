import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancel Requests - PoundBakery",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}