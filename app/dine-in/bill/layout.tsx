import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ออเดอร์และเช็กบิล - PoundBakery",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
