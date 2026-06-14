"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  image?: string;
  selectedOption?: string | null;
  itemStatus?: string;
}

interface Order {
  id: number;
  ordCode?: string;
  orderStatus: string;
  paymentStatus: string;
  tableNo?: string;
  total: number;
  subtotal: number;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_MAP: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  pending: {
    label: "กำลังเตรียม",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-300",
  },
  preparing: {
    label: "กำลังทำ",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-400",
  },
  ready: {
    label: "พร้อมเสิร์ฟ",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-400",
  },
  completed: {
    label: "เสร็จแล้ว",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-400",
  },
  cancelled: {
    label: "ยกเลิก",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-400",
  },
};

function getStatus(status: string) {
  return (
    STATUS_MAP[status] ?? {
      label: status,
      color: "text-gray-600",
      bg: "bg-gray-50",
      border: "border-gray-300",
    }
  );
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function OrderDetailPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [tableNo, setTableNo] = useState<string>("");
  const router = useRouter();
  const [dineType, setDineType] = useState("");
  const [buffetPrice, setBuffetPrice] = useState<number | null>(null);

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchOrders = async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const table = localStorage.getItem("tableNo") || "";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dinein/my-orders?tableNo=${encodeURIComponent(table)}`,
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
        const list: Order[] = Array.isArray(data) ? data : (data.orders ?? []);
        setOrders(
          list.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
      }
    } catch (e) {
      console.error("Error fetching orders:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const table = localStorage.getItem("tableNo") || "";
    setTableNo(table);

    const type = localStorage.getItem("dineType") || "";
    const price = localStorage.getItem("buffetPrice");
    const pax = localStorage.getItem("buffetPax");
    setDineType(type);
    if (type === "buffet" && price) {
      const totalBuffet = Number(price) * (pax ? Number(pax) : 1);
      setBuffetPrice(totalBuffet);
    }

    // ── REST polling ทุก 3 วินาที (แทน SSE) ──
    // ใช้ 3 วิเพราะลูกค้านั่งกินที่ร้าน status เปลี่ยนไม่บ่อยมาก
    const interval = setInterval(() => {
      if (document.hidden) return; // ไม่ poll ตอน tab ซ่อน
      fetchOrders();
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full animate-spin"
            style={{
              borderWidth: 3,
              borderStyle: "solid",
              borderColor: "#f59e0b transparent transparent transparent",
            }}
          ></div>
          <p className="text-amber-700 text-sm font-medium">
            กำลังโหลดข้อมูล...
          </p>
        </div>
      </div>
    );

  // ✅ ถ้าทุก order ที่ไม่ถูกยกเลิก ชำระเงินแล้ว → แสดงหน้าขอบคุณ
  const nonCancelledOrders = orders.filter(
    (o) => o.orderStatus !== "cancelled",
  );
  const allPaid =
    nonCancelledOrders.length > 0 &&
    nonCancelledOrders.every((o) => o.paymentStatus === "paid");

  if (allPaid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-7xl mb-6">🧁</div>
          <h2 className="text-2xl font-bold text-amber-800 mb-2">
            ชำระเงินเรียบร้อย!
          </h2>
          <p className="text-gray-500 mb-2">ขอบคุณที่ใช้บริการ Pound Bakery</p>
          {tableNo && (
            <p className="text-amber-600 font-semibold mb-8">
              🪑 โต๊ะ {tableNo}
            </p>
          )}
          <button
            onClick={() => {
              localStorage.removeItem("tableNo");
              localStorage.removeItem("orderMode");
              router.replace("/");
            }}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full font-medium hover:shadow-lg transition-all"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  // ─── Order Detail View ───────────────────────────────────────
  if (selectedOrder) {
    const st = getStatus(selectedOrder.orderStatus);
    const tNo = selectedOrder.tableNo ?? tableNo;
    const totalItems = selectedOrder.items.reduce((s, i) => s + i.quantity, 0);

    return (
      <div className="min-h-screen bg-amber-50">
        <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => setSelectedOrder(null)}
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
          <div className="text-center">
            <h1 className="text-base font-bold text-amber-800">
              รายการที่สั่ง
            </h1>
            <p className="text-xs text-gray-400">
              ข้อมูล ณ เวลา {formatTime(selectedOrder.createdAt)}
            </p>
          </div>
          <button
            onClick={fetchOrders}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          {tNo && (
            <span className="text-sm font-semibold text-amber-700 bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm">
              🪑 โต๊ะ {tNo}
            </span>
          )}
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full border ${st.bg} ${st.color} ${st.border}`}
          >
            {st.label}
          </span>
        </div>

        <div className="px-4 mt-2 divide-y divide-gray-100 bg-white rounded-2xl shadow-sm mx-4 overflow-hidden">
          {selectedOrder.items.map((item) => {
            const itemSt = getStatus(
              item.itemStatus ?? selectedOrder.orderStatus,
            );
            return (
              <div key={item.id} className="flex items-center gap-3 py-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🍽️
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-600 text-sm leading-tight line-clamp-2">
                    {item.productName}
                  </p>
                  {item.selectedOption && (
                    <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
                      {item.selectedOption}
                    </span>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    x {item.quantity}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="font-bold text-amber-700 text-sm">
                    ฿{formatPrice(item.price * item.quantity)}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${itemSt.bg} ${itemSt.color}`}
                  >
                    {itemSt.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mx-4 mt-4 mb-8 bg-white rounded-2xl shadow-sm px-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm font-medium">
              {totalItems} รายการ
            </span>
            <span className="text-lg font-bold text-amber-800">
              ฿{formatPrice(selectedOrder.total)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            💰 ชำระเงินที่โต๊ะหลังทานเสร็จ
          </p>
        </div>
      </div>
    );
  }

  // ─── Order List View ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 overflow-x-hidden">
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-amber-900 flex items-center gap-2">
              <span className="text-3xl sm:text-4xl">🧾</span> ออเดอร์ของฉัน
            </h1>
            <p className="text-amber-700 mt-1 text-sm sm:text-base">
              {orders.length} ออเดอร์ · {tableNo && `โต๊ะ ${tableNo}`}
            </p>
          </div>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 px-3 py-2 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            รีเฟรช
          </button>
        </div>

        {orders.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center border border-amber-100">
            <div className="text-6xl sm:text-8xl mb-4">🧾</div>
            <h2 className="text-xl sm:text-2xl font-semibold text-amber-900 mb-2">
              ยังไม่มีออเดอร์
            </h2>
            <p className="text-amber-600 mb-6 text-sm sm:text-base">
              เริ่มสั่งอาหารได้เลย!
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full font-medium hover:shadow-lg transition-all"
            >
              เลือกเมนู
            </button>
          </div>
        )}

        <div className="space-y-4">
          {orders.map((order) => {
            const st = getStatus(order.orderStatus);
            const tNo = order.tableNo ?? tableNo;
            const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);
            return (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="w-full text-left bg-white rounded-2xl shadow-md border border-amber-100 p-4 sm:p-5 hover:shadow-lg hover:border-orange-200 transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-amber-700 text-base sm:text-lg">
                        ออเดอร์ #{order.ordCode || order.id}
                      </span>
                      {tNo && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                          🪑 โต๊ะ {tNo}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      {formatDateTime(order.createdAt)}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {order.items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="w-10 h-10 rounded-lg overflow-hidden bg-amber-50 flex-shrink-0 border border-amber-100"
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">
                              🍽️
                            </div>
                          )}
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <span className="text-xs text-gray-400 font-medium">
                          +{order.items.length - 3}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-amber-700 mt-2">
                      {totalItems} รายการ ·{" "}
                      <span className="font-bold text-amber-600">
                        ฿{formatPrice(order.total)}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${st.bg} ${st.color} ${st.border}`}
                    >
                      {st.label}
                    </span>
                    <svg
                      className="w-5 h-5 text-amber-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── ปุ่มบิลรวม ── */}
        {orders.length > 0 &&
          (() => {
            const allDone =
              orders.some((o) => o.orderStatus === "completed") &&
              orders.every(
                (o) =>
                  o.orderStatus === "completed" ||
                  o.orderStatus === "cancelled",
              );
            const pendingOrders = orders.filter(
              (o) =>
                o.orderStatus !== "completed" && o.orderStatus !== "cancelled",
            );
            return (
              <div className="mt-6 bg-white rounded-2xl shadow-lg border border-orange-100 p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-sm text-gray-500">
                      {dineType === "buffet" && buffetPrice
                        ? `🍱 Buffet ราคา (${localStorage.getItem("buffetPax") || 1} คน)`
                        : `ยอดรวม (${orders.filter((o) => o.orderStatus === "completed").length} ออเดอร์ที่เสร็จแล้ว)`}
                    </p>
                    <p className="text-2xl font-bold text-amber-800">
                      ฿
                      {formatPrice(
                        dineType === "buffet" && buffetPrice
                          ? buffetPrice
                          : orders
                              .filter((o) => o.orderStatus === "completed")
                              .reduce((sum, o) => sum + o.total, 0),
                      )}
                    </p>
                  </div>
                  {tableNo && (
                    <span className="text-sm font-semibold text-gray-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                      🪑 โต๊ะ {tableNo}
                    </span>
                  )}
                </div>
                <button
                  onClick={async () => {
                    if (!allDone) {
                      await Swal.fire({
                        icon: "warning",
                        title: "ยังมีออเดอร์ที่ยังไม่เสร็จ",
                        html: `<p style="color:#6b7280;font-size:14px">กรุณารอให้ทุกออเดอร์เสร็จสิ้นก่อน<br>
                        <span style="color:#f97316;font-weight:600">${pendingOrders.length} ออเดอร์</span> ยังอยู่ระหว่างดำเนินการ</p>`,
                        confirmButtonColor: "#f97316",
                        confirmButtonText: "รับทราบ",
                      });
                      return;
                    }
                    router.push(
                      `/bill${dineType === "buffet" && buffetPrice ? `?total=${buffetPrice}` : ""}`,
                    );
                  }}
                  className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] ${
                    allDone
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  เรียกเก็บบิลค่าอาหาร
                </button>
                {!allDone && (
                  <p className="text-center text-xs text-amber-600 mt-2">
                    ⏳ รอให้ทุกออเดอร์เสร็จสิ้นก่อน
                  </p>
                )}
                {allDone && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    * กรุณาแจ้งพนักงานเมื่อชำระเงิน
                  </p>
                )}
              </div>
            );
          })()}

        <div className="h-8" />
        <section className="w-full mt-6 py-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-800 mb-3">
            Baked with Love ❤️
          </h2>
          <p className="text-amber-800 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">
            ขนมอบ เครื่องดื่ม และของหวานทุกชิ้นที่ Pound Bakery
            รังสรรค์ขึ้นด้วยความใส่ใจ ความรัก และส่วนผสมที่ดีที่สุด
          </p>
        </section>
      </div>
    </div>
  );
}
