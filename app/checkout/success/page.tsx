"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    // สร้าง Order ID แบบสุ่ม
    const id = "ORD" + Date.now().toString().slice(-8);
    setOrderId(id);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-6xl">✅</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            สั่งซื้อสำเร็จ!
          </h1>
          <p className="text-gray-600 mb-6">ขอบคุณที่สั่งซื้อสินค้ากับเรา</p>

          {/* Order Details */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">หมายเลขคำสั่งซื้อ</p>
            <p className="text-xl font-bold text-amber-600">{orderId}</p>
          </div>

          {/* Info */}
          <div className="bg-amber-50 rounded-xl p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              📦 ขั้นตอนถัดไป
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>คุณจะได้รับอีเมลยืนยันคำสั่งซื้อ</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>เราจะเตรียมสินค้าและจัดส่งภายใน 1-2 วันทำการ</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>
                  คุณสามารถติดตามสถานะคำสั่งซื้อได้ที่หน้า "คำสั่งซื้อของฉัน"
                </span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="text-sm text-gray-500 mb-6">
            <p>มีคำถาม? ติดต่อเราได้ที่</p>
            <p className="text-amber-600 font-medium">support@mybakery.com</p>
            <p className="text-amber-600 font-medium">Tel: 02-XXX-XXXX</p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/user/orders"
              className="block w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
            >
              📋 ดูคำสั่งซื้อของฉัน
            </Link>
            <Link
              href="/"
              className="block w-full py-3 border-2 border-amber-500 text-amber-600 hover:bg-amber-50 font-semibold rounded-xl transition-colors"
            >
              🏠 กลับหน้าหลัก
            </Link>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            🧁 My Bakery - อบสดใหม่ทุกวัน ส่งตรงถึงบ้านคุณ
          </p>
        </div>
      </div>
    </div>
  );
}
