"use client";

import dynamic from "next/dynamic";

/* ─────────────────────────────────────────────────────────────
 *  แก้ตรงนี้ให้เป็นข้อมูลร้านจริง
 *  วิธีหาพิกัด lat/lng: เปิด Google Maps → คลิกขวาที่ตำแหน่งร้าน
 *  → ตัวเลขชุดแรกคือ lat ชุดที่สองคือ lng (เช่น 13.7460, 100.5340)
 * ───────────────────────────────────────────────────────────── */
const STORE = {
  name: "Pound Bakery",
  lat: 13.7563, // ← พิกัดร้าน (ตัวอย่าง: กลางกรุงเทพฯ)
  lng: 100.5018, // ← พิกัดร้าน
  address: "123 ถนนตัวอย่าง แขวงสีลม เขตบางรัก กรุงเทพฯ 10500",
  phone: "02-123-4567",
  hours: "ทุกวัน 08:00 – 20:00 น.",
};

// แผนที่ต้องโหลดฝั่ง client เท่านั้น (Leaflet ใช้ window) → ปิด SSR
const StoreLocationMap = dynamic(() => import("./StoreLocationMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-amber-50 text-amber-700 text-sm">
      กำลังโหลดแผนที่...
    </div>
  ),
});

export default function StoreLocationSection() {
  const directionUrl = `https://www.google.com/maps/dir/?api=1&destination=${STORE.lat},${STORE.lng}`;
  const viewUrl = `https://www.google.com/maps/search/?api=1&query=${STORE.lat},${STORE.lng}`;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="mb-8">
        <p className="text-xs tracking-[0.2em] text-amber-500 font-semibold">
          LOCATION
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-amber-900 mt-1">
          ที่ตั้งร้าน
        </h2>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* แผนที่ */}
        <div className="lg:col-span-2 h-[320px] sm:h-[420px] rounded-2xl overflow-hidden shadow-sm border border-amber-100">
          <StoreLocationMap lat={STORE.lat} lng={STORE.lng} name={STORE.name} />
        </div>

        {/* รายละเอียดที่ตั้ง */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-100 flex flex-col">
          <h3 className="text-xl font-bold text-amber-900 flex items-center gap-2">
            <span>🧁</span> {STORE.name}
          </h3>

          <div className="mt-5 space-y-4 text-sm text-gray-700">
            <div className="flex gap-3">
              <span className="text-amber-500 mt-0.5">📍</span>
              <div>
                <p className="font-semibold text-gray-800">ที่อยู่</p>
                <p className="text-gray-600">{STORE.address}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-amber-500 mt-0.5">🕒</span>
              <div>
                <p className="font-semibold text-gray-800">เวลาเปิด-ปิด</p>
                <p className="text-gray-600">{STORE.hours}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-amber-500 mt-0.5">📞</span>
              <div>
                <p className="font-semibold text-gray-800">โทร</p>
                <a
                  href={`tel:${STORE.phone}`}
                  className="text-amber-600 hover:underline"
                >
                  {STORE.phone}
                </a>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 space-y-2">
            <a
              href={directionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
            >
              นำทางไปร้าน
            </a>
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2.5 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 text-sm font-semibold transition-colors"
            >
              เปิดใน Google Maps
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}