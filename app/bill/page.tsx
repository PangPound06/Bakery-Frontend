"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

interface OrderItem {
  id: number;
  productName: string;
  quantity: number;
  price: number;
  image?: string;
  selectedOption?: string | null;
}

interface Order {
  id: number;
  ordCode?: string;
  orderStatus: string;
  tableNo?: string;
  total: number;
  subtotal: number;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "กำลังเตรียม", color: "text-amber-600" },
  preparing: { label: "กำลังทำ", color: "text-orange-600" },
  ready: { label: "พร้อมเสิร์ฟ", color: "text-blue-600" },
  completed: { label: "เสร็จแล้ว", color: "text-green-600" },
  cancelled: { label: "ยกเลิก", color: "text-red-500" },
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
}

const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function BillPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNo, setTableNo] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "staff" | null>(
    null,
  );
  const grandTotalRef = useRef(0);
  const router = useRouter();

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [dineType, setDineType] = useState("");
  const [buffetPrice, setBuffetPrice] = useState<number | null>(null);
  const [buffetPax, setBuffetPax] = useState<number>(1); // ← จำนวนคน

  useEffect(() => {
    const fetchOrders = async () => {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/dinein/my-orders`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          const list: Order[] = Array.isArray(data)
            ? data
            : (data.orders ?? []);
          setOrders(
            list
              .filter((o) => o.orderStatus !== "cancelled")
              .sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
              ),
          );
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
    setTableNo(localStorage.getItem("tableNo") || "");

    const type = localStorage.getItem("dineType") || "";
    const price = localStorage.getItem("buffetPrice");
    const pax = Number(localStorage.getItem("buffetPax") || "1"); // ← ดึง buffetPax
    setDineType(type);
    setBuffetPax(pax);
    if (type === "buffet" && price) {
      setBuffetPrice(Number(price) * pax); // ← คูณจำนวนคนตรงนี้
    }
  }, []);

  const grandTotal =
    dineType === "buffet" && buffetPrice
      ? buffetPrice
      : orders
          .filter((o) => o.orderStatus !== "cancelled")
          .reduce((sum, o) => sum + o.total, 0);
  grandTotalRef.current = grandTotal;

  const totalItems = orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0,
  );
  const now = new Date();

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-base font-bold text-amber-900">บิลค่าอาหาร</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden mb-4">
          <div className="bg-amber-800 px-6 py-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-2xl">🧁</span>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Pound Bakery
              </h2>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-dashed border-gray-200 flex justify-between text-sm">
            <div>
              <p className="text-gray-400 text-xs mb-0.5">วันที่</p>
              <p className="font-semibold text-gray-700">
                {formatDate(now.toISOString())}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-xs mb-0.5">เวลา</p>
              <p className="font-semibold text-gray-700">
                {now.toLocaleString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs mb-0.5">โต๊ะ</p>
              <p className="font-bold text-amber-700 text-base">
                {tableNo || "-"}
              </p>
            </div>
          </div>

          <div className="px-6 py-4 space-y-5">
            {orders.map((order, idx) => {
              const st = STATUS_MAP[order.orderStatus] ?? {
                label: order.orderStatus,
                color: "text-gray-500",
              };
              return (
                <div key={order.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-gray-500">
                        ออเดอร์ #{order.ordCode || order.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {formatTime(order.createdAt)}
                      </span>
                      <span className={`text-xs font-semibold ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 pl-7">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-amber-100"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm text-gray-800 truncate">
                              {item.productName}
                            </p>
                            {item.selectedOption && (
                              <p className="text-xs text-purple-500">
                                {item.selectedOption}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                          <span className="text-gray-400">
                            ×{item.quantity}
                          </span>
                          <span className="font-medium text-gray-700 w-16 text-right">
                            ฿{formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-2 pl-7 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      ยอดออเดอร์นี้ (
                      {order.items.reduce((s, i) => s + i.quantity, 0)} รายการ)
                    </span>
                    <span className="text-sm font-semibold text-amber-700">
                      ฿{formatPrice(order.total)}
                    </span>
                  </div>
                  {idx < orders.length - 1 && (
                    <div className="mt-4 border-t border-dashed border-gray-200" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mx-6 mb-4 bg-amber-50 rounded-2xl px-4 py-4 border border-amber-100">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-500">จำนวนรายการทั้งหมด</span>
              <span className="text-sm font-medium text-gray-700">
                {totalItems} รายการ
              </span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-500">จำนวนออเดอร์</span>
              <span className="text-sm font-medium text-gray-700">
                {orders.length} ออเดอร์
              </span>
            </div>
            {/* ── แสดง breakdown Buffet ── */}
            {dineType === "buffet" && buffetPrice && (
              <div className="flex justify-between items-center mb-1 text-sm text-gray-500">
                <span>
                  ฿{formatPrice(buffetPrice / buffetPax)} × {buffetPax} คน
                </span>
                <span className="text-gray-600">=</span>
              </div>
            )}
            <div className="border-t border-amber-200 mt-2 pt-2 flex justify-between items-center">
              <span className="font-bold text-gray-800">
                {dineType === "buffet" && buffetPrice
                  ? `🍱 Buffet (${buffetPax} คน)`
                  : "ยอดรวมทั้งหมด"}
              </span>
              <span className="text-2xl font-bold text-amber-800">
                ฿{formatPrice(grandTotal)}
              </span>
            </div>
          </div>

          <div className="px-6 pb-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs text-gray-300">✦</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              กรุณาแสดงใบเสร็จนี้แก่พนักงาน
              <br />
              เพื่อยืนยันและชำระเงิน
            </p>
            <p className="text-xs text-amber-600 font-medium mt-2">
              ขอบคุณที่ใช้บริการ Pound Bakery 🧁
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowPayment(true)}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
        >
          ดำเนินการต่อ
        </button>
      </div>

      {showPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                วิธีการชำระเงิน
              </h2>
              <button
                onClick={() => setShowPayment(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 mb-4">
                <span className="text-orange-400 mt-0.5">ⓘ</span>
                <p className="text-xs text-orange-600 leading-relaxed">
                  ชำระเงินค่าอาหาร เมื่อคุณทานเสร็จเรียบร้อยแล้วเท่านั้น
                </p>
              </div>
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setPaymentMethod("qr")}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all ${paymentMethod === "qr" ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-orange-200"}`}
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                      />
                    </svg>
                  </div>
                  <span className="font-semibold text-gray-800">
                    QR Promptpay
                  </span>
                  <div
                    className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "qr" ? "border-orange-400 bg-orange-400" : "border-gray-300"}`}
                  >
                    {paymentMethod === "qr" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setPaymentMethod("staff")}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all ${paymentMethod === "staff" ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-orange-200"}`}
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-amber-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <span className="font-semibold text-gray-800">
                    ชำระเงินกับพนักงาน
                  </span>
                  <div
                    className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "staff" ? "border-orange-400 bg-orange-400" : "border-gray-300"}`}
                  >
                    {paymentMethod === "staff" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              </div>
              <button
                disabled={!paymentMethod}
                onClick={async () => {
                  if (!paymentMethod) return;
                  const result = await Swal.fire({
                    title: "ยืนยันการเรียกเช็คบิล",
                    html: `<p style="color:#ef4444;font-size:14px">โปรดทราบ หากเรียกเช็คบิลแล้ว<br>คุณจะไม่สามารถสั่งอาหารต่อได้</p>`,
                    iconHtml: `<div style="font-size:48px">💵</div>`,
                    showCancelButton: true,
                    confirmButtonColor: "#ef4444",
                    cancelButtonColor: "#6b7280",
                    confirmButtonText: "ยืนยัน",
                    cancelButtonText: "ยกเลิก",
                    customClass: { icon: "border-0 bg-transparent" },
                  });
                  if (result.isConfirmed) {
                    setShowPayment(false);
                    if (paymentMethod === "qr") {
                      window.location.href = `/bill/qr-code?total=${grandTotalRef.current}`;
                    } else {
                      await Swal.fire({
                        icon: "success",
                        title: "แจ้งพนักงานแล้ว",
                        text: "พนักงานจะมาเก็บเงินที่โต๊ะของท่านในไม่ช้า",
                        confirmButtonColor: "#f97316",
                        confirmButtonText: "รับทราบ",
                      });
                    }
                  }
                }}
                className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
                  paymentMethod
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg hover:shadow-xl active:scale-[0.98]"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                ดำเนินการต่อ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
