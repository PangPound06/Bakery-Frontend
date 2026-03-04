"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Order {
  id: number;
  email: string;
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  receiverName: string;
  createdAt: string;
}

interface OrderItem {
  id: number;
  productName: string;
  price: number;
  quantity: number;
}

interface OrderWithItems extends Order {
  items: OrderItem[];
}

type SalesViewMode = "daily" | "monthly" | "yearly";

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "sales">("orders");
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [salesView, setSalesView] = useState<SalesViewMode>("daily");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      if (!user.email?.endsWith("@empbakery.com")) {
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        router.replace("/");
        return;
      }
    } else {
      router.replace("/login");
      return;
    }
    fetchReportData();
  }, [router]);

  const fetchReportData = async () => {
    try {
      const ordersRes = await fetch(
        "https://bakery-backend-production-6fc9.up.railway.app/api/orders/all",
      );
      if (ordersRes.ok) {
        const ordersData: Order[] = await ordersRes.json();
        const ordersWithItems: OrderWithItems[] = await Promise.all(
          ordersData.map(async (order) => {
            try {
              const detailRes = await fetch(
                `https://bakery-backend-production-6fc9.up.railway.app/api/orders/${order.id}`,
              );
              if (detailRes.ok) {
                const detail = await detailRes.json();
                return { ...order, items: detail.items || [] };
              }
            } catch (err) {}
            return { ...order, items: [] };
          }),
        );
        setOrders(ordersWithItems);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "delivered":
        return "จัดส่งแล้ว";
      case "pending":
        return "รอดำเนินการ";
      case "confirmed":
        return "ยืนยันแล้ว";
      case "preparing":
        return "กำลังเตรียม";
      case "shipping":
        return "กำลังจัดส่ง";
      case "cancelled":
        return "ยกเลิก";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "confirmed":
        return "bg-blue-100 text-blue-700";
      case "preparing":
        return "bg-indigo-100 text-indigo-700";
      case "shipping":
        return "bg-purple-100 text-purple-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case "qr_promptpay":
        return "PromptPay";
      case "card":
        return "บัตรเครดิต";
      default:
        return method;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(
      dateStr + (dateStr.endsWith("Z") || dateStr.includes("+") ? "" : "Z"),
    );
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    });
  };

  const filteredOrders = orders.filter((order) => {
    if (filterStatus === "all") return true;
    return order.orderStatus === filterStatus;
  });

  const validOrders = orders.filter((o) => o.orderStatus !== "cancelled");
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrderCount = orders.length;
  const avgOrderValue =
    validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;

  const buildSalesData = () => {
    const grouped: { [key: string]: { revenue: number; orders: number } } = {};
    validOrders.forEach((order) => {
      const date = new Date(order.createdAt);
      let key = "";
      if (salesView === "daily") key = date.toISOString().split("T")[0];
      else if (salesView === "monthly")
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      else key = `${date.getFullYear()}`;

      if (!grouped[key]) grouped[key] = { revenue: 0, orders: 0 };
      grouped[key].revenue += order.total;
      grouped[key].orders += 1;
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({ key, ...data }));
  };

  const salesData = buildSalesData();
  const maxRevenue = Math.max(...salesData.map((d) => d.revenue), 1);
  const totalSalesRevenue = salesData.reduce((sum, d) => sum + d.revenue, 0);
  const totalSalesOrders = salesData.reduce((sum, d) => sum + d.orders, 0);
  const totalPeriods = salesData.length || 1;

  const formatSalesLabel = (key: string): string => {
    if (salesView === "daily") {
      const d = new Date(key);
      const thYear = d.getFullYear() + 543;
      return `${d.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} ${String(thYear).slice(-2)}`;
    } else if (salesView === "monthly") {
      const [year, month] = key.split("-");
      const d = new Date(parseInt(year), parseInt(month) - 1);
      const thYear = d.getFullYear() + 543;
      return `${d.toLocaleDateString("th-TH", { month: "long" })} ${thYear}`;
    } else {
      return `พ.ศ. ${parseInt(key) + 543}`;
    }
  };

  const formatSalesLabelEN = (key: string): string => {
    if (salesView === "daily") {
      const d = new Date(key);
      return d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } else if (salesView === "monthly") {
      const [year, month] = key.split("-");
      const d = new Date(parseInt(year), parseInt(month) - 1);
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } else {
      return key;
    }
  };

  const getStatusTextEN = (status: string): string => {
    switch (status) {
      case "delivered":
        return "Delivered";
      case "pending":
        return "Pending";
      case "confirmed":
        return "Confirmed";
      case "preparing":
        return "Preparing";
      case "shipping":
        return "Shipping";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const getPaymentMethodTextEN = (method: string): string => {
    switch (method) {
      case "qr_promptpay":
        return "PromptPay";
      case "card":
        return "Credit Card";
      default:
        return method;
    }
  };

  const formatDateRange = (): string => {
    if (salesData.length === 0) return "ยังไม่มีข้อมูล";
    const first = salesData[0].key;
    const last = salesData[salesData.length - 1].key;
    return `${formatSalesLabel(first)} — ${formatSalesLabel(last)} (${salesData.length} ${getPeriodLabel()})`;
  };

  const getPeriodLabel = (): string => {
    switch (salesView) {
      case "daily":
        return "วัน";
      case "monthly":
        return "เดือน";
      case "yearly":
        return "ปี";
    }
  };

  const exportPDF = async () => {
    setExporting(true);

    try {
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let y = 20;

      doc.setFillColor(45, 45, 45);
      doc.rect(0, 0, pageWidth, 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text("My Bakery", margin, 15);
      doc.setFontSize(10);
      doc.text("Sales Report", margin, 23);

      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      doc.setFontSize(9);
      doc.text(dateStr, pageWidth - margin, 15, { align: "right" });
      doc.text(
        `View: ${salesView === "daily" ? "Daily" : salesView === "monthly" ? "Monthly" : "Yearly"}`,
        pageWidth - margin,
        23,
        { align: "right" },
      );

      y = 45;

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text("SUMMARY", margin, y);
      y += 6;

      const cardWidth = (pageWidth - margin * 2 - 10) / 3;
      const cardData = [
        {
          label: "Total Revenue",
          value: `${totalRevenue.toLocaleString()} THB`,
          color: [34, 197, 94],
        },
        {
          label: "Total Orders",
          value: `${totalOrderCount}`,
          color: [59, 130, 246],
        },
        {
          label: "Avg per Order",
          value: `${avgOrderValue.toLocaleString()} THB`,
          color: [245, 158, 11],
        },
      ];

      cardData.forEach((card, i) => {
        const x = margin + i * (cardWidth + 5);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(x, y, cardWidth, 22, 2, 2, "F");
        doc.setDrawColor(card.color[0], card.color[1], card.color[2]);
        doc.setLineWidth(0.8);
        doc.line(x, y + 2, x, y + 20);
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(8);
        doc.text(card.label, x + 4, y + 7);
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(13);
        doc.text(card.value, x + 4, y + 16);
      });

      y += 32;

      if (activeTab === "sales") {
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text(`SALES BY ${salesView.toUpperCase()}`, margin, y);
        y += 3;

        const salesTableBody = salesData.map((data) => [
          formatSalesLabelEN(data.key),
          `${data.revenue.toLocaleString()} THB`,
          `${data.orders}`,
        ]);
        salesTableBody.push([
          "Total",
          `${totalSalesRevenue.toLocaleString()} THB`,
          `${totalSalesOrders}`,
        ]);

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Period", "Revenue", "Orders"]],
          body: salesTableBody,
          theme: "plain",
          headStyles: {
            fillColor: [45, 45, 45],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: "bold",
            cellPadding: 4,
          },
          bodyStyles: {
            fontSize: 9,
            cellPadding: 3.5,
            textColor: [50, 50, 50],
          },
          alternateRowStyles: { fillColor: [248, 248, 248] },
          didParseCell: (data: any) => {
            if (
              data.section === "body" &&
              data.row.index === salesTableBody.length - 1
            ) {
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.fillColor = [240, 240, 240];
            }
          },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { halign: "right" },
            2: { halign: "center", cellWidth: 25 },
          },
        });

        y = (doc as any).lastAutoTable.finalY + 10;

        if (y > 260) {
          doc.addPage();
          y = 20;
        }
        doc.setFillColor(255, 248, 235);
        doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 2, 2, "F");
        const summaryItems = [
          `Revenue: ${totalSalesRevenue.toLocaleString()} THB`,
          `Orders: ${totalSalesOrders}`,
          `Avg/${salesView === "daily" ? "Day" : salesView === "monthly" ? "Month" : "Year"}: ${Math.round(totalSalesRevenue / totalPeriods).toLocaleString()} THB`,
          `Periods: ${totalPeriods}`,
        ];
        doc.setFontSize(8);
        doc.setTextColor(120, 90, 30);
        summaryItems.forEach((item, i) => {
          const x = margin + 5 + i * ((pageWidth - margin * 2 - 10) / 4);
          doc.text(item, x, y + 12);
        });
      } else {
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        const filterLabel =
          filterStatus === "all" ? "ALL" : filterStatus.toUpperCase();
        doc.text(
          `ORDERS (${filterLabel}) - ${filteredOrders.length} items`,
          margin,
          y,
        );
        y += 3;

        const ordersTableBody = filteredOrders.map((order) => [
          `#ORD${String(order.id * 104729 % 1000000).padStart(6, "0")}${order.id}`,
          order.receiverName || "-",
          order.items
            .map((item) => `${item.productName} x${item.quantity}`)
            .join(", ") || "-",
          `${order.total.toLocaleString()}`,
          getPaymentMethodTextEN(order.paymentMethod),
          getStatusTextEN(order.orderStatus),
          new Date(order.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        ]);

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [
            ["ID", "Customer", "Items", "Total", "Payment", "Status", "Date"],
          ],
          body: ordersTableBody,
          theme: "plain",
          headStyles: {
            fillColor: [45, 45, 45],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: "bold",
            cellPadding: 3,
          },
          bodyStyles: {
            fontSize: 7.5,
            cellPadding: 2.5,
            textColor: [50, 50, 50],
          },
          alternateRowStyles: { fillColor: [248, 248, 248] },
          columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 25 },
            2: { cellWidth: 50 },
            3: { halign: "right", cellWidth: 22 },
            4: { cellWidth: 22 },
            5: { cellWidth: 22 },
            6: { cellWidth: 28 },
          },
        });
      }

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(180, 180, 180);
        doc.text(
          `My Bakery Report - Page ${i}/${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" },
        );
      }

      const fileName = `MyBakery_${activeTab === "sales" ? "Sales" : "Orders"}_${salesView}_${now.toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("PDF export error:", error);
      alert("เกิดข้อผิดพลาดในการสร้าง PDF กรุณาลองใหม่");
    } finally {
      setExporting(false);
    }
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
    <div className="min-h-screen bg-amber-50 py-6 md:py-8 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-amber-800 flex items-center gap-3">
              <span className="text-3xl md:text-4xl">📋</span> Report
            </h1>
            <p className="text-amber-600 mt-1">ดูสถิติและรายงานการขาย</p>
          </div>

          <button
            onClick={exportPDF}
            disabled={exporting}
            className="flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-md hover:shadow-lg text-sm md:text-base"
          >
            {exporting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                กำลังสร้าง PDF...
              </>
            ) : (
              <>
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                พิมพ์ PDF
              </>
            )}
          </button>
        </div>

        {/* ✅ Summary Cards — ปรับ grid-cols-1 sm:grid-cols-3 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white rounded-2xl shadow-md p-4 md:p-6 border-l-4 border-green-500">
            <p className="text-slate-500 text-xs md:text-sm">รายได้รวม</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">
              ฿{totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ไม่รวมคำสั่งซื้อที่ยกเลิก
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-4 md:p-6 border-l-4 border-blue-500">
            <p className="text-slate-500 text-xs md:text-sm">
              คำสั่งซื้อทั้งหมด
            </p>
            <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">
              {totalOrderCount} รายการ
            </p>
            <p className="text-xs text-slate-400 mt-1">
              สำเร็จ{" "}
              {orders.filter((o) => o.orderStatus === "delivered").length}{" "}
              รายการ
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-4 md:p-6 border-l-4 border-amber-500">
            <p className="text-slate-500 text-xs md:text-sm">
              ยอดเฉลี่ยต่อออเดอร์
            </p>
            <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">
              ฿{avgOrderValue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-medium transition-all text-sm md:text-base ${activeTab === "orders" ? "bg-amber-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
          >
            📦 คำสั่งซื้อ
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-medium transition-all text-sm md:text-base ${activeTab === "sales" ? "bg-amber-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
          >
            📊 ยอดขาย
          </button>
        </div>

        {/* ═══════ Orders Tab ═══════ */}
        {activeTab === "orders" && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            {/* ✅ Filter — ใช้ overflow-x-auto สำหรับ tablet */}
            <div className="p-3 md:p-4 border-b border-slate-100 overflow-x-auto">
              <div className="flex gap-2 items-center min-w-max">
                <span className="text-slate-600 font-medium text-sm shrink-0">
                  กรอง:
                </span>
                {[
                  { key: "all", label: "ทั้งหมด" },
                  { key: "pending", label: "รอดำเนินการ" },
                  { key: "confirmed", label: "ยืนยันแล้ว" },
                  { key: "preparing", label: "กำลังเตรียม" },
                  { key: "shipping", label: "กำลังจัดส่ง" },
                  { key: "delivered", label: "จัดส่งแล้ว" },
                  { key: "cancelled", label: "ยกเลิก" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setFilterStatus(item.key)}
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${filterStatus === item.key ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {item.label}
                    <span className="ml-1 opacity-70">
                      (
                      {item.key === "all"
                        ? orders.length
                        : orders.filter((o) => o.orderStatus === item.key)
                            .length}
                      )
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ✅ Table — ซ่อนคอลัมน์บาง column บน tablet */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-600">
                      รหัส
                    </th>
                    <th className="px-3 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-600">
                      ลูกค้า
                    </th>
                    <th className="px-3 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-600 hidden lg:table-cell">
                      รายการ
                    </th>
                    <th className="px-3 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-600">
                      ยอดรวม
                    </th>
                    <th className="px-3 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-600 hidden md:table-cell">
                      ชำระเงิน
                    </th>
                    <th className="px-3 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-600">
                      สถานะ
                    </th>
                    <th className="px-3 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-600 hidden md:table-cell">
                      วันที่
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-3 md:px-4 py-3 md:py-4 font-medium text-slate-800 text-sm">
                        #ORD{String(order.id * 104729 % 1000000).padStart(6, "0")}{order.id}
                      </td>
                      <td className="px-3 md:px-4 py-3 md:py-4">
                        <p className="text-xs md:text-sm font-medium text-slate-800">
                          {order.receiverName || "-"}
                        </p>
                        <p className="text-xs text-slate-500 hidden lg:block">
                          {order.email}
                        </p>
                      </td>
                      <td className="px-3 md:px-4 py-3 md:py-4 hidden lg:table-cell">
                        <div className="text-xs md:text-sm text-slate-600">
                          {order.items.length > 0 ? (
                            order.items.map((item, i) => (
                              <div key={i}>
                                {item.productName} x{item.quantity}
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-3 md:py-4 font-semibold text-amber-600 text-sm">
                        ฿{order.total.toLocaleString()}
                      </td>
                      <td className="px-3 md:px-4 py-3 md:py-4 text-xs md:text-sm text-slate-600 hidden md:table-cell">
                        {getPaymentMethodText(order.paymentMethod)}
                      </td>
                      <td className="px-3 md:px-4 py-3 md:py-4">
                        <span
                          className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.orderStatus)}`}
                        >
                          {getStatusText(order.orderStatus)}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-3 md:py-4 text-slate-500 text-xs hidden md:table-cell">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-slate-500">ไม่พบคำสั่งซื้อ</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════ Sales Tab ═══════ */}
        {activeTab === "sales" && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                <h3 className="text-base md:text-lg font-bold text-slate-800">
                  📊 ยอดขาย
                  {salesView === "daily"
                    ? "รายวัน"
                    : salesView === "monthly"
                      ? "รายเดือน"
                      : "รายปี"}
                </h3>
                <div className="flex bg-slate-100 rounded-xl p-1">
                  {[
                    { key: "daily" as SalesViewMode, label: "รายวัน" },
                    { key: "monthly" as SalesViewMode, label: "รายเดือน" },
                    { key: "yearly" as SalesViewMode, label: "รายปี" },
                  ].map((mode) => (
                    <button
                      key={mode.key}
                      onClick={() => setSalesView(mode.key)}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${salesView === mode.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs md:text-sm text-slate-500 mb-6">
                {formatDateRange()}
              </p>

              {salesData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">📭</div>
                  <p className="text-slate-500">ยังไม่มียอดขาย</p>
                </div>
              ) : (
                <>
                  <div className="max-h-[500px] overflow-y-auto space-y-2 md:space-y-3 pr-2">
                    {salesData.map((data) => (
                      <div
                        key={data.key}
                        className="flex items-center gap-2 md:gap-3"
                      >
                        <div className="w-24 md:w-32 lg:w-36 text-xs md:text-sm text-slate-600 font-medium shrink-0 text-right">
                          {formatSalesLabel(data.key)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 md:h-7 bg-gradient-to-r from-amber-500 to-amber-400 rounded-lg transition-all duration-500"
                              style={{
                                width: `${data.revenue > 0 ? (data.revenue / maxRevenue) * 100 : 0}%`,
                                minWidth: data.revenue > 0 ? "4px" : "0",
                              }}
                            ></div>
                            <span className="text-xs md:text-sm font-medium text-slate-700 whitespace-nowrap">
                              ฿{data.revenue.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="w-16 md:w-24 text-right text-xs md:text-sm text-slate-500 shrink-0">
                          {data.orders}{" "}
                          <span className="hidden md:inline">ออเดอร์</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ✅ Summary — ปรับ grid-cols-2 sm:grid-cols-4 */}
                  <div className="mt-6 md:mt-8 p-3 md:p-4 bg-amber-50 rounded-xl">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 text-center">
                      <div>
                        <p className="text-xs md:text-sm text-slate-500">
                          รายได้รวมทั้งหมด
                        </p>
                        <p className="text-lg md:text-xl font-bold text-amber-600">
                          ฿{totalSalesRevenue.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs md:text-sm text-slate-500">
                          ออเดอร์รวม
                        </p>
                        <p className="text-lg md:text-xl font-bold text-slate-800">
                          {totalSalesOrders}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs md:text-sm text-slate-500">
                          เฉลี่ย/{getPeriodLabel()}
                        </p>
                        <p className="text-lg md:text-xl font-bold text-green-600">
                          ฿
                          {Math.round(
                            totalSalesRevenue / totalPeriods,
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs md:text-sm text-slate-500">
                          จำนวน{getPeriodLabel()}ที่มียอดขาย
                        </p>
                        <p className="text-lg md:text-xl font-bold text-blue-600">
                          {totalPeriods} {getPeriodLabel()}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}