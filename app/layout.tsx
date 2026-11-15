import type { Metadata } from "next";
import { Anuphan, Geist, Geist_Mono, Noto_Serif_Thai } from "next/font/google";
import "./globals.css";

import Chrome from "@/components/layout/Chrome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ฟอนต์ของร้าน — เนื้อความ Anuphan (ทั้งเว็บ) หัวข้อ Noto Serif Thai (font-display / h1) ดู app/globals.css
//
// โหลดแบบ variable (ไม่ระบุ weight) — ไฟล์เดียวครอบทุกน้ำหนัก
// ถ้าระบุ weight ทีละค่า Google บางครั้งตอบเป็น URL แบบ /l/font?kit=…&skey=… ที่ Turbopack อ่านไม่ได้ ทำให้ build พัง
const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["latin", "thai"],
  display: "swap",
});

const notoSerifThai = Noto_Serif_Thai({
  variable: "--font-noto-serif-thai",
  subsets: ["latin", "thai"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PoundBakery",
    template: "%s",
  },
  description: "ร้านเบเกอรี่สดใหม่ อบทุกวัน ด้วยส่วนผสมคุณภาพ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${anuphan.variable} ${notoSerifThai.variable} ${anuphan.className} antialiased`}
      >
        <Chrome>{children}</Chrome>
      </body>
    </html>
  );
}