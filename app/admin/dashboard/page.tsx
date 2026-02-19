"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Order {
  id: number;
  email: string;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  receiverName: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      if (!user.email?.endsWith("@empbakery.com")) {
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        router.push("/");
        return;
      }
    } else {
      router.push("/login");
      return;
    }

    fetchDashboardData();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      // ดึงข้อมูลสินค้า
      const productsRes = await fetch("https://bakery-backend-production-6fc9.up.railway.app/api/products");
      if (productsRes.ok) {
        const products = await productsRes.json();
        setTotalProducts(products.length);
        setLowStockProducts(
          products.filter((p: any) => p.stockQuantity <= 5).length,
        );
      }

      // ดึงข้อมูล Orders จริง
      const ordersRes = await fetch("https://bakery-backend-production-6fc9.up.railway.app/api/orders/all");
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }

      // ดึงข้อมูล Users จริง
      const usersRes = await fetch("https://bakery-backend-production-6fc9.up.railway.app/api/auth/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setTotalUsers(usersData.length);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // คำนวณสถิติจากข้อมูลจริง
  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter((o) => o.orderStatus !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  const pendingOrders = orders.filter(
    (o) => o.orderStatus === "pending",
  ).length;

  // orders ล่าสุด 5 รายการ
  const recentOrders = orders.slice(0, 5);

  // คำนวณ % เทียบกับสัปดาห์ก่อน
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeekOrders = orders.filter(
    (o) => new Date(o.createdAt) >= oneWeekAgo,
  );
  const lastWeekOrders = orders.filter(
    (o) =>
      new Date(o.createdAt) >= twoWeeksAgo &&
      new Date(o.createdAt) < oneWeekAgo,
  );

  const thisWeekRevenue = thisWeekOrders
    .filter((o) => o.orderStatus !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);
  const lastWeekRevenue = lastWeekOrders
    .filter((o) => o.orderStatus !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  const revenueChange =
    lastWeekRevenue > 0
      ? Math.round(
          ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100,
        )
      : 0;

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <span className="text-4xl">📊</span>
            Dashboard
          </h1>
          <p className="text-slate-600 mt-1">ภาพรวมของร้าน My Bakery</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Products */}
          <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">
                  สินค้าทั้งหมด
                </p>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {totalProducts}
                </p>
              </div>
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
            </div>
            <p className="text-xs text-red-500 mt-3">
              ⚠️ {lowStockProducts} รายการใกล้หมด
            </p>
          </div>

          {/* Total Orders */}
          <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">
                  คำสั่งซื้อทั้งหมด
                </p>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {totalOrders}
                </p>
              </div>
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🛒</span>
              </div>
            </div>
            <p className="text-xs text-amber-600 mt-3">
              ⏳ {pendingOrders} รอดำเนินการ
            </p>
          </div>

          {/* Total Users */}
          <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">
                  สมาชิกทั้งหมด
                </p>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {totalUsers}
                </p>
              </div>
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">รายได้รวม</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  ฿{totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
            {revenueChange !== 0 && (
              <p
                className={`text-xs mt-3 ${
                  revenueChange > 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {revenueChange > 0 ? "↑" : "↓"} {Math.abs(revenueChange)}%
                จากสัปดาห์ที่แล้ว
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions & Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span>⚡</span> การดำเนินการด่วน
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/admin/crudproduct")}
                className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-left"
              >
                <span className="text-xl">📦</span>
                <span className="font-medium text-slate-700">จัดการสินค้า</span>
              </button>
              <button
                onClick={() => router.push("/admin/order")}
                className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors text-left"
              >
                <span className="text-xl">🛒</span>
                <div>
                  <span className="font-medium text-slate-700">
                    จัดการคำสั่งซื้อ
                  </span>
                  {pendingOrders > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {pendingOrders} รอดำเนินการ
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => router.push("/admin/users")}
                className="w-full flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors text-left"
              >
                <span className="text-xl">👥</span>
                <span className="font-medium text-slate-700">จัดการผู้ใช้</span>
              </button>
              <button
                onClick={() => router.push("/admin/reports")}
                className="w-full flex items-center gap-3 p-3 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors text-left"
              >
                <span className="text-xl">📋</span>
                <span className="font-medium text-slate-700">ดูรายงาน</span>
              </button>
              <button
                onClick={() => router.push("/admin/account")}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
              >
                <span className="text-xl">⚙️</span>
                <span className="font-medium text-slate-700">ตั้งค่าบัญชี</span>
              </button>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span>📋</span> คำสั่งซื้อล่าสุด
            </h2>

            {recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">📭</div>
                <p className="text-slate-500">ยังไม่มีคำสั่งซื้อ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-2 text-sm font-semibold text-slate-600">
                        รหัส
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-slate-600">
                        ลูกค้า
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-slate-600">
                        ยอดรวม
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-slate-600">
                        สถานะ
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-slate-600">
                        วันที่
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => router.push("/admin/order")}
                      >
                        <td className="py-3 px-2 text-sm font-medium text-slate-800">
                          #{order.id}
                        </td>
                        <td className="py-3 px-2">
                          <p className="text-sm text-slate-800 font-medium">
                            {order.receiverName || "-"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {order.email}
                          </p>
                        </td>
                        <td className="py-3 px-2 text-sm font-semibold text-amber-600">
                          ฿{order.total.toLocaleString()}
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                              order.orderStatus,
                            )}`}
                          >
                            {getStatusText(order.orderStatus)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs text-slate-500">
                          {formatDate(order.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={() => router.push("/admin/order")}
              className="w-full mt-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
            >
              ดูทั้งหมด →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}