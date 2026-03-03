"use client";

import Link from "next/link";

export default function TermsPage() {
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
            <div className="text-5xl mb-4">📜</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              ข้อกำหนดและเงื่อนไข
            </h1>
            <p className="text-gray-500 text-sm">
              Terms and Conditions — My Bakery
            </p>
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
                การยอมรับเงื่อนไข
              </h2>
              <p className="text-sm">
                เมื่อท่านสมัครสมาชิกและใช้งานเว็บไซต์ My Bakery
                ถือว่าท่านยอมรับข้อกำหนดและเงื่อนไขทั้งหมดที่ระบุในเอกสารนี้
                หากท่านไม่ยอมรับเงื่อนไขเหล่านี้ กรุณาอย่าใช้บริการของเรา
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">
                  2
                </span>
                การสมัครสมาชิก
              </h2>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>ผู้สมัครต้องให้ข้อมูลที่ถูกต้องและเป็นจริง</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>
                    อีเมลที่ใช้สมัครต้องเป็นอีเมลส่วนตัวเท่านั้น อีเมลของพนักงาน
                    (@empbakery.com) ไม่สามารถใช้สมัครสมาชิกได้
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>
                    ท่านมีหน้าที่รักษาความปลอดภัยของบัญชีผู้ใช้
                    ไม่แชร์รหัสผ่านให้ผู้อื่น
                  </span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">
                  3
                </span>
                การสั่งซื้อสินค้า
              </h2>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>
                    ราคาสินค้าอาจเปลี่ยนแปลงได้โดยไม่ต้องแจ้งให้ทราบล่วงหน้า
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>
                    การสั่งซื้อจะสมบูรณ์เมื่อได้รับการยืนยันการชำระเงินจากร้านค้า
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>
                    ร้านค้าขอสงวนสิทธิ์ในการยกเลิกคำสั่งซื้อในกรณีที่สินค้าหมด
                    หรือข้อมูลการชำระเงินไม่ถูกต้อง
                  </span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">
                  4
                </span>
                การชำระเงิน
              </h2>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>
                    รองรับการชำระเงินผ่าน QR PromptPay และบัตรเดบิต/เครดิต
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>
                    กรณีชำระผ่าน QR PromptPay
                    ต้องอัพโหลดสลิปการโอนเงินเพื่อยืนยัน
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>ห้ามอัพโหลดสลิปปลอม หากตรวจพบจะถูกระงับบัญชีทันที</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">
                  5
                </span>
                การจัดส่ง
              </h2>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>
                    ค่าจัดส่งคำนวณตามยอดสั่งซื้อ: ต่ำกว่า ฿100 = ฿50, ฿100-฿500
                    = ฿20, มากกว่า ฿500 = ฟรี
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>ระยะเวลาจัดส่งอาจแตกต่างกันตามพื้นที่</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>กรุณากรอกที่อยู่ให้ถูกต้องและครบถ้วน</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">
                  6
                </span>
                การยกเลิกคำสั่งซื้อ
              </h2>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>สามารถยกเลิกคำสั่งซื้อได้ก่อนที่สินค้าจะถูกจัดส่ง</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>
                    เมื่อยกเลิกคำสั่งซื้อ จำนวนสินค้าจะถูกคืนกลับไปยัง Stock
                    อัตโนมัติ
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>
                    ไม่สามารถยกเลิกคำสั่งซื้อที่มีสถานะ "จัดส่งแล้ว" ได้
                  </span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">
                  7
                </span>
                การลบบัญชี
              </h2>
              <p className="text-sm">
                ท่านสามารถลบบัญชีผู้ใช้ได้ตลอดเวลาผ่านหน้าตั้งค่า
                เมื่อลบบัญชีแล้ว
                ข้อมูลส่วนตัวและประวัติการสั่งซื้อจะถูกลบออกจากระบบ
                การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">
                  8
                </span>
                ข้อจำกัดความรับผิดชอบ
              </h2>
              <p className="text-sm">
                ร้าน My Bakery จะไม่รับผิดชอบต่อความเสียหายใดๆ
                ที่เกิดจากการใช้งานเว็บไซต์อย่างไม่ถูกต้อง
                หรือจากเหตุสุดวิสัยที่อยู่นอกเหนือการควบคุมของร้านค้า
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-400 text-xs">
              © 2569 My Bakery — สงวนลิขสิทธิ์
            </p>
            <div className="mt-3 flex justify-center gap-4">
              <Link
                href="/privacy"
                className="text-amber-600 hover:text-amber-700 text-sm font-medium"
              >
                นโยบายความเป็นส่วนตัว →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}