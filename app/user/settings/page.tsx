"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Password Change
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Notification Settings
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: false,
    newsletter: false,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);

    const savedSettings = localStorage.getItem("userSettings");
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setNotifications(settings.notifications || notifications);
    }
  }, [router]);

  const handleChangePassword = async () => {
    setError("");
    setSuccess("");

    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }

    // ✅ ตรวจสอบว่ารหัสใหม่ไม่ซ้ำกับรหัสเดิม
    if (passwordData.currentPassword === passwordData.newPassword) {
      setError("รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านปัจจุบัน");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/auth/user/${user.userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: passwordData.currentPassword, // ✅ ส่งรหัสเดิมไปตรวจสอบ
            password: passwordData.newPassword,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        setSuccess("เปลี่ยนรหัสผ่านสำเร็จ");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      setError("ไม่สามารถเชื่อมต่อ Server ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = () => {
    const settings = { notifications };
    localStorage.setItem("userSettings", JSON.stringify(settings));
    setSuccess("บันทึกการตั้งค่าสำเร็จ");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleLogout = () => {
    if (confirm("ต้องการออกจากระบบใช่หรือไม่?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userType");
      window.dispatchEvent(new Event("userStatusChanged"));
      router.push("/");
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "⚠️ คุณแน่ใจหรือไม่ที่จะลบบัญชี?\n\nการดำเนินการนี้ไม่สามารถยกเลิกได้!",
      )
    )
      return;
    if (!confirm("ยืนยันอีกครั้ง: ลบบัญชีถาวร?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/auth/user/${user.id || user.userId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await response.json();
      if (data.success) {
        alert("ลบบัญชีสำเร็จ");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userType");
        localStorage.removeItem("userSettings");
        window.dispatchEvent(new Event("userStatusChanged"));
        router.push("/");
      } else {
        alert(data.message || "ไม่สามารถลบบัญชีได้");
      }
    } catch (err) {
      alert("ไม่สามารถเชื่อมต่อ Server ได้");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-amber-600 hover:text-amber-700 flex items-center gap-2 mb-4"
          >
            ← กลับหน้าหลัก
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">⚙️ ตั้งค่า</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar Menu */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <nav className="space-y-2">
                <Link
                  href="/user/profile"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700"
                >
                  <span>👤</span> ข้อมูลส่วนตัว
                </Link>
                <Link
                  href="/user/orders"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700"
                >
                  <span>📋</span> รายการสั่งซื้อ
                </Link>
                <Link
                  href="/user/search-order"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700"
                >
                  <span>🔍</span> ค้นหาคำสั่งซื้อ
                </Link>
                <Link
                  href="/user/favorites"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700"
                >
                  <span>❤️</span> รายการโปรด
                </Link>
                <Link
                  href="/user/settings"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-100 text-amber-700 font-medium"
                >
                  <span>⚙️</span> ตั้งค่า
                </Link>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3 space-y-6">
            {/* Messages */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                ✅ {success}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                ⚠️ {error}
              </div>
            )}

            {/* Change Password */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                🔐 เปลี่ยนรหัสผ่าน
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    รหัสผ่านปัจจุบัน
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 pr-12"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          current: !showPasswords.current,
                        })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPasswords.current ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    รหัสผ่านใหม่
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 pr-12"
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          new: !showPasswords.new,
                        })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPasswords.new ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ยืนยันรหัสผ่านใหม่
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 pr-12"
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          confirm: !showPasswords.confirm,
                        })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPasswords.confirm ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  {loading ? "กำลังบันทึก..." : "💾 เปลี่ยนรหัสผ่าน"}
                </button>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                🔔 การแจ้งเตือน
              </h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-800">
                      อัพเดทคำสั่งซื้อ
                    </p>
                    <p className="text-sm text-gray-500">
                      รับแจ้งเตือนเมื่อสถานะคำสั่งซื้อเปลี่ยน
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.orderUpdates}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        orderUpdates: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-800">โปรโมชั่น</p>
                    <p className="text-sm text-gray-500">
                      รับข่าวสารโปรโมชั่นและส่วนลดพิเศษ
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.promotions}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        promotions: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-800">จดหมายข่าว</p>
                    <p className="text-sm text-gray-500">
                      รับข่าวสารและเมนูใหม่ทางอีเมล
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.newsletter}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        newsletter: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
                  />
                </label>

                <button
                  onClick={handleSaveNotifications}
                  className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                >
                  💾 บันทึกการตั้งค่า
                </button>
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                👤 บัญชี
              </h2>
              <div className="space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full px-6 py-3 border-2 border-amber-500 text-amber-600 rounded-lg hover:bg-amber-50 font-medium"
                >
                  🚪 ออกจากระบบ
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full px-6 py-3 border-2 border-red-300 text-red-500 rounded-lg hover:bg-red-50 font-medium"
                >
                  🗑️ ลบบัญชี
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
