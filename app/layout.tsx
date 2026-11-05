import type { Metadata } from "next";
import { Geist, Geist_Mono, Prompt } from "next/font/google";
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
        className={`${geistSans.variable} ${geistMono.variable} ${prompt.variable} ${prompt.className} antialiased`}
      >
        <Chrome>{children}</Chrome>
      </body>
    </html>
  );
}