"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  type: string;
  description: string;
  stockQuantity: number;
  isAvailable: boolean;
  options?: string | null;
}

interface ProductOption {
  name: string;
  extraPrice: number;
  stockMultiplier?: number; // ✅ 1=ชิ้น, 8=1ปอนด์, 16=2ปอนด์
}

interface OrderItem {
  product: Product;
  quantity: number; // เก็บเป็นชิ้นจริง
  selectedOption?: string | null;
}

const FRESH_STOCK_VALUE = 9999;
const FRESH_MAX_QTY = 10;
const isFresh = (p: Product) => p.stockQuantity === FRESH_STOCK_VALUE;
const maxQty = (p: Product) => (isFresh(p) ? FRESH_MAX_QTY : p.stockQuantity);

const parseOptions = (s?: string | null): ProductOption[] => {
  if (!s) return [];
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
};

const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function POSPage() {
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr">("cash");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const [lastOrder, setLastOrder] = useState<{
    orderId: string;
    items: OrderItem[];
    total: number;
    customerName: string;
    paymentMethod: string;
    change: number;
  } | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const [categories, setCategories] = useState<
    { id: number; name: string; slug: string; icon: string }[]
  >([]);

  const [showOptionModal, setShowOptionModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [selectedOption, setSelectedOption] = useState<ProductOption | null>(
    null,
  );
  const [mobileTab, setMobileTab] = useState<"products" | "order">("products");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.replace("/login");
      return;
    }
    try {
      const user = JSON.parse(userData);
      if (!user.email?.endsWith("@empbakery.com")) {
        router.replace("/");
        return;
      }
    } catch {
      router.replace("/login");
      return;
    }
    fetchProducts();
  }, [router]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(
          "${process.env.NEXT_PUBLIC_API_URL}/api/categories/active",
        );
        if (res.ok) setCategories(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(
        "${process.env.NEXT_PUBLIC_API_URL}/api/products",
      );
      if (res.ok) setProducts(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const PROMPTPAY_ID = "0931253748";

  const generateQRCode = async (amount: number) => {
    try {
      const response = await fetch(
        "${process.env.NEXT_PUBLIC_API_URL}/api/payment/promptpay/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        },
      );
      const data = await response.json();
      if (data.success && data.qrCodeBase64)
        setQrCodeUrl(`data:image/png;base64,${data.qrCodeBase64}`);
      else setQrCodeUrl(`https://promptpay.io/${PROMPTPAY_ID}/${amount}.png`);
    } catch {
      setQrCodeUrl(`https://promptpay.io/${PROMPTPAY_ID}/${amount}.png`);
    }
  };

  // ✅ helper คืนค่า multiplier จาก option name
  const getMultiplier = (opt: string | null | undefined): number => {
    if (!opt) return 1;
    if (opt.includes("2 ปอนด์")) return 16;
    if (opt.includes("1 ปอนด์")) return 8;
    return 1;
  };

  // ✅ doAddToOrder — quantity เก็บเป็นชิ้นจริง
  const doAddToOrder = (product: Product, option: ProductOption | null) => {
    const finalPrice = product.price + (option?.extraPrice ?? 0);
    const optName = option?.name ?? null;
    const multiplier = option?.stockMultiplier ?? getMultiplier(option?.name);

    setOrderItems((prev) => {
      const usedStock = prev
        .filter((i) => i.product.id === product.id)
        .reduce((s, i) => s + i.quantity, 0);

      if (usedStock + multiplier > maxQty(product)) return prev;

      const existing = prev.find(
        (i) => i.product.id === product.id && i.selectedOption === optName,
      );
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id && i.selectedOption === optName
            ? { ...i, quantity: i.quantity + multiplier }
            : i,
        );
      }
      return [
        ...prev,
        {
          product: { ...product, price: finalPrice },
          quantity: multiplier,
          selectedOption: optName,
        },
      ];
    });

    setMobileTab("order");
  };

  // ✅ addToOrder — ถ้ามี options → เปิด modal
  const addToOrder = (product: Product) => {
    if (
      !isFresh(product) &&
      (!product.isAvailable || product.stockQuantity === 0)
    )
      return;
    const opts = parseOptions(product.options);
    if (opts.length > 0) {
      setPendingProduct(product);
      setSelectedOption(null);
      setShowOptionModal(true);
      return;
    }
    doAddToOrder(product, null);
  };

  const updateQuantity = (
    productId: number,
    optName: string | null | undefined,
    delta: number,
  ) => {
    setOrderItems((prev) =>
      prev
        .map((i) => {
          if (
            i.product.id !== productId ||
            i.selectedOption !== (optName ?? null)
          )
            return i;
          const newQty = i.quantity + delta;
          if (newQty <= 0) return null as any;
          const totalOther = prev
            .filter(
              (x) =>
                x.product.id === productId &&
                x.selectedOption !== (optName ?? null),
            )
            .reduce((s, x) => s + x.quantity, 0);
          if (totalOther + newQty > maxQty(i.product)) return i;
          return { ...i, quantity: newQty };
        })
        .filter(Boolean),
    );
  };

  const removeItem = (
    productId: number,
    optName: string | null | undefined,
  ) => {
    setOrderItems((prev) =>
      prev.filter(
        (i) =>
          !(
            i.product.id === productId && i.selectedOption === (optName ?? null)
          ),
      ),
    );
  };

  const clearOrder = () => setOrderItems([]);

  const subtotal = orderItems.reduce(
    (sum, i) =>
      sum + i.product.price * (i.quantity / getMultiplier(i.selectedOption)),
    0,
  );
  const change = cashReceived - subtotal;

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = filterCategory === "all" || p.category === filterCategory;
    return matchSearch && matchCat;
  });

  // ✅ แก้ buildOrderPayload ใน POS page
  const buildOrderPayload = () =>
    orderItems.map((i) => {
      const m = getMultiplier(i.selectedOption);
      return {
        productId: i.product.id,
        productName: i.product.name,
        price: i.product.price / (m > 1 ? 1 : 1), // ← ยังงงอยู่ว่า price นี้คืออะไร
        quantity: i.quantity,
        selectedOption: i.selectedOption ?? null,
      };
    });

  const handleCheckout = async () => {
    if (orderItems.length === 0) {
      Swal.fire({
        title: "ไม่มีสินค้าในออเดอร์",
        icon: "warning",
        confirmButtonColor: "#f97316",
      });
      return;
    }
    if (paymentMethod === "cash" && cashReceived < subtotal) {
      Swal.fire({
        title: "รับเงินไม่พอ",
        text: `ต้องการ ฿${subtotal.toLocaleString()} แต่รับมา ฿${cashReceived.toLocaleString()}`,
        icon: "warning",
        confirmButtonColor: "#f97316",
      });
      return;
    }
    if (paymentMethod === "qr") {
      await generateQRCode(subtotal);
      setShowQrModal(true);
      return;
    }
    const confirm = await Swal.fire({
      title: "ยืนยันการขาย?",
      html: `<div style="text-align:left"><p>รวม: <strong>฿${subtotal.toLocaleString()}</strong></p>${paymentMethod === "cash" ? `<p>เงินทอน: <strong>฿${change.toLocaleString()}</strong></p>` : ""}</div>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    });
    if (!confirm.isConfirmed) return;
    setProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const adminEmail = JSON.parse(localStorage.getItem("user") || "{}").email;
      const res = await fetch("${process.env.NEXT_PUBLIC_API_URL}/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: adminEmail,
          items: buildOrderPayload(),
          subtotal,
          shipping: 0,
          total: subtotal,
          paymentMethod: paymentMethod === "cash" ? "cash" : "qr_promptpay",
          paymentStatus: "paid",
          orderStatus: "delivered",
          orderType: "pos",
          shippingInfo: {
            fullname: customerName || "ลูกค้าหน้าร้าน",
            phone: "-",
            address: "หน้าร้าน",
          },
          note: `POS Sale${customerName ? ` - ${customerName}` : ""}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const orderId =
          data.ordCode || `ORD${String(data.orderId).padStart(8, "0")}`;
        setLastOrder({
          orderId,
          items: [...orderItems],
          total: subtotal,
          customerName: customerName || "ลูกค้าหน้าร้าน",
          paymentMethod,
          change: paymentMethod === "cash" ? change : 0,
        });
        setShowReceipt(true);
        setOrderItems([]);
        setCustomerName("");
        setCashReceived(0);
        fetchProducts();
      } else {
        Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: data.message,
          icon: "error",
          confirmButtonColor: "#f97316",
        });
      }
    } catch {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
    } finally {
      setProcessing(false);
    }
  };

  const confirmQrPayment = async () => {
    setShowQrModal(false);
    setProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const adminEmail = JSON.parse(localStorage.getItem("user") || "{}").email;
      const res = await fetch("${process.env.NEXT_PUBLIC_API_URL}/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: adminEmail,
          items: buildOrderPayload(),
          subtotal,
          shipping: 0,
          total: subtotal,
          paymentMethod: "qr_promptpay",
          paymentStatus: "paid",
          orderStatus: "delivered",
          orderType: "pos",
          shippingInfo: {
            fullname: customerName || "ลูกค้าหน้าร้าน",
            phone: "-",
            address: "หน้าร้าน",
          },
          note: `POS Sale${customerName ? ` - ${customerName}` : ""}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const orderId =
          data.ordCode || `ORD${String(data.orderId).padStart(8, "0")}`;
        setLastOrder({
          orderId,
          items: [...orderItems],
          total: subtotal,
          customerName: customerName || "ลูกค้าหน้าร้าน",
          paymentMethod: "qr",
          change: 0,
        });
        setShowReceipt(true);
        setOrderItems([]);
        setCustomerName("");
        setCashReceived(0);
        setQrCodeUrl("");
        fetchProducts();
      } else {
        Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: data.message,
          icon: "error",
          confirmButtonColor: "#f97316",
        });
      }
    } catch {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    const printContent = receiptRef.current?.innerHTML;
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<html><head><title>ใบเสร็จ</title><style>body{font-family:'Courier New',monospace;font-size:12px;width:280px;margin:0 auto;padding:10px;}.center{text-align:center;}.bold{font-weight:bold;}.line{border-top:1px dashed #000;margin:6px 0;}.row{display:flex;justify-content:space-between;margin:2px 0;}.big{font-size:16px;font-weight:bold;}@media print{body{margin:0;}}</style></head><body>${printContent}</body></html>`,
    );
    win.document.close();
    win.print();
  };

  const CATEGORY_COLORS = [
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-pink-100 text-pink-700 border-pink-200",
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-green-100 text-green-700 border-green-200",
    "bg-red-100 text-red-700 border-red-200",
    "bg-purple-100 text-purple-700 border-purple-200",
    "bg-orange-100 text-orange-700 border-orange-200",
    "bg-teal-100 text-teal-700 border-teal-200",
  ];

  const getCategoryColor = (cat: string) => {
    const idx = categories.findIndex((c) => c.slug === cat);
    return CATEGORY_COLORS[idx >= 0 ? idx % CATEGORY_COLORS.length : 0];
  };

  if (loading)
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div
      className="bg-amber-50 flex flex-col"
      style={{ height: "100vh", overflow: "hidden" }}
    >
      {/* Mobile Tab Bar */}
      <div className="xl:hidden flex border-b border-amber-200 bg-white">
        <button
          onClick={() => setMobileTab("products")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${mobileTab === "products" ? "text-amber-600 border-b-2 border-amber-500 bg-amber-50" : "text-gray-500"}`}
        >
          🛍️ สินค้า
        </button>
        <button
          onClick={() => setMobileTab("order")}
          className={`flex-1 py-3 text-sm font-medium transition-colors relative ${mobileTab === "order" ? "text-amber-600 border-b-2 border-amber-500 bg-amber-50" : "text-gray-500"}`}
        >
          🧾 ออเดอร์
          {orderItems.length > 0 && (
            <span className="absolute top-2 right-6 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
              {orderItems.reduce(
                (s, i) => s + i.quantity / getMultiplier(i.selectedOption),
                0,
              )}
            </span>
          )}
        </button>
      </div>

      <div className="flex overflow-hidden flex-1">
        {/* ═══ LEFT: Products ═══ */}
        <div
          className={`flex-1 flex flex-col overflow-hidden ${mobileTab === "order" ? "hidden xl:flex" : "flex"}`}
        >
          <div className="bg-white border-b border-amber-100 px-4 py-3 flex flex-col xl:flex-row gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="ค้นหาสินค้า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { id: "all", label: "ทั้งหมด" },
                ...categories.map((c) => ({
                  id: c.slug,
                  label: `${c.icon} ${c.name}`,
                })),
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${filterCategory === cat.id ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const inOrder = orderItems.find(
                  (i) => i.product.id === product.id,
                );
                const totalInOrder = orderItems
                  .filter((i) => i.product.id === product.id)
                  .reduce(
                    (s, i) => s + i.quantity / getMultiplier(i.selectedOption),
                    0,
                  );
                const unavailable =
                  !isFresh(product) &&
                  (!product.isAvailable || product.stockQuantity === 0);
                const opts = parseOptions(product.options);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToOrder(product)}
                    disabled={unavailable}
                    className={`relative group bg-white rounded-xl border-2 overflow-hidden text-left transition-all duration-200 ${
                      unavailable
                        ? "opacity-50 cursor-not-allowed border-gray-200"
                        : inOrder
                          ? "border-amber-500 shadow-md shadow-amber-100"
                          : "border-transparent hover:border-amber-300 hover:shadow-md"
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-24 object-cover"
                      />
                      {unavailable && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            หมด
                          </span>
                        </div>
                      )}
                      {totalInOrder > 0 && (
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                          {totalInOrder}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${getCategoryColor(product.category)}`}
                      >
                        {product.category}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-amber-700 truncate leading-tight">
                        {product.name}
                      </p>
                      <p className="text-amber-600 font-bold text-sm mt-0.5">
                        ฿{formatPrice(product.price)}
                      </p>
                      {isFresh(product) ? (
                        <p className="text-teal-500 text-[10px] font-medium">
                          🥤 ทำสด
                        </p>
                      ) : (
                        <p className="text-gray-400 text-[10px]">
                          คงเหลือ: {product.stockQuantity}
                        </p>
                      )}
                      {opts.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {opts.map((o) => (
                            <span
                              key={o.name}
                              className="text-[9px] px-1 py-0.5 bg-purple-100 text-purple-600 rounded-full"
                            >
                              {o.name}
                              {o.extraPrice > 0 ? ` +฿${o.extraPrice}` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {filteredProducts.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">🔍</div>
                <p>ไม่พบสินค้า</p>
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Order Panel ═══ */}
        <div
          className={`w-full xl:w-96 bg-white border-l border-amber-100 flex flex-col shadow-xl ${mobileTab === "products" ? "hidden xl:flex" : "flex"}`}
        >
          <div className="bg-amber-800 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧾</span>
              <span className="font-bold">ออเดอร์ปัจจุบัน</span>
            </div>
            {orderItems.length > 0 && (
              <button
                onClick={clearOrder}
                className="text-amber-300 hover:text-white text-xs transition-colors"
              >
                ล้างทั้งหมด
              </button>
            )}
          </div>

          <div className="px-4 py-2.5 border-b border-amber-100 bg-amber-50">
            <input
              type="text"
              placeholder="ชื่อลูกค้า (ไม่บังคับ)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {orderItems.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-5xl mb-3">🛒</div>
                <p className="text-sm">กดสินค้าเพื่อเพิ่มออเดอร์</p>
              </div>
            ) : (
              orderItems.map((item, idx) => {
                const m = getMultiplier(item.selectedOption);
                const displayQty = item.quantity / m;
                return (
                  <div
                    key={`${item.product.id}-${item.selectedOption ?? ""}-${idx}`}
                    className="flex items-center gap-3 bg-amber-50 rounded-xl p-2.5"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-amber-700 truncate">
                        {item.product.name}
                      </p>
                      {item.selectedOption && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full">
                          {item.selectedOption}
                        </span>
                      )}
                      <p className="text-amber-600 text-xs font-bold">
                        ฿{formatPrice(item.product.price * displayQty)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            item.selectedOption,
                            -m,
                          )
                        }
                        className="w-6 h-6 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-800 text-xs font-bold flex items-center justify-center transition-colors"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-amber-700">
                        {displayQty}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            item.selectedOption,
                            +m,
                          )
                        }
                        disabled={
                          orderItems
                            .filter((i) => i.product.id === item.product.id)
                            .reduce((s, i) => s + i.quantity, 0) +
                            m >
                          maxQty(item.product)
                        }
                        className="w-6 h-6 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center transition-colors disabled:opacity-40"
                      >
                        +
                      </button>
                      <button
                        onClick={() =>
                          removeItem(item.product.id, item.selectedOption)
                        }
                        className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-500 text-xs flex items-center justify-center transition-colors ml-0.5"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-amber-100 px-4 py-4 space-y-3 bg-white">
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${paymentMethod === "cash" ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 border border-amber-200"}`}
              >
                💵 เงินสด
              </button>
              <button
                onClick={() => setPaymentMethod("qr")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${paymentMethod === "qr" ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 border border-amber-200"}`}
              >
                📱 QR
              </button>
            </div>
            {paymentMethod === "cash" && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  รับเงินมา (บาท)
                </label>
                <input
                  type="number"
                  value={cashReceived || ""}
                  onChange={(e) => setCashReceived(Number(e.target.value))}
                  min={0}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-right font-bold"
                />
                <div className="flex gap-1.5 mt-2">
                  {[20, 50, 100, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCashReceived(amt)}
                      className="flex-1 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] md:text-xs text-amber-700 hover:bg-amber-100 transition-colors font-medium"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-amber-50 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-sm text-amber-800">
                <span>จำนวนรายการ</span>
                <span>
                  {/* ✅ นับเป็น order ไม่ใช่ชิ้น */}
                  {orderItems.reduce(
                    (s, i) => s + i.quantity / getMultiplier(i.selectedOption),
                    0,
                  )}{" "}
                  รายการ
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-amber-800 pt-1 border-t border-amber-200">
                <span>ยอดรวม</span>
                <span>฿{formatPrice(subtotal)}</span>
              </div>
              {paymentMethod === "cash" && cashReceived > 0 && (
                <div
                  className={`flex justify-between text-sm font-semibold ${change >= 0 ? "text-green-600" : "text-red-500"}`}
                >
                  <span>เงินทอน</span>
                  <span>฿{formatPrice(change)}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleCheckout}
              disabled={processing || orderItems.length === 0}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-200 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>{" "}
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <span>💳</span> ชำระเงิน ฿{formatPrice(subtotal)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ✅ OPTIONS MODAL */}
      {showOptionModal && pendingProduct && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowOptionModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-amber-500 text-white px-6 py-4 rounded-t-2xl">
              <h3 className="font-bold text-lg">เลือกตัวเลือก</h3>
              <p className="text-amber-100 text-sm mt-0.5">
                {pendingProduct.name}
              </p>
            </div>
            <div className="p-5 space-y-2">
              {parseOptions(pendingProduct.options).map((o) => {
                const m = o.stockMultiplier ?? getMultiplier(o.name);
                const usedStock = orderItems
                  .filter((i) => i.product.id === pendingProduct.id)
                  .reduce((s, i) => s + i.quantity, 0);
                const disabled = usedStock + m > maxQty(pendingProduct);
                return (
                  <button
                    key={o.name}
                    onClick={() => !disabled && setSelectedOption(o)}
                    disabled={disabled}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                      disabled
                        ? "opacity-40 cursor-not-allowed border-gray-200"
                        : selectedOption?.name === o.name
                          ? "border-amber-500 bg-amber-50"
                          : "border-gray-200 hover:border-amber-300"
                    }`}
                  >
                    <div className="text-left">
                      <span className="font-medium text-amber-700 block">
                        {o.name}
                      </span>
                      {m > 1 && (
                        <span className="text-[10px] text-gray-400">
                          ลด stock {m} ชิ้น • สั่งได้{" "}
                          {Math.floor((maxQty(pendingProduct) - usedStock) / m)}{" "}
                          ออเดอร์
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-sm font-semibold ${o.extraPrice > 0 ? "text-green-600" : "text-gray-500"}`}
                    >
                      {o.extraPrice > 0
                        ? `฿${formatPrice(pendingProduct.price + o.extraPrice)} (+฿${o.extraPrice})`
                        : `฿${formatPrice(pendingProduct.price)}`}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setShowOptionModal(false)}
                className="flex-1 py-3 bg-gray-100 text-amber-800 rounded-xl font-medium hover:bg-gray-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  if (!selectedOption) return;
                  setShowOptionModal(false);
                  doAddToOrder(pendingProduct, selectedOption);
                }}
                disabled={!selectedOption}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold disabled:opacity-40"
              >
                ✅ เพิ่ม
                {selectedOption
                  ? ` — ฿${formatPrice(pendingProduct.price + selectedOption.extraPrice)}`
                  : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ QR PAYMENT MODAL ═══ */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="bg-amber-500 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <span>📱</span> ชำระผ่าน QR PromptPay
              </h2>
              <button
                onClick={() => setShowQrModal(false)}
                className="hover:bg-amber-600 p-1.5 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-sm text-gray-500">
                สแกน QR Code เพื่อชำระเงิน
              </p>
              <div className="bg-white border-2 border-amber-200 rounded-xl p-4 inline-block shadow-md">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="PromptPay QR"
                    className="w-52 h-52 mx-auto"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-600">
                  ฿{formatPrice(subtotal)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  PromptPay: 0931253748
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700">
                หลังลูกค้าสแกนและชำระเงินแล้ว กดปุ่ม "ยืนยันได้รับเงิน"
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowQrModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-amber-800 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmQrPayment}
                  disabled={processing}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    "✅"
                  )}{" "}
                  ยืนยันได้รับเงิน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RECEIPT MODAL ═══ */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="bg-amber-500 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <span>🧾</span> ใบเสร็จรับเงิน
              </h2>
              <button
                onClick={() => setShowReceipt(false)}
                className="hover:bg-amber-600 p-1.5 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div ref={receiptRef} className="p-6 font-mono text-sm">
              <div className="center bold text-center text-base mb-1">
                Pound Bakery
              </div>
              <div className="text-center text-xs text-gray-500 mb-3">
                ใบเสร็จรับเงิน
              </div>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>เลขที่: {lastOrder.orderId}</span>
                <span>{new Date().toLocaleDateString("th-TH")}</span>
              </div>
              <div className="text-xs text-gray-500 mb-3">
                ลูกค้า: {lastOrder.customerName}
              </div>
              <div className="border-t border-dashed border-gray-300 my-2" />
              {lastOrder.items.map((item, idx) => {
                const m = getMultiplier(item.selectedOption);
                const displayQty = item.quantity / m;
                return (
                  <div
                    key={`${item.product.id}-${idx}`}
                    className="flex justify-between text-xs py-0.5"
                  >
                    <span className="flex-1 truncate">
                      {item.product.name}
                      {item.selectedOption ? ` (${item.selectedOption})` : ""}
                    </span>
                    <span className="ml-2 text-gray-500">x{displayQty}</span>
                    <span className="ml-3 font-medium">
                      ฿{formatPrice(item.product.price * displayQty)}
                    </span>
                  </div>
                );
              })}
              <div className="border-t border-dashed border-gray-300 my-2" />
              <div className="flex justify-between font-bold text-base">
                <span>รวมทั้งหมด</span>
                <span>฿{formatPrice(lastOrder.total)}</span>
              </div>
              {lastOrder.paymentMethod === "cash" && (
                <>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>รับเงิน</span>
                    <span>
                      ฿
                      {cashReceived > 0
                        ? formatPrice(cashReceived)
                        : formatPrice(lastOrder.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-green-600 font-medium">
                    <span>เงินทอน</span>
                    <span>฿{formatPrice(lastOrder.change)}</span>
                  </div>
                </>
              )}
              <div className="text-center text-xs text-gray-400 mt-4 pt-3 border-t border-dashed border-gray-300">
                ขอบคุณที่ใช้บริการ 🙏
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 py-2.5 bg-gray-100 text-amber-800 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm"
              >
                ปิด
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors text-sm flex items-center justify-center gap-2"
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
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                พิมพ์ใบเสร็จ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
