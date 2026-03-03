"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-12 px-4"
      style={{ fontFamily: "'Prompt', sans-serif" }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <Link
          href="/register"
          className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-8 transition-colors"
        >
          ← กลับหน้าสมัครสมาชิก
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              นโยบายความเป็นส่วนตัว
            </h1>
            <p className="text-gray-500 text-sm">Privacy Policy — My Bakery</p>
            <p className="text-gray-400 text-xs mt-1">
              อัพเดทล่าสุด: 1 มีนาคม 2569
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">
                  1
                </span>
                ข้อมูลที่เราเก็บรวบรวม
              </h2>
              <p className="text-sm mb-3">
                เราเก็บรวบรวมข้อมูลส่วนบุคคลเท่าที่จำเป็นต่อการให้บริการ ได้แก่:
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>
                    ชื่อ-นามสกุล และอีเมล (ใช้สำหรับการสมัครสมาชิกและติดต่อ)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>เบอร์โทรศัพท์ (ใช้สำหรับติดต่อเรื่องการจัดส่ง)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>ที่อยู่จัดส่ง (ใช้สำหรับจัดส่งสินค้า)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>รูปโปรไฟล์ (เฉพาะเมื่อท่านเลือกอัพโหลด)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>ข้อมูลการสั่งซื้อและการชำระเงิน</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">
                  2
                </span>
                วัตถุประสงค์ในการใช้ข้อมูล
              </h2>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>เพื่อให้บริการและดำเนินการสั่งซื้อ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>เพื่อติดต่อสื่อสารเกี่ยวกับคำสั่งซื้อ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>เพื่อปรับปรุงและพัฒนาบริการของเรา</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>เพื่อส่งข่าวสารและโปรโมชัน (เฉพาะเมื่อท่านยินยอม)</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">
                  3
                </span>
                การเข้าสู่ระบบด้วย Google
              </h2>
              <p className="text-sm">
                หากท่านเลือกเข้าสู่ระบบผ่าน Google OAuth เราจะได้รับข้อมูลจาก
                Google ได้แก่ ชื่อ อีเมล และรูปโปรไฟล์
                เราจะใช้ข้อมูลเหล่านี้เพื่อสร้างบัญชีผู้ใช้และอำนวยความสะดวกในการเข้าสู่ระบบเท่านั้น
                เราจะไม่เข้าถึงข้อมูลอื่นๆ ในบัญชี Google ของท่าน
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">
                  4
                </span>
                การรักษาความปลอดภัย
              </h2>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>
                    รหัสผ่านถูกเข้ารหัสด้วย BCrypt ก่อนจัดเก็บในฐานข้อมูล
                    เราไม่สามารถอ่านรหัสผ่านของท่านได้
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>ใช้ระบบ JWT Token สำหรับยืนยันตัวตน</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>
                    ข้อมูลการชำระเงินผ่านบัตรจะไม่ถูกจัดเก็บในระบบของเรา
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>รูปภาพถูกจัดเก็บอย่างปลอดภัยบน Cloudinary</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">
                  5
                </span>
                การเปิดเผยข้อมูล
              </h2>
              <p className="text-sm">
                เราจะไม่ขาย แลกเปลี่ยน
                หรือเปิดเผยข้อมูลส่วนบุคคลของท่านให้แก่บุคคลที่สาม
                ยกเว้นในกรณีต่อไปนี้:
              </p>
              <ul className="text-sm space-y-2 mt-3">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>เมื่อได้รับความยินยอมจากท่าน</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>เมื่อกฎหมายกำหนด</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>เพื่อดำเนินการจัดส่งสินค้า (เฉพาะข้อมูลที่จำเป็น)</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">
                  6
                </span>
                Cookies
              </h2>
              <p className="text-sm">
                เว็บไซต์ใช้ localStorage สำหรับจัดเก็บข้อมูลการเข้าสู่ระบบ
                (Token) และข้อมูลผู้ใช้เพื่ออำนวยความสะดวกในการใช้งาน
                ท่านสามารถล้างข้อมูลเหล่านี้ได้โดยการออกจากระบบหรือล้างข้อมูลเว็บไซต์ในเบราว์เซอร์
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">
                  7
                </span>
                สิทธิ์ของท่าน
              </h2>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>แก้ไขข้อมูลส่วนตัวได้ตลอดเวลาผ่านหน้าโปรไฟล์</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>ลบรูปโปรไฟล์ได้ตลอดเวลา</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>
                    ลบบัญชีผู้ใช้ได้ผ่านหน้าตั้งค่า (ข้อมูลทั้งหมดจะถูกลบ)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>ขอข้อมูลส่วนบุคคลที่เราจัดเก็บเกี่ยวกับท่าน</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">
                  8
                </span>
                ติดต่อเรา
              </h2>
              <p className="text-sm mb-3">
                หากมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัว สามารถติดต่อได้ที่:
              </p>
              <div className="bg-amber-50 rounded-xl p-4 text-sm space-y-2">
                <p className="flex items-center gap-2">
                  <span>📧</span>
                  <span>Email: support@mybakery.com</span>
                </p>
                <p className="flex items-center gap-2">
                  <span>📞</span>
                  <span>โทร: 093-125-3748</span>
                </p>
                <p className="flex items-center gap-2">
                  <span>🏪</span>
                  <span>My Bakery — ร้านเบเกอรี่สดใหม่ อบทุกวัน</span>
                </p>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-400 text-xs">
              © 2569 My Bakery — สงวนลิขสิทธิ์
            </p>
            <div className="mt-3 flex justify-center gap-4">
              <Link
                href="/terms"
                className="text-amber-600 hover:text-amber-700 text-sm font-medium"
              >
                ← ข้อกำหนดและเงื่อนไข
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}