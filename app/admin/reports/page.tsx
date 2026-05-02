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
  orderType?: string;
  receiverName: string;
  createdAt: string;
  ordCode: string;
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

type SalesViewMode = "daily" | "weekly" | "monthly" | "yearly";
type DateRange =
  | "today"
  | "7d"
  | "30d"
  | "this_month"
  | "this_year"
  | "all"
  | "custom";

const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "sales">("orders");
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [salesView, setSalesView] = useState<SalesViewMode>("daily");
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<"pdf" | "excel" | null>(null);

  // ✅ Date range filter
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      if (!user.email?.endsWith("@empbakery.com")) {
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
      const token = localStorage.getItem("token");

      const ordersRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/all`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (ordersRes.ok) {
        const ordersData: Order[] = await ordersRes.json();
        const ordersWithItems: OrderWithItems[] = await Promise.all(
          ordersData.map(async (order) => {
            try {
              const detailRes = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${order.id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                },
              );
              if (detailRes.ok) {
                const detail = await detailRes.json();
                return { ...order, items: detail.items || [] };
              }
            } catch {}
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

  // ✅ Date range filtering
  const getDateCutoff = (): { start: Date; end: Date } => {
    const now = new Date();
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );

    switch (dateRange) {
      case "today": {
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
        );
        return { start: startOfDay, end: endOfDay };
      }
      case "7d":
        return { start: new Date(now.getTime() - 7 * 86400000), end: endOfDay };
      case "30d":
        return {
          start: new Date(now.getTime() - 30 * 86400000),
          end: endOfDay,
        };
      case "this_month": {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: startOfMonth, end: endOfDay };
      }
      case "this_year": {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return { start: startOfYear, end: endOfDay };
      }
      case "custom": {
        const s = customStart
          ? new Date(customStart + "T00:00:00")
          : new Date(0);
        const e = customEnd ? new Date(customEnd + "T23:59:59") : endOfDay;
        return { start: s, end: e };
      }
      default:
        return { start: new Date(0), end: endOfDay };
    }
  };

  const { start: dateStart, end: dateEnd } = getDateCutoff();

  const dateFilteredOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return d >= dateStart && d <= dateEnd;
  });

  const filteredOrders = dateFilteredOrders.filter((order) => {
    if (filterStatus === "all") return true;
    return order.orderStatus === filterStatus;
  });

  const validOrders = dateFilteredOrders.filter((o) =>
    ["confirmed", "preparing", "shipping", "delivered"].includes(o.orderStatus),
  );
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrderCount = dateFilteredOrders.length;
  const avgOrderValue =
    validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;

  // ✅ Sales data builder
  const buildSalesData = () => {
    const grouped: { [key: string]: { revenue: number; orders: number } } = {};
    validOrders.forEach((order) => {
      const date = new Date(order.createdAt);
      let key = "";
      if (salesView === "daily") key = date.toISOString().split("T")[0];
      else if (salesView === "weekly") {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        key = monday.toISOString().split("T")[0];
      } else if (salesView === "monthly")
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

  // ✅ Helpers
  const getStatusText = (s: string) =>
    ({
      delivered: "คำสั่งซื้อสำเร็จ",
      pending: "รอดำเนินการ",
      confirmed: "ยืนยันแล้ว",
      preparing: "กำลังเตรียม",
      shipping: "กำลังจัดส่ง",
      cancelled: "ยกเลิก",
    })[s] || s;
  const getStatusColor = (s: string) =>
    ({
      delivered: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      confirmed: "bg-blue-100 text-blue-700",
      preparing: "bg-indigo-100 text-indigo-700",
      shipping: "bg-purple-100 text-purple-700",
      cancelled: "bg-red-100 text-red-700",
    })[s] || "bg-gray-100 text-gray-700";
  const getPaymentMethodText = (m: string) =>
    ({ qr_promptpay: "PromptPay", card: "บัตรเครดิต", cash: "เงินสด" })[m] || m;
  const getStatusTextEN = (s: string) =>
    ({
      delivered: "Delivered",
      pending: "Pending",
      confirmed: "Confirmed",
      preparing: "Preparing",
      shipping: "Shipping",
      cancelled: "Cancelled",
    })[s] || s;
  const getPaymentMethodTextEN = (m: string) =>
    ({ qr_promptpay: "PromptPay", card: "Credit Card", cash: "Cash" })[m] || m;
  const formatDate = (dateStr: string) => {
    console.log("formatDate input:", dateStr, typeof dateStr);
    const utcStr = dateStr.endsWith("Z") ? dateStr : dateStr + "Z";
    return new Date(utcStr).toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    });
  };

  const formatSalesLabel = (key: string): string => {
    if (salesView === "daily") {
      const d = new Date(key);
      return `${d.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} ${d.getFullYear() + 543}`;
    } else if (salesView === "weekly") {
      const monday = new Date(key);
      const sunday = new Date(monday.getTime() + 6 * 86400000);
      return `${monday.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} - ${sunday.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`;
    } else if (salesView === "monthly") {
      const [year, month] = key.split("-");
      const d = new Date(parseInt(year), parseInt(month) - 1);
      return `${d.toLocaleDateString("th-TH", { month: "long" })} ${d.getFullYear() + 543}`;
    } else {
      return `พ.ศ. ${parseInt(key) + 543}`;
    }
  };

  const formatSalesLabelEN = (key: string): string => {
    if (salesView === "daily") {
      return new Date(key).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } else if (salesView === "weekly") {
      const monday = new Date(key);
      const sunday = new Date(monday.getTime() + 6 * 86400000);
      return `${monday.toLocaleDateString("en-US", { day: "numeric", month: "short" })} - ${sunday.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}`;
    } else if (salesView === "monthly") {
      const [year, month] = key.split("-");
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" },
      );
    } else {
      return key;
    }
  };

  const getPeriodLabel = (): string =>
    ({ daily: "วัน", weekly: "สัปดาห์", monthly: "เดือน", yearly: "ปี" })[
      salesView
    ] || "";

  const getDateRangeLabel = (): string => {
    const labels: Record<DateRange, string> = {
      today: "วันนี้",
      "7d": "7 วันล่าสุด",
      "30d": "30 วันล่าสุด",
      this_month: "เดือนนี้",
      this_year: "ปีนี้",
      all: "ทั้งหมด",
      custom: "กำหนดเอง",
    };
    return labels[dateRange];
  };

  // ✅ Export Excel
  const exportExcel = async () => {
    setExporting(true);
    setExportType("excel");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      if (activeTab === "orders") {
        const data = filteredOrders.map((order) => ({
          "Order ID":
            order.ordCode ||
            `ORD${String((order.id * 104729) % 1000000).padStart(6, "0")}${order.id}`,
          Customer: order.receiverName || "-",
          Email: order.email,
          Items:
            order.items
              .map((item) => `${item.productName} x${item.quantity}`)
              .join(", ") || "-",
          "Total (THB)": order.total,
          Payment: getPaymentMethodTextEN(order.paymentMethod),
          Status: getStatusTextEN(order.orderStatus),
          Type: order.orderType === "pos" ? "POS" : "Online",
          Date: new Date(order.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        ws["!cols"] = [
          { wch: 18 },
          { wch: 20 },
          { wch: 28 },
          { wch: 40 },
          { wch: 12 },
          { wch: 12 },
          { wch: 12 },
          { wch: 8 },
          { wch: 22 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, "Orders");

        // Summary sheet
        const summaryData = [
          { Metric: "Total Revenue (THB)", Value: totalRevenue },
          { Metric: "Total Orders", Value: totalOrderCount },
          { Metric: "Avg Order Value (THB)", Value: avgOrderValue },
          { Metric: "Date Range", Value: getDateRangeLabel() },
          {
            Metric: "Filter Status",
            Value:
              filterStatus === "all" ? "All" : getStatusTextEN(filterStatus),
          },
        ];
        const summaryWs = XLSX.utils.json_to_sheet(summaryData);
        summaryWs["!cols"] = [{ wch: 25 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
      } else {
        const data = salesData.map((d) => ({
          Period: formatSalesLabelEN(d.key),
          "Revenue (THB)": d.revenue,
          Orders: d.orders,
          "Avg per Order (THB)":
            d.orders > 0 ? Math.round(d.revenue / d.orders) : 0,
        }));
        data.push({
          Period: "TOTAL",
          "Revenue (THB)": totalSalesRevenue,
          Orders: totalSalesOrders,
          "Avg per Order (THB)":
            totalSalesOrders > 0
              ? Math.round(totalSalesRevenue / totalSalesOrders)
              : 0,
        });
        const ws = XLSX.utils.json_to_sheet(data);
        ws["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, ws, `Sales_${salesView}`);
      }

      const now = new Date();
      const fileName = `PoundBakery_${activeTab === "sales" ? "Sales" : "Orders"}_${salesView}_${now.toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("เกิดข้อผิดพลาดในการสร้าง Excel");
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  // ✅ Export PDF
  const exportPDF = async () => {
    setExporting(true);
    setExportType("pdf");
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
      doc.text("Pound Bakery", margin, 15);
      doc.setFontSize(10);
      doc.text("Sales Report", margin, 23);

      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      doc.setFontSize(9);
      doc.text(dateStr, pageWidth - margin, 12, { align: "right" });
      doc.text(`Period: ${getDateRangeLabel()}`, pageWidth - margin, 19, {
        align: "right",
      });
      doc.text(
        `View: ${salesView.charAt(0).toUpperCase() + salesView.slice(1)}`,
        pageWidth - margin,
        26,
        { align: "right" },
      );

      y = 45;

      // Summary cards
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
      } else {
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text(
          `ORDERS (${filterStatus === "all" ? "ALL" : filterStatus.toUpperCase()}) - ${filteredOrders.length} items`,
          margin,
          y,
        );
        y += 3;

        const ordersTableBody = filteredOrders.map((order) => [
          `#${order.ordCode || `ORD${String((order.id * 104729) % 1000000).padStart(6, "0")}${order.id}`}`,
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
          `Pound Bakery Report - Page ${i}/${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" },
        );
      }

      const fileName = `PoundBakery_${activeTab === "sales" ? "Sales" : "Orders"}_${salesView}_${now.toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("PDF export error:", error);
      alert("เกิดข้อผิดพลาดในการสร้าง PDF");
    } finally {
      setExporting(false);
      setExportType(null);
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
          {/* ✅ Export buttons */}
          <div className="flex gap-2">
            <button
              onClick={exportPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-md text-sm"
            >
              {exporting && exportType === "pdf" ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  กำลังสร้าง...
                </>
              ) : (
                <>📄 PDF</>
              )}
            </button>
            <button
              onClick={exportExcel}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-md text-sm"
            >
              {exporting && exportType === "excel" ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  กำลังสร้าง...
                </>
              ) : (
                <>📊 Excel</>
              )}
            </button>
          </div>
        </div>

        {/* ✅ Date Range Filter */}
        <div className="bg-white rounded-2xl shadow-md p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-sm font-medium text-slate-600 shrink-0">
              📅 ช่วงเวลา:
            </span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "today", label: "วันนี้" },
                  { key: "7d", label: "7 วัน" },
                  { key: "30d", label: "30 วัน" },
                  { key: "this_month", label: "เดือนนี้" },
                  { key: "this_year", label: "ปีนี้" },
                  { key: "all", label: "ทั้งหมด" },
                  { key: "custom", label: "กำหนดเอง" },
                ] as { key: DateRange; label: string }[]
              ).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setDateRange(item.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dateRange === item.key ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {dateRange === "custom" && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full sm:w-auto px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-slate-400 text-sm">ถึง</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full sm:w-auto px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white rounded-2xl shadow-md p-4 md:p-6 border-l-4 border-green-500 flex sm:block items-center justify-between gap-4">
            <p className="text-slate-500 text-xs md:text-sm shrink-0">
              รายได้รวม
            </p>
            <p className="text-xl md:text-3xl font-bold text-slate-800">
              ฿{formatPrice(totalRevenue)}
            </p>
            <p className="text-xs text-slate-400 mt-1 hidden md:block">
              ไม่รวมคำสั่งซื้อที่ยกเลิกและรอดำเนินการ • {getDateRangeLabel()}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-4 md:p-6 border-l-4 border-blue-500 flex sm:block items-center justify-between gap-4">
            <p className="text-slate-500 text-xs md:text-sm shrink-0">
              คำสั่งซื้อทั้งหมด
            </p>
            <p className="text-xl md:text-3xl font-bold text-slate-800">
              {totalOrderCount} รายการ
            </p>
            <p className="text-xs text-slate-400 mt-1 hidden md:block">
              สำเร็จ{" "}
              {
                dateFilteredOrders.filter((o) => o.orderStatus === "delivered")
                  .length
              }{" "}
              รายการ
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-4 md:p-6 border-l-4 border-amber-500 flex sm:block items-center justify-between gap-4">
            <p className="text-slate-500 text-xs md:text-sm shrink-0">
              ยอดเฉลี่ยต่อออเดอร์
            </p>
            <p className="text-xl md:text-3xl font-bold text-slate-800">
              ฿{formatPrice(avgOrderValue)}
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

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
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
                  { key: "delivered", label: "คำสั่งซื้อสำเร็จ" },
                  { key: "cancelled", label: "ยกเลิก" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setFilterStatus(item.key)}
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${filterStatus === item.key ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {item.label}{" "}
                    <span className="ml-1 opacity-70">
                      (
                      {item.key === "all"
                        ? dateFilteredOrders.length
                        : dateFilteredOrders.filter(
                            (o) => o.orderStatus === item.key,
                          ).length}
                      )
                    </span>
                  </button>
                ))}
              </div>
            </div>
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
                        #
                        {order.ordCode ||
                          `ORD${String((order.id * 104729) % 1000000).padStart(6, "0")}${order.id}`}
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
                        ฿{formatPrice(order.total)}
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

        {/* Sales Tab */}
        {activeTab === "sales" && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-base md:text-lg font-bold text-slate-800">
                  📊 ยอดขาย
                  {salesView === "daily"
                    ? "รายวัน"
                    : salesView === "weekly"
                      ? "รายสัปดาห์"
                      : salesView === "monthly"
                        ? "รายเดือน"
                        : "รายปี"}
                </h3>
                <div className="flex bg-slate-100 rounded-xl p-1">
                  {[
                    { key: "daily" as SalesViewMode, label: "รายวัน" },
                    { key: "weekly" as SalesViewMode, label: "รายสัปดาห์" },
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
                        <div className="w-28 md:w-36 lg:w-44 text-xs md:text-sm text-slate-600 font-medium shrink-0 text-right">
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
                              ฿{formatPrice(data.revenue)}
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

                  <div className="mt-6 md:mt-8 p-3 md:p-4 bg-amber-50 rounded-xl">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 text-center">
                      <div>
                        <p className="text-xs md:text-sm text-slate-500">
                          รายได้รวมทั้งหมด
                        </p>
                        <p className="text-lg md:text-xl font-bold text-amber-600">
                          ฿{formatPrice(totalSalesRevenue)}
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
                          {formatPrice(
                            Math.round(totalSalesRevenue / totalPeriods),
                          )}
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
