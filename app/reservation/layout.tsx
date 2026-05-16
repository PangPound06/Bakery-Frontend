import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reserve a table | PoundBakery",
  description: "จองโต๊ะอาหารออนไลน์ เลือกโต๊ะ วัน และเวลาที่ต้องการ",
};

export default function ReservationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}