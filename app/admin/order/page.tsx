"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  selectedOption?: string | null;
}

interface Order {
  id: number;
  email: string;
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  orderType?: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  note: string;
  slipImage: string;
  createdAt: string;
  ordCode: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  options?: string | null;
  stockQuantity: number;
  isAvailable: boolean;
}

interface ProductOption {
  name: string;
  extraPrice: number;
}

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

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterChannel, setFilterChannel] = useState<
    "all" | "online" | "pos" | "dine-in" | "dine-in-alacarte" | "dine-in-buffet"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [slipModal, setSlipModal] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [prevOrderCount, setPrevOrderCount] = useState(0);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState<number>(1);

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [addSearch, setAddSearch] = useState("");
  const [addingProduct, setAddingProduct] = useState<Product | null>(null);
  const [addOptionModal, setAddOptionModal] = useState(false);
  const [selectedAddOption, setSelectedAddOption] =
    useState<ProductOption | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [addFilterCategory, setAddFilterCategory] = useState("all");

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
        Swal.fire({
          icon: "error",
          title: "ไม่มีสิทธิ์เข้าถึง",
          text: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
          confirmButtonColor: "#f97316",
        }).then(() => router.replace("/"));
        return;
      }
    } catch {
      router.replace("/login");
      return;
    }

    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 2000);
    return () => clearInterval(interval);
  }, [router]);

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/all`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        if (silent && data.length > prevOrderCount && prevOrderCount > 0) {
          try {
            const audio = new Audio(
              "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczFjlkp9/LpnQyHEBvruHLn2kvGT5wse7TpWcqFTpxsvLWpWUnEzlxtPfaqmMkETd0t/3grGAgDDR3u8U",
            );
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}
          if (Notification.permission === "granted") {
            new Notification("🛒 คำสั่งซื้อใหม่!", {
              body: `มีคำสั่งซื้อใหม่เข้ามา (ทั้งหมด ${data.length} รายการ)`,
            });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
          }
        }
        setPrevOrderCount(data.length);
        setOrders(data);
      }
    } catch (error) {
      if (!silent) console.error("Error fetching orders:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchOrderDetail = async (orderId: number) => {
    setLoadingDetail(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedOrder(data.order);
          setOrderItems(data.items || []);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const updateOrderStatus = async (
    orderId: number,
    orderStatus: string,
    paymentStatus?: string,
  ) => {
    if (orderStatus === "confirmed") {
      const result = await Swal.fire({
        icon: "warning",
        title: "ยืนยันคำสั่งซื้อ?",
        text: "ต้องการยืนยันคำสั่งซื้อนี้หรือไม่?",
        showCancelButton: true,
        confirmButtonColor: "#f97316",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "✅ ยืนยัน",
        cancelButtonText: "ปิด",
      });
      if (!result.isConfirmed) return;
    }

    if (orderStatus === "delivered") {
      const result = await Swal.fire({
        icon: "warning",
        title: "ยืนยันการชำระเงิน?",
        text: "ยืนยันว่าลูกค้าชำระเงินเรียบร้อยแล้ว?",
        showCancelButton: true,
        confirmButtonColor: "#22c55e",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "✅ ยืนยัน",
        cancelButtonText: "ปิด",
      });
      if (!result.isConfirmed) return;
    }

    setUpdating(true);
    try {
      const token = localStorage.getItem("token");
      const body: any = { orderStatus };
      if (paymentStatus) body.paymentStatus = paymentStatus;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      );
      const data = await response.json();
      if (data.success) {
        localStorage.setItem("stockUpdated", Date.now().toString());
        window.dispatchEvent(new Event("storage"));
        if (orderStatus === "confirmed") {
          await Swal.fire({
            icon: "success",
            title: "✅ ยืนยันคำสั่งซื้อสำเร็จ!",
            text: "ขั้นตอนถัดไป: เริ่มเตรียมสินค้า 👨‍🍳",
            confirmButtonColor: "#f97316",
            confirmButtonText: "รับทราบ",
          });
        }
        if (orderStatus === "delivered") {
          await Swal.fire({
            icon: "success",
            title: "✅ ยืนยันการชำระเงินสำเร็จ!",
            text: "ขอบคุณที่ใช้บริการ Pound Bakery 🧁",
            confirmButtonColor: "#22c55e",
            confirmButtonText: "รับทราบ",
          });
        }
        fetchOrders();
        if (selectedOrder?.id === orderId) fetchOrderDetail(orderId);
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: data.message || "ไม่สามารถอัพเดทสถานะได้",
          confirmButtonColor: "#f97316",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถอัพเดทสถานะได้",
        confirmButtonColor: "#f97316",
      });
    } finally {
      setUpdating(false);
    }
  };

  const cancelOrder = async (orderId: number) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "ยกเลิกคำสั่งซื้อ?",
      text: "Stock จะถูกคืนอัตโนมัติ ต้องการยกเลิกหรือไม่?",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ยกเลิกคำสั่งซื้อ",
      cancelButtonText: "ไม่ยกเลิก",
    });
    if (!result.isConfirmed) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}/cancel`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (data.success) {
        localStorage.setItem("stockUpdated", Date.now().toString());
        window.dispatchEvent(new Event("storage"));
        await Swal.fire({
          icon: "success",
          title: "ยกเลิกสำเร็จ",
          text: "ยกเลิกคำสั่งซื้อสำเร็จ (Stock คืนแล้ว)",
          timer: 1000,
          showConfirmButton: false,
        });
        fetchOrders();
        if (selectedOrder?.id === orderId) fetchOrderDetail(orderId);
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: data.message || "ไม่สามารถยกเลิกได้",
          confirmButtonColor: "#f97316",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถยกเลิกได้",
        confirmButtonColor: "#f97316",
      });
    }
  };

  const removeOrderItem = async (
    orderId: number,
    itemId: number,
    itemName: string,
  ) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "ลบสินค้า?",
      text: `ต้องการลบ "${itemName}" ออกจากคำสั่งซื้อ? Stock จะถูกคืนอัตโนมัติ`,
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบสินค้า",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}/items/${itemId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (data.success) {
        localStorage.setItem("stockUpdated", Date.now().toString());
        window.dispatchEvent(new Event("storage"));
        if (data.cancelled) {
          await Swal.fire({
            icon: "info",
            title: "ยกเลิกอัตโนมัติ",
            text: "ไม่มีสินค้าเหลือ คำสั่งซื้อถูกยกเลิกอัตโนมัติ",
            confirmButtonColor: "#f97316",
          });
          setSelectedOrder(null);
        } else {
          // Update local state immediately
          setOrderItems((prev) => prev.filter((i) => i.id !== itemId));
          setSelectedOrder((prev) =>
            prev
              ? {
                  ...prev,
                  subtotal: data.newSubtotal,
                  total: data.newTotal,
                }
              : prev,
          );
        }
        fetchOrders();
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: data.message || "ไม่สามารถลบสินค้าได้",
          confirmButtonColor: "#f97316",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถลบสินค้าได้",
        confirmButtonColor: "#f97316",
      });
    }
  };

  const fetchAllProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) setAllProducts(await res.json());
    } catch {}
  };

  const doAddProductToOrder = async (
    product: Product,
    option: ProductOption | null,
  ) => {
    const token = localStorage.getItem("token");
    const finalPrice = product.price + (option?.extraPrice ?? 0);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${selectedOrder!.id}/items`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          price: finalPrice,
          quantity: addQty,
          selectedOption: option?.name ?? null,
          image: product.image,
        }),
      },
    );
    const data = await res.json();
    if (data.success) {
      setOrderItems((prev) => [...prev, data.newItem]);
      setSelectedOrder((prev) =>
        prev
          ? { ...prev, subtotal: data.newSubtotal, total: data.newTotal }
          : prev,
      );
      fetchOrders();
      setShowAddProductModal(false);
      setAddingProduct(null);
      setSelectedAddOption(null);
      setAddQty(1);
    } else {
      Swal.fire({
        icon: "error",
        title: "เพิ่มไม่สำเร็จ",
        text: data.message,
        confirmButtonColor: "#f97316",
      });
    }
  };

  const printReceipt = (order: Order, items: OrderItem[]) => {
    console.log("createdAt raw:", order.createdAt);
    const win = window.open("", "_blank");
    if (!win) return;
    const itemsHtml = items
      .map(
        (item) =>
          `<div class="row"><span>${item.productName}${item.selectedOption ? ` (${item.selectedOption})` : ""}</span><span>x${item.quantity}</span><span>฿${(item.price * item.quantity).toLocaleString()}</span></div>`,
      )
      .join("");
    const paymentText =
      order.paymentMethod === "qr_promptpay"
        ? "QR PromptPay"
        : order.paymentMethod === "cash"
          ? "เงินสด"
          : "บัตร";
    const orderCode =
      order.ordCode ||
      `ORD${String((order.id * 104729) % 1000000).padStart(6, "0")}${order.id}`;
    const date = new Date(
      order.createdAt.endsWith("Z") ? order.createdAt : order.createdAt + "Z",
    ).toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    });

    win.document.write(`<html><head><title>ใบเสร็จ ${orderCode}</title>
      <style>
        body{font-family:'Courier New',monospace;font-size:12px;width:280px;margin:0 auto;padding:15px;}
        .center{text-align:center;}
        .bold{font-weight:bold;}
        .line{border-top:1px dashed #000;margin:8px 0;}
        .row{display:flex;justify-content:space-between;margin:3px 0;gap:8px;}
        .row span:first-child{flex:1;}
        .big{font-size:16px;font-weight:bold;}
        .total-row{display:flex;justify-content:space-between;font-weight:bold;font-size:14px;margin:4px 0;}
        @media print{body{margin:0;}}
      </style></head><body>
      <div class="center bold" style="font-size:16px;">Pound Bakery</div>
      <div class="center" style="font-size:10px;color:#666;">ใบเสร็จรับเงิน</div>
      <div class="line"></div>
      <div class="row"><span>เลขที่: ${orderCode}</span></div>
      <div class="row"><span>วันที่: ${date}</span></div>
      <div class="row"><span>ลูกค้า: ${order.receiverName || "-"}</span></div>
      <div class="row"><span>ช่องทาง: ${order.orderType === "pos" ? "หน้าร้าน" : "ออนไลน์"}</span></div>
      <div class="line"></div>
      ${itemsHtml}
      <div class="line"></div>
      <div class="total-row"><span>ยอดรวมสินค้า</span><span>฿${formatPrice(order.subtotal)}</span></div>
      ${order.shipping > 0 ? `<div class="row"><span>ค่าจัดส่ง</span><span>฿${formatPrice(order.shipping)}</span></div>` : ""}
      <div class="line"></div>
      <div class="total-row" style="font-size:16px;"><span>รวมทั้งหมด</span><span>฿${formatPrice(order.total)}</span></div>
      <div class="line"></div>
      <div class="row"><span>ชำระโดย: ${paymentText}</span></div>
      <div class="center" style="margin-top:15px;color:#666;font-size:10px;">ขอบคุณที่ใช้บริการ 🙏</div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  // ✅ แก้จุดที่ 2 — รับ orderType เพื่อแยก delivered
  const getStatusBadge = (status: string, orderType?: string) => {
    switch (status) {
      case "pending":
        return {
          text: "รอดำเนินการ",
          bg: "bg-yellow-100 text-yellow-700",
          icon: "⏳",
        };
      case "confirmed":
        return {
          text: "ยืนยันแล้ว",
          bg: "bg-blue-100 text-blue-700",
          icon: "✅",
        };
      case "preparing":
        return {
          text: "กำลังเตรียม",
          bg: "bg-indigo-100 text-indigo-700",
          icon: "👨‍🍳",
        };
      case "shipping":
        return {
          text: "กำลังจัดส่ง",
          bg: "bg-purple-100 text-purple-700",
          icon: "🚚",
        };
      case "delivered":
        return orderType === "pos"
          ? {
              text: "สั่งซื้อสำเร็จ (หน้าร้าน)",
              bg: "bg-emerald-100 text-emerald-700",
              icon: "🎉",
            }
          : orderType === "dine-in"
            ? {
                text: "ชำระเงินแล้ว",
                bg: "bg-emerald-100 text-emerald-700",
                icon: "✅",
              }
            : {
                text: "จัดส่งแล้ว",
                bg: "bg-green-100 text-green-700",
                icon: "📦",
              };
      case "cancelled":
        return { text: "ยกเลิก", bg: "bg-red-100 text-red-700", icon: "❌" };
      default:
        return { text: status, bg: "bg-gray-100 text-gray-700", icon: "📋" };
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return { text: "ชำระแล้ว", bg: "bg-green-100 text-green-700" };
      case "pending":
        return { text: "รอตรวจสอบ", bg: "bg-yellow-100 text-yellow-700" };
      case "failed":
        return { text: "ล้มเหลว", bg: "bg-red-100 text-red-700" };
      default:
        return { text: status, bg: "bg-gray-100 text-gray-700" };
    }
  };

  const getChannelBadge = (orderType?: string) => {
    if (orderType === "pos")
      return { text: "🏪 หน้าร้าน", bg: "bg-amber-100 text-amber-700" };
    if (orderType === "dine-in")
      return { text: "🪑 ในร้าน", bg: "bg-green-100 text-green-700" };
    return { text: "🌐 ออนไลน์", bg: "bg-blue-50 text-blue-600" };
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z").toLocaleString(
      "th-TH",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
      },
    );

  const getNextStatusActions = (order: Order) => {
    const actions: {
      label: string;
      orderStatus: string;
      paymentStatus?: string;
      color: string;
    }[] = [];

    if (order.orderType === "pos") return actions;

    // ✅ dine-in มีแค่ปุ่มยืนยันชำระเงิน
    if (order.orderType === "dine-in") {
      if (
        order.orderStatus === "pending" ||
        order.orderStatus === "confirmed"
      ) {
        actions.push({
          label: "✅ ยืนยันการชำระเงิน",
          orderStatus: "delivered",
          paymentStatus: "paid",
          color: "bg-green-500 hover:bg-green-600 text-white",
        });
      }
      return actions;
    }

    switch (order.orderStatus) {
      case "pending":
        actions.push({
          label: "✅ ยืนยันคำสั่งซื้อ",
          orderStatus: "confirmed",
          paymentStatus: "paid",
          color: "bg-blue-500 hover:bg-blue-600 text-white",
        });
        actions.push({
          label: "❌ ยกเลิก",
          orderStatus: "cancelled",
          color: "bg-red-100 hover:bg-red-200 text-red-600",
        });
        break;
      case "confirmed":
        actions.push({
          label: "👨‍🍳 เตรียมสินค้า",
          orderStatus: "preparing",
          color: "bg-indigo-500 hover:bg-indigo-600 text-white",
        });
        break;
      case "preparing":
        actions.push({
          label: "🚚 จัดส่ง",
          orderStatus: "shipping",
          color: "bg-purple-500 hover:bg-purple-600 text-white",
        });
        break;
      case "shipping":
        actions.push({
          label: "📦 จัดส่งสำเร็จ",
          orderStatus: "delivered",
          color: "bg-green-500 hover:bg-green-600 text-white",
        });
        break;
    }
    return actions;
  };

  const filteredOrders = orders.filter((order) => {
    const matchStatus =
      filterStatus === "all" || order.orderStatus === filterStatus;
    const matchChannel =
      filterChannel === "all" ||
      (filterChannel === "pos" && order.orderType === "pos") ||
      (filterChannel === "online" &&
        order.orderType !== "pos" &&
        order.orderType !== "dine-in") ||
      (filterChannel === "dine-in" && order.orderType === "dine-in") ||
      (filterChannel === "dine-in-alacarte" &&
        order.orderType === "dine-in" &&
        !order.note?.includes("Buffet")) ||
      (filterChannel === "dine-in-buffet" &&
        order.orderType === "dine-in" &&
        order.note?.includes("Buffet"));
    const ordCode = `ORD${String((order.id * 104729) % 1000000).padStart(6, "0")}${order.id}`;
    const matchSearch =
      searchTerm === "" ||
      order.id.toString().includes(searchTerm) ||
      (order.ordCode || "").toUpperCase().includes(searchTerm.toUpperCase()) ||
      ordCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.receiverName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    return matchStatus && matchChannel && matchSearch;
  });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.orderStatus === "pending").length,
    confirmed: orders.filter((o) => o.orderStatus === "confirmed").length,
    preparing: orders.filter((o) => o.orderStatus === "preparing").length,
    shipping: orders.filter((o) => o.orderStatus === "shipping").length,
    delivered: orders.filter((o) => o.orderStatus === "delivered").length,
    cancelled: orders.filter((o) => o.orderStatus === "cancelled").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-amber-600 font-medium">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-800 flex items-center gap-3">
              <span className="text-4xl">📦</span>Manage orders
            </h1>
            <p className="text-amber-600 mt-1">
              คำสั่งซื้อทั้งหมด {orders.length} รายการ
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3 mb-6">
          {[
            { key: "all", label: "ทั้งหมด", icon: "📋", color: "bg-gray-100" },
            {
              key: "pending",
              label: "รอดำเนินการ",
              icon: "⏳",
              color: "bg-yellow-100",
            },
            {
              key: "confirmed",
              label: "ยืนยันแล้ว",
              icon: "✅",
              color: "bg-blue-100",
            },
            {
              key: "preparing",
              label: "กำลังเตรียม",
              icon: "👨‍🍳",
              color: "bg-indigo-100",
            },
            {
              key: "shipping",
              label: "กำลังจัดส่ง",
              icon: "🚚",
              color: "bg-purple-100",
            },
            {
              key: "delivered",
              label: "สั่งซื้อสำเร็จ",
              icon: "🎉",
              color: "bg-green-100",
            },
            {
              key: "cancelled",
              label: "ยกเลิก",
              icon: "❌",
              color: "bg-red-100",
            },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilterStatus(item.key)}
              className={`p-2 md:p-3 rounded-xl text-center transition-all ${filterStatus === item.key ? "ring-2 ring-amber-500 shadow-md" : "hover:shadow-md"} ${item.color}`}
            >
              <div className="text-xl md:text-2xl">{item.icon}</div>
              <div className="text-[10px] md:text-xs font-medium mt-1 leading-tight">
                {item.label}
              </div>
              <div className="text-base md:text-lg font-bold">
                {statusCounts[item.key as keyof typeof statusCounts]}
              </div>
            </button>
          ))}
        </div>

        {/* ✅ Channel Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          {[
            {
              key: "all" as const,
              label: "ทั้งหมด",
              icon: "📋",
              count: orders.length,
            },
            {
              key: "online" as const,
              label: "ออนไลน์",
              icon: "🌐",
              count: orders.filter(
                (o) => o.orderType !== "pos" && o.orderType !== "dine-in",
              ).length,
            },
            {
              key: "pos" as const,
              label: "หน้าร้าน",
              icon: "🏪",
              count: orders.filter((o) => o.orderType === "pos").length,
            },
            {
              key: "dine-in" as const,
              label: "ในร้าน",
              icon: "🪑",
              count: orders.filter((o) => o.orderType === "dine-in").length,
            },
            {
              key: "dine-in-alacarte" as const,
              label: "A la carte",
              icon: "🍜",
              count: orders.filter(
                (o) =>
                  o.orderType === "dine-in" &&
                  o.note &&
                  !o.note.includes("Buffet"),
              ).length,
            },
            {
              key: "dine-in-buffet" as const,
              label: "Buffet",
              icon: "🍱",
              count: orders.filter(
                (o) => o.orderType === "dine-in" && o.note?.includes("Buffet"),
              ).length,
            },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilterChannel(item.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filterChannel === item.key
                  ? "bg-amber-500 text-white shadow-md"
                  : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  filterChannel === item.key
                    ? "bg-amber-600 text-amber-100"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-md">
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหา Order ID, อีเมล, ชื่อผู้รับ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-400"
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
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-amber-500">
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    #ID
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    ลูกค้า
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    ยอดรวม
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    ชำระเงิน
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    สถานะ
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white">
                    วันที่
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-white">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => {
                  // ✅ แก้จุดที่ 3.1 — ส่ง orderType
                  const status = getStatusBadge(
                    order.orderStatus,
                    order.orderType,
                  );
                  const payment = getPaymentBadge(order.paymentStatus);
                  const nextActions = getNextStatusActions(order);

                  return (
                    <tr
                      key={order.id}
                      className={`border-b border-amber-100 hover:bg-amber-50 ${index % 2 === 0 ? "bg-white" : "bg-amber-50/50"}`}
                    >
                      <td className="px-4 py-4 font-bold text-amber-800">
                        #
                        {order.ordCode ||
                          `ORD${String((order.id * 104729) % 1000000).padStart(6, "0")}${order.id}`}
                      </td>

                      {/* ✅ แก้จุดที่ 4 — เพิ่ม badge หน้าร้าน/ออนไลน์ */}
                      <td className="px-4 py-4">
                        <p className="font-medium text-amber-700 text-sm">
                          {order.receiverName || "-"}
                        </p>
                        <p className="text-xs text-gray-500">{order.email}</p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getChannelBadge(order.orderType).bg}`}
                        >
                          {getChannelBadge(order.orderType).text}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-semibold text-amber-600">
                        ฿{formatPrice(order.total)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${payment.bg}`}
                          >
                            {payment.text}
                          </span>
                          {order.slipImage && (
                            <button
                              onClick={() =>
                                setSlipModal(
                                  order.slipImage.startsWith("http")
                                    ? order.slipImage
                                    : `${process.env.NEXT_PUBLIC_API_URL}${order.slipImage}`,
                                )
                              }
                              className="block text-xs text-blue-600 hover:underline"
                            >
                              🧾 ดูสลิป
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg}`}
                        >
                          {status.icon} {status.text}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => fetchOrderDetail(order.id)}
                            className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-xs font-medium"
                          >
                            🔍 รายละเอียด
                          </button>
                          {nextActions.map((action, i) => (
                            <button
                              key={i}
                              disabled={updating}
                              onClick={() =>
                                action.orderStatus === "cancelled"
                                  ? cancelOrder(order.id)
                                  : updateOrderStatus(
                                      order.id,
                                      action.orderStatus,
                                      action.paymentStatus,
                                    )
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${action.color}`}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500">ไม่พบคำสั่งซื้อ</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 bg-amber-500 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">
                📋 คำสั่งซื้อ #
                {selectedOrder.ordCode ||
                  `ORD${String((selectedOrder.id * 104729) % 1000000).padStart(6, "0")}${selectedOrder.id}`}
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-amber-600 rounded-lg text-white"
              >
                <svg
                  className="w-6 h-6"
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

            {loadingDetail ? (
              <div className="p-12 text-center">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Status + Actions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-500">สถานะปัจจุบัน</span>
                    {/* ✅ แก้จุดที่ 3.2 และ 3.3 */}
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedOrder.orderStatus, selectedOrder.orderType).bg}`}
                    >
                      {
                        getStatusBadge(
                          selectedOrder.orderStatus,
                          selectedOrder.orderType,
                        ).icon
                      }{" "}
                      {
                        getStatusBadge(
                          selectedOrder.orderStatus,
                          selectedOrder.orderType,
                        ).text
                      }
                    </span>
                  </div>
                  {getNextStatusActions(selectedOrder).length > 0 && (
                    <div className="flex gap-2">
                      {getNextStatusActions(selectedOrder).map((action, i) => (
                        <button
                          key={i}
                          disabled={updating}
                          onClick={() =>
                            action.orderStatus === "cancelled"
                              ? cancelOrder(selectedOrder.id)
                              : updateOrderStatus(
                                  selectedOrder.id,
                                  action.orderStatus,
                                  action.paymentStatus,
                                )
                          }
                          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${action.color}`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    🛒 รายการสินค้า
                  </p>
                  <div className="space-y-2">
                    {orderItems.map((item) => {
                      const isEditing = editingItemId === item.id;
                      const canRemove =
                        selectedOrder &&
                        !["delivered", "cancelled"].includes(
                          selectedOrder.orderStatus,
                        ) &&
                        selectedOrder.orderType !== "pos";

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-amber-50 rounded-lg gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-amber-700 truncate">
                              {item.productName}
                            </p>
                            {item.selectedOption && (
                              <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full mt-0.5">
                                {item.selectedOption}
                              </span>
                            )}
                            {isEditing ? (
                              <div className="flex items-center gap-2 mt-1.5">
                                <button
                                  onClick={() =>
                                    setEditQty((q) => Math.max(1, q - 1))
                                  }
                                  className="w-7 h-7 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-800 font-bold flex items-center justify-center"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  value={editQty}
                                  onChange={(e) =>
                                    setEditQty(
                                      Math.max(1, Number(e.target.value)),
                                    )
                                  }
                                  className="w-14 text-center border border-amber-300 rounded-lg py-0.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                                />
                                <button
                                  onClick={() => setEditQty((q) => q + 1)}
                                  className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center justify-center"
                                >
                                  +
                                </button>
                                <span className="text-xs text-amber-600 font-semibold ml-1">
                                  = ฿{formatPrice(item.price * editQty)}
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 mt-0.5">
                                ฿{formatPrice(item.price)} x {item.quantity}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={async () => {
                                    const token = localStorage.getItem("token");
                                    const res = await fetch(
                                      `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${selectedOrder!.id}/items/${item.id}`,
                                      {
                                        method: "PATCH",
                                        headers: {
                                          "Content-Type": "application/json",
                                          Authorization: `Bearer ${token}`,
                                        },
                                        body: JSON.stringify({
                                          quantity: editQty,
                                        }),
                                      },
                                    );
                                    const data = await res.json();
                                    if (data.success) {
                                      setOrderItems((prev) =>
                                        prev.map((i) =>
                                          i.id === item.id
                                            ? { ...i, quantity: editQty }
                                            : i,
                                        ),
                                      );
                                      setSelectedOrder((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              subtotal: data.newSubtotal,
                                              total: data.newTotal,
                                            }
                                          : prev,
                                      );
                                      fetchOrders();
                                    } else {
                                      Swal.fire({
                                        icon: "error",
                                        title: "แก้ไขไม่สำเร็จ",
                                        text: data.message,
                                        confirmButtonColor: "#f97316",
                                      });
                                    }
                                    setEditingItemId(null);
                                  }}
                                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold"
                                >
                                  ✓ บันทึก
                                </button>
                                <button
                                  onClick={() => setEditingItemId(null)}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-medium"
                                >
                                  ยกเลิก
                                </button>
                              </>
                            ) : (
                              <>
                                <p className="font-semibold text-amber-600">
                                  ฿{formatPrice(item.price * item.quantity)}
                                </p>
                                {canRemove && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingItemId(item.id);
                                        setEditQty(item.quantity);
                                      }}
                                      className="p-1.5 rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors"
                                      title="แก้ไขจำนวน"
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
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() =>
                                        removeOrderItem(
                                          selectedOrder!.id,
                                          item.id,
                                          item.productName,
                                        )
                                      }
                                      className="p-1.5 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition-colors"
                                      title="ลบสินค้านี้"
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
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* ปุ่มเพิ่มสินค้า */}
                  {selectedOrder &&
                    !["delivered", "cancelled"].includes(
                      selectedOrder.orderStatus,
                    ) &&
                    selectedOrder.orderType !== "pos" && (
                      <button
                        onClick={() => {
                          fetchAllProducts();
                          setShowAddProductModal(true);
                          setAddSearch("");
                          setAddFilterCategory("all");
                        }}
                        className="w-full mt-2 py-2 border-2 border-dashed border-amber-300 text-amber-600 rounded-xl hover:bg-amber-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        ➕ เพิ่มสินค้าใน order นี้
                      </button>
                    )}
                </div>

                {/* Price */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-amber-800">
                    <span>ยอดรวมสินค้า</span>
                    <span>฿{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-amber-800">
                    <span>ค่าจัดส่ง</span>
                    <span
                      className={
                        selectedOrder.shipping > 0
                          ? "text-red-500"
                          : "text-green-600"
                      }
                    >
                      {selectedOrder.shipping > 0
                        ? `฿${formatPrice(selectedOrder.shipping)}`
                        : "ฟรี"}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>ยอดรวม</span>
                    <span className="text-amber-600">
                      ฿{formatPrice(selectedOrder.total)}
                    </span>
                  </div>
                </div>

                {/* Payment */}
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    💰 การชำระเงิน
                  </p>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">วิธีชำระเงิน</span>
                      <span>
                        {selectedOrder.paymentMethod === "qr_promptpay"
                          ? "📱 QR PromptPay"
                          : selectedOrder.paymentMethod === "cash"
                            ? "💵 เงินสด"
                            : "💳 บัตร"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">สถานะ</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentBadge(selectedOrder.paymentStatus).bg}`}
                      >
                        {getPaymentBadge(selectedOrder.paymentStatus).text}
                      </span>
                    </div>
                  </div>
                  {selectedOrder.slipImage && (
                    <button
                      onClick={() =>
                        setSlipModal(
                          selectedOrder.slipImage.startsWith("http")
                            ? selectedOrder.slipImage
                            : `${process.env.NEXT_PUBLIC_API_URL}${selectedOrder.slipImage}`,
                        )
                      }
                      className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium w-full"
                    >
                      🧾 ดูสลิปการโอนเงิน
                    </button>
                  )}
                </div>

                {/* Shipping */}
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    📦 ข้อมูลการสั่งซื้อ
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                    <p>
                      <span className="text-gray-500">ชื่อผู้รับ:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.receiverName}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500">เบอร์โทร:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.receiverPhone}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500">ที่อยู่:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.receiverAddress}
                      </span>
                    </p>
                    {selectedOrder.note && (
                      <p>
                        <span className="text-gray-500">หมายเหตุ:</span>{" "}
                        <span className="font-medium">
                          {selectedOrder.note}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 py-3 bg-gray-100 text-amber-800 rounded-xl hover:bg-gray-200 font-medium"
                  >
                    ปิด
                  </button>
                  <button
                    onClick={() => printReceipt(selectedOrder, orderItems)}
                    className="flex-1 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-medium flex items-center justify-center gap-2"
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
            )}
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setShowAddProductModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-amber-500 text-white px-5 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-bold text-lg">➕ เพิ่มสินค้า</h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="hover:bg-amber-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-4 border-b">
              <input
                type="text"
                placeholder="ค้นหาชื่อสินค้า..."
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* ✅ Category Filter */}
            <div className="flex gap-1.5 px-3 py-2 border-b overflow-x-auto scrollbar-hide flex-shrink-0">
              {[
                "all",
                ...Array.from(new Set(allProducts.map((p) => p.category))),
              ].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setAddFilterCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    addFilterCategory === cat
                      ? "bg-amber-500 text-white"
                      : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  {cat === "all" ? "ทั้งหมด" : cat}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {allProducts
                .filter(
                  (p) =>
                    p.name.toLowerCase().includes(addSearch.toLowerCase()) &&
                    (addFilterCategory === "all" ||
                      p.category === addFilterCategory) &&
                    (p.stockQuantity > 0 || p.stockQuantity === 9999) &&
                    p.isAvailable,
                )
                .map((p) => {
                  const opts = parseOptions(p.options);
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setAddingProduct(p);
                        setAddQty(1);
                        setSelectedAddOption(null);
                        if (opts.length > 0) {
                          setAddOptionModal(true);
                        } else {
                          doAddProductToOrder(p, null);
                        }
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-amber-100 hover:border-amber-400 hover:bg-amber-50 text-left transition-all"
                    >
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-amber-700 text-sm truncate">
                          {p.name}
                        </p>
                        <p className="text-amber-500 text-xs font-bold">
                          ฿{formatPrice(p.price)}
                        </p>
                        {opts.length > 0 && (
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {opts.map((o) => (
                              <span
                                key={o.name}
                                className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full"
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
              {allProducts.filter((p) =>
                p.name.toLowerCase().includes(addSearch.toLowerCase()),
              ).length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  ไม่พบสินค้า
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Option Modal สำหรับเพิ่มสินค้า */}
      {addOptionModal && addingProduct && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
          onClick={() => setAddOptionModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-amber-500 text-white px-5 py-4 rounded-t-2xl">
              <h3 className="font-bold">เลือกตัวเลือก</h3>
              <p className="text-amber-100 text-sm">{addingProduct.name}</p>
            </div>
            <div className="p-4 space-y-2">
              {parseOptions(addingProduct.options).map((o) => (
                <button
                  key={o.name}
                  onClick={() => setSelectedAddOption(o)}
                  className={`w-full flex justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                    selectedAddOption?.name === o.name
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 hover:border-amber-300"
                  }`}
                >
                  <span className="font-medium text-amber-700">{o.name}</span>
                  <span className="text-sm text-green-600">
                    ฿{formatPrice(addingProduct.price + o.extraPrice)}
                    {o.extraPrice > 0 ? ` (+฿${o.extraPrice})` : ""}
                  </span>
                </button>
              ))}
            </div>
            <div className="px-4 pb-4 flex gap-3">
              <button
                onClick={() => setAddOptionModal(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
              >
                ยกเลิก
              </button>
              <button
                disabled={!selectedAddOption}
                onClick={() => {
                  setAddOptionModal(false);
                  doAddProductToOrder(addingProduct, selectedAddOption);
                }}
                className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 disabled:opacity-40"
              >
                ✅ เพิ่ม
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slip Image Modal */}
      {slipModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setSlipModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-4 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-amber-700">
                🧾 สลิปการโอนเงิน
              </h3>
              <button
                onClick={() => setSlipModal(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <img
              src={slipModal}
              alt="Payment Slip"
              className="w-full rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "";
                (e.target as HTMLImageElement).alt = "ไม่สามารถโหลดรูปสลิปได้";
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
