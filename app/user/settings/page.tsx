"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: false,
    newsletter: false,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
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
            currentPassword: passwordData.currentPassword,
            password: passwordData.newPassword,
          }),
        },
      );
      const data = await response.json();
      if (data.success) {
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        await Swal.fire({
          title: "เปลี่ยนรหัสผ่านสำเร็จ!",
          icon: "success",
          confirmButtonColor: "#f97316",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        setError(data.message || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      setError("ไม่สามารถเชื่อมต่อ Server ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    localStorage.setItem("userSettings", JSON.stringify({ notifications }));
    await Swal.fire({
      title: "บันทึกการตั้งค่าสำเร็จ!",
      icon: "success",
      confirmButtonColor: "#f97316",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "ออกจากระบบ?",
      text: "ต้องการออกจากระบบใช่หรือไม่?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userType");
    window.dispatchEvent(new Event("userStatusChanged"));

    await Swal.fire({
      title: "ออกจากระบบสำเร็จ!",
      icon: "success",
      confirmButtonColor: "#f97316",
      timer: 1500,
      showConfirmButton: false,
    });
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    // Step 1: confirm แรก
    const result1 = await Swal.fire({
      title: "ลบบัญชี?",
      text: "คุณแน่ใจหรือไม่ที่จะลบบัญชี? การดำเนินการนี้ไม่สามารถยกเลิกได้!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ใช่ ลบบัญชี",
      cancelButtonText: "ยกเลิก",
    });
    if (!result1.isConfirmed) return;

    // Step 2: confirm ยืนยันอีกครั้ง
    const result2 = await Swal.fire({
      title: "ยืนยันอีกครั้ง",
      text: "ลบบัญชีถาวร? ข้อมูลทั้งหมดจะหายไป",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ยืนยัน ลบถาวร",
      cancelButtonText: "ยกเลิก",
    });
    if (!result2.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/auth/user/${user.id || user.userId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await response.json();
      if (data.success) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userType");
        localStorage.removeItem("userSettings");
        window.dispatchEvent(new Event("userStatusChanged"));

        await Swal.fire({
          title: "ลบบัญชีสำเร็จ",
          icon: "success",
          confirmButtonColor: "#f97316",
          timer: 2000,
          showConfirmButton: false,
        });
        router.push("/");
      } else {
        await Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: data.message || "ไม่สามารถลบบัญชีได้",
          icon: "error",
          confirmButtonColor: "#f97316",
        });
      }
    } catch (err) {
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเชื่อมต่อ Server ได้",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
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
        <div className="mb-8">
          <Link
            href="/"
            className="text-amber-600 hover:text-amber-700 flex items-center gap-2 mb-4"
          >
            ← กลับหน้าหลัก
          </Link>
          <h1 className="text-3xl font-bold text-amber-800">⚙️ ตั้งค่า</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
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

          {/* Main */}
          <div className="md:col-span-3 space-y-6">
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
                {[
                  {
                    label: "รหัสผ่านปัจจุบัน",
                    key: "currentPassword",
                    showKey: "current",
                    placeholder: "••••••••",
                  },
                  {
                    label: "รหัสผ่านใหม่",
                    key: "newPassword",
                    showKey: "new",
                    placeholder: "อย่างน้อย 6 ตัวอักษร",
                  },
                  {
                    label: "ยืนยันรหัสผ่านใหม่",
                    key: "confirmPassword",
                    showKey: "confirm",
                    placeholder: "กรอกรหัสผ่านใหม่อีกครั้ง",
                  },
                ].map(({ label, key, showKey, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label}
                    </label>
                    <div className="relative">
                      <input
                        type={
                          showPasswords[showKey as keyof typeof showPasswords]
                            ? "text"
                            : "password"
                        }
                        value={passwordData[key as keyof typeof passwordData]}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            [key]: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 pr-12"
                        placeholder={placeholder}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            [showKey]:
                              !showPasswords[
                                showKey as keyof typeof showPasswords
                              ],
                          })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      >
                        {showPasswords[showKey as keyof typeof showPasswords]
                          ? "👁️"
                          : "👁️‍🗨️"}
                      </button>
                    </div>
                  </div>
                ))}
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
                {[
                  {
                    key: "orderUpdates",
                    label: "อัพเดทคำสั่งซื้อ",
                    desc: "รับแจ้งเตือนเมื่อสถานะคำสั่งซื้อเปลี่ยน",
                  },
                  {
                    key: "promotions",
                    label: "โปรโมชั่น",
                    desc: "รับข่าวสารโปรโมชั่นและส่วนลดพิเศษ",
                  },
                  {
                    key: "newsletter",
                    label: "จดหมายข่าว",
                    desc: "รับข่าวสารและเมนูใหม่ทางอีเมล",
                  },
                ].map(({ key, label, desc }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{label}</p>
                      <p className="text-sm text-gray-500">{desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications[key as keyof typeof notifications]}
                      onChange={(e) =>
                        setNotifications({
                          ...notifications,
                          [key]: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
                    />
                  </label>
                ))}
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