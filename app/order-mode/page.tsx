"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OrderModePage() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [tableInput, setTableInput] = useState("");
  const [showTableModal, setShowTableModal] = useState(false);

  const [showDineTypeModal, setShowDineTypeModal] = useState(false);
  const [buffetPrice, setBuffetPrice] = useState<number | null>(null);
  const [buffetPax, setBuffetPax] = useState(1); // ← จำนวนคน
  const [tableCapacity, setTableCapacity] = useState(8); // จำนวนคนมากสุดที่ร้านรองรับ (ใช้สำหรับ validation)
  const BUFFET_PRICES = [1599];

  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [lockedTable, setLockedTable] = useState("");
  const [lockedDineType, setLockedDineType] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`http://${process.env.NEXT_PUBLIC_API_URL}/api/dinein/my-orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.orders ?? []);
        const active = list.filter(
          (o: any) =>
            o.orderStatus !== "cancelled" && o.paymentStatus !== "paid",
        );
        if (active.length > 0) {
          const tableNoFromOrder = active[0].tableNo || "";
          const existingDineType =
            localStorage.getItem("dineType") || "alacarte";
          const existingBuffetPrice = localStorage.getItem("buffetPrice");

          localStorage.setItem("orderMode", "dinein");
          localStorage.setItem("tableNo", tableNoFromOrder);

          setHasActiveOrder(true);
          setLockedTable(tableNoFromOrder);
          setLockedDineType(existingDineType);

          if (existingBuffetPrice) {
            localStorage.setItem("buffetPrice", existingBuffetPrice);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleOnline = () => {
    localStorage.setItem("orderMode", "online");
    localStorage.removeItem("tableNo");
    window.dispatchEvent(new Event("orderModeChanged"));
    setSelectedMode("online");
    setTimeout(() => router.push("/"), 1200);
  };

  const handleDineIn = () => {
    setShowTableModal(true);
  };

  const handleTableSubmit = () => {
    if (!tableInput.trim()) return;
    setShowTableModal(false);
    setShowDineTypeModal(true);
  };

  const handleDineTypeConfirm = (type: "alacarte" | "buffet") => {
    localStorage.setItem("orderMode", "dinein");
    localStorage.setItem("tableNo", tableInput.trim());
    localStorage.setItem("dineType", type);
    if (type === "buffet" && buffetPrice) {
      localStorage.setItem("buffetPrice", String(buffetPrice));
      localStorage.setItem("buffetPax", String(buffetPax)); // ← บันทึกจำนวนคน
    } else {
      localStorage.removeItem("buffetPrice");
      localStorage.removeItem("buffetPax");
    }
    window.dispatchEvent(new Event("orderModeChanged"));
    setShowDineTypeModal(false);
    setSelectedMode("dinein");
    setTimeout(() => router.push("/"), 1200);
  };

  // reset pax เมื่อปิด modal
  const handleCloseDineTypeModal = () => {
    setShowDineTypeModal(false);
    setShowTableModal(true);
    setBuffetPrice(null);
    setBuffetPax(1);
  };

  const getCapacity = (table: number) => {
    if (table <= 5) return 2;
    if (table <= 25) return 4;
    return 8;
  };

  return (
    <div className="min-h-[80vh] bg-amber-50 flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-lg">
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3 animate-bounce">🧁</div>
          <h1 className="text-3xl font-bold text-amber-700 mb-2">
            Pound Bakery
          </h1>
          <p className="text-stone-500 text-sm">
            สวัสดี! คุณต้องการสั่งแบบไหน?
          </p>
        </div>

        {/* ถ้ามี active order — แสดง locked state */}
        {hasActiveOrder && (
          <div className="bg-white rounded-2xl p-6 border-2 border-amber-400 shadow-lg mb-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center text-2xl flex-shrink-0">
                🪑
              </div>
              <div>
                <p className="font-bold text-amber-800">กำลังใช้งานอยู่</p>
                <p className="text-sm text-stone-500">
                  โต๊ะ {lockedTable} ·{" "}
                  {lockedDineType === "buffet" ? "🍱 Buffet" : "🍜 A la carte"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem("orderMode", "dinein");
                localStorage.setItem("tableNo", lockedTable);
                localStorage.setItem("dineType", lockedDineType);
                window.dispatchEvent(new Event("orderModeChanged"));
                router.push("/");
              }}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all"
            >
              กลับไปยังโต๊ะ {lockedTable} →
            </button>
          </div>
        )}

        {/* Cards */}
        {!hasActiveOrder && (
          <div className="space-y-4">
            {/* Online Order */}
            <button
              onClick={handleOnline}
              className="w-full bg-white rounded-2xl p-6 border-2 border-transparent hover:border-orange-400 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-orange-50 group-hover:bg-gradient-to-br group-hover:from-orange-500 group-hover:to-amber-400 flex items-center justify-center text-2xl transition-all duration-300 flex-shrink-0">
                  📦
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-amber-700 mb-1">
                    สั่งออนไลน์
                  </h2>
                  <p className="text-stone-500 text-sm">
                    สั่งซื้อสินค้าแล้วจัดส่งถึงบ้าน
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-stone-100 group-hover:bg-orange-500 flex items-center justify-center transition-all duration-300 flex-shrink-0">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-stone-400 group-hover:text-white transition-colors"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 px-2">
              <div className="flex-1 h-px bg-stone-200"></div>
              <span className="text-xs text-stone-400 font-medium">หรือ</span>
              <div className="flex-1 h-px bg-stone-200"></div>
            </div>

            {/* Dine-in Order */}
            <button
              onClick={handleDineIn}
              className="w-full bg-white rounded-2xl p-6 border-2 border-transparent hover:border-amber-400 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-amber-50 group-hover:bg-gradient-to-br group-hover:from-amber-500 group-hover:to-yellow-400 flex items-center justify-center text-2xl transition-all duration-300 flex-shrink-0">
                  🪑
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-amber-700">
                    สั่งในร้าน
                  </h2>
                  <p className="text-stone-500 text-sm">
                    นั่งอยู่ในร้าน สั่งจากโต๊ะได้เลย
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-stone-100 group-hover:bg-amber-500 flex items-center justify-center transition-all duration-300 flex-shrink-0">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-stone-400 group-hover:text-white transition-colors"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Table Number Modal */}
      {showTableModal && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowTableModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl text-center animate-[scaleIn_0.3s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`@keyframes scaleIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }`}</style>
            <div className="text-5xl mb-3">🪑</div>
            <h3 className="text-xl font-bold text-stone-800 mb-1">
              กรุณาระบุหมายเลขโต๊ะ
            </h3>
            <p className="text-sm text-stone-500 mb-6 leading-relaxed">
              ดูหมายเลขโต๊ะได้จากป้ายบนโต๊ะ
              <br />
              หรือสแกน QR Code ที่โต๊ะ
            </p>
            <input
              type="number"
              placeholder="เลขโต๊ะ"
              value={tableInput}
              onChange={(e) => setTableInput(e.target.value)}
              autoFocus
              className={`w-full h-14 rounded-xl border-2 ${
                tableInput ? "border-orange-500" : "border-stone-200"
              } bg-stone-50 text-center text-3xl font-extrabold text-stone-800 outline-none transition-colors tracking-widest`}
              onKeyDown={(e) => e.key === "Enter" && handleTableSubmit()}
            />
            <div className="mt-4 mb-6 space-y-3">
              <div>
                <p className="text-xs text-stone-400 font-medium mb-2 text-left">
                  🪑 โต๊ะ 2 ที่นั่ง
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setTableInput(String(n));
                        setTableCapacity(getCapacity(n));
                        setBuffetPax(1); // reset เมื่อเปลี่ยนโต๊ะ
                      }}
                      className={`h-11 rounded-xl text-base font-bold transition-all duration-200 ${
                        tableInput === String(n)
                          ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                          : "bg-blue-100 text-stone-600 hover:bg-blue-200"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-stone-400 font-medium mb-2 text-left">
                  🪑 โต๊ะ 4 ที่นั่ง
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
                    22, 23, 24, 25,
                  ].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setTableInput(String(n));
                        setTableCapacity(getCapacity(n));
                        setBuffetPax(1); // reset เมื่อเปลี่ยนโต๊ะ
                      }}
                      className={`h-11 rounded-xl text-base font-bold transition-all duration-200 ${
                        tableInput === String(n)
                          ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-stone-400 font-medium mb-2 text-left">
                  🪑 โต๊ะ 8 ที่นั่ง
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {[26, 27, 28, 29, 30].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setTableInput(String(n));
                        setTableCapacity(getCapacity(n));
                        setBuffetPax(1); // reset เมื่อเปลี่ยนโต๊ะ
                      }}
                      className={`h-11 rounded-xl text-base font-bold transition-all duration-200 ${
                        tableInput === String(n)
                          ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                          : "bg-red-100 text-orange-700 hover:bg-red-200"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTableModal(false)}
                className="flex-1 h-12 rounded-xl border-2 border-stone-200 text-stone-600 font-semibold text-sm hover:bg-stone-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleTableSubmit}
                disabled={!tableInput.trim()}
                className={`flex-1 h-12 rounded-xl text-white font-bold text-sm transition-all duration-200 ${
                  tableInput.trim()
                    ? "bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-200"
                    : "bg-stone-300 cursor-not-allowed"
                }`}
              >
                เข้าสู่เมนู 🍽️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {selectedMode && (
        <div className="fixed inset-0 z-[100] bg-amber-50/95 backdrop-blur-md flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">
              {selectedMode === "online" ? "📦" : "🍽️"}
            </div>
            <h2 className="text-xl font-bold text-stone-800 mb-2">
              {selectedMode === "online"
                ? "กำลังเข้าสู่ร้านค้า..."
                : `กำลังเข้าสู่เมนู โต๊ะ ${tableInput}...`}
            </h2>
            <div className="w-8 h-8 border-[3px] border-stone-200 border-t-orange-500 rounded-full animate-spin mx-auto mt-4" />
          </div>
        </div>
      )}

      {/* Dine Type Modal */}
      {showDineTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl text-center animate-[scaleIn_0.3s_ease]">
            <div className="text-5xl mb-3">🍽️</div>
            <h3 className="text-xl font-bold text-stone-800 mb-1">
              เลือกประเภทการสั่ง
            </h3>
            <p className="text-sm text-stone-500 mb-6">โต๊ะ {tableInput}</p>

            <div className="space-y-3 mb-6">
              {/* A la carte */}
              <button
                onClick={() => handleDineTypeConfirm("alacarte")}
                className="w-full bg-white rounded-2xl p-5 border-2 border-stone-200 hover:border-orange-400 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 group-hover:bg-orange-500 flex items-center justify-center text-2xl transition-all">
                    🍜
                  </div>
                  <div>
                    <p className="font-bold text-stone-800">A la carte</p>
                    <p className="text-sm text-stone-500">
                      สั่งตามรายการ คิดราคาต่อจาน
                    </p>
                  </div>
                </div>
              </button>

              {/* Buffet */}
              <div className="bg-white rounded-2xl p-5 border-2 border-stone-200 text-left">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl">
                    🍱
                  </div>
                  <div>
                    <p className="font-bold text-stone-800">Buffet</p>
                    <p className="text-sm text-stone-500">เลือกราคาบุฟเฟ่ต์</p>
                  </div>
                </div>

                {/* ราคา */}
                <div className="flex gap-2 mb-3">
                  {BUFFET_PRICES.map((price) => (
                    <button
                      key={price}
                      onClick={() => setBuffetPrice(price)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        buffetPrice === price
                          ? "bg-amber-600 text-white shadow-md ring-2 ring-amber-300"
                          : "bg-amber-500 text-white hover:bg-amber-600"
                      }`}
                    >
                      ฿{price.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* ── จำนวนคน (แสดงเมื่อเลือกราคาแล้ว) ── */}
                {buffetPrice && (
                  <>
                    <div className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-3 mb-3">
                      <span className="text-sm text-stone-600 font-medium">
                        จำนวนคน
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            setBuffetPax((p) => Math.max(1, p - 1))
                          }
                          className="w-8 h-8 rounded-full bg-white border border-stone-200 text-stone-700 text-lg font-bold flex items-center justify-center hover:bg-stone-100 transition"
                        >
                          −
                        </button>
                        <span className="text-lg font-bold text-stone-800 w-6 text-center">
                          {buffetPax}
                        </span>
                        <button
                          onClick={() =>
                            setBuffetPax((p) => Math.min(tableCapacity, p + 1))
                          }
                          className="w-8 h-8 rounded-full bg-white border border-stone-200 text-stone-700 text-lg font-bold flex items-center justify-center hover:bg-stone-100 transition"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* ยอดรวม + ปุ่มยืนยัน */}
                    <button
                      onClick={() => handleDineTypeConfirm("buffet")}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all"
                    >
                      ยืนยัน Buffet ฿
                      {(buffetPrice * buffetPax).toLocaleString()} ({buffetPax}{" "}
                      คน) 🍱
                    </button>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleCloseDineTypeModal}
              className="w-full h-11 rounded-xl border-2 border-stone-200 text-stone-600 font-semibold text-sm hover:bg-stone-50 transition-colors"
            >
              ← ย้อนกลับ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
