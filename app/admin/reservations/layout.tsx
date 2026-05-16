import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage bookings | Admin",
};

export default function AdminReservationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}