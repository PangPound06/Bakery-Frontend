import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Select Order Mode - PoundBakery",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}