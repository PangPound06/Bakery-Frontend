import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "สั่งอาหารที่โต๊ะ - PoundBakery",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
