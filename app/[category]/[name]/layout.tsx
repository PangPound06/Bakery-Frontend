import type { Metadata } from "next";

type Props = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: decodedName,
  };
}

export default function FoodLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}