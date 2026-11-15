import type { Metadata } from "next";
import { Anuphan, Geist, Geist_Mono, Noto_Serif_Thai, Prompt } from "next/font/google";
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

// ฟอนต์หลักของร้าน — โหลดผ่าน next/font เพื่อให้ใช้ได้ทุกหน้าและไม่ต้องรอ CSS ภายนอก
const prompt = Prompt({
  variable: "--font-prompt",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  display: "swap",
});

// ฟอนต์ของดีไซน์ใหม่ — ใช้ผ่าน font-body / font-display (ดู app/globals.css)
// หน้าที่ยังไม่ได้เปลี่ยนดีไซน์ยังใช้ Prompt ตามเดิม
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
        className={`${geistSans.variable} ${geistMono.variable} ${prompt.variable} ${anuphan.variable} ${notoSerifThai.variable} ${prompt.className} antialiased`}
      >
        <Chrome>{children}</Chrome>
      </body>
    </html>
  );
}