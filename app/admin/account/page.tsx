"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import Swal from "sweetalert2";

interface AdminProfile {
  id: number;
  email: string;
  fullname: string;
  role: string;
  phone: string;
  address: string;
  createdAt: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "settings">("profile");

  const [profile, setProfile] = useState<AdminProfile>({
    id: 0,
    email: "",
    fullname: "",
    role: "",
    phone: "",
    address: "",
    createdAt: "",
  });

  const [settings, setSettings] = useState({
    emailNotifications: true,
    orderAlerts: true,
    lowStockAlerts: true,
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      if (!user.email?.endsWith("@empbakery.com")) {
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        router.replace("/");
        return;
      }
      fetchProfile(user.email);
    } else {
      router.replace("/login");
      return;
    }
  }, [router]);

  const fetchProfile = async (email: string) => {
    try {
      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/admin/profile/${email}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProfile({
            id: data.profile.id,
            email: data.profile.email,
            fullname: data.profile.fullname || "",
            role: data.profile.role || "Admin",
            phone: data.profile.phone || "",
            address: data.profile.address || "",
            createdAt: data.profile.createdAt
              ? new Date(data.profile.createdAt).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "-",
          });
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: "success" | "error", msg: string) => {
    if (type === "success") {
      setSuccess(msg);
      setError("");
    } else {
      setError(msg);
      setSuccess("");
    }
    setTimeout(() => {
      setSuccess("");
      setError("");
    }, 3000);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/admin/profile/${profile.email}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullname: profile.fullname,
            phone: profile.phone,
            address: profile.address,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        const userData = localStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          user.fullname = profile.fullname;
          localStorage.setItem("user", JSON.stringify(user));
          window.dispatchEvent(new Event("userStatusChanged"));
        }
        showMessage("success", "บันทึกข้อมูลสำเร็จ");
      } else {
        showMessage("error", data.message || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      showMessage("error", "ไม่สามารถเชื่อมต่อ server ได้");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "ออกจากระบบ?",
      text: "คุณต้องการออกจากระบบหรือไม่?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      await Swal.fire({
        title: "ออกจากระบบสำเร็จ!",
        text: "ขอบคุณที่ใช้บริการ 👋",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      window.location.href = "/login";
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-amber-800 flex items-center gap-3">
            <span className="text-3xl md:text-4xl">⚙️</span>
            My Account
          </h1>
          <p className="text-amber-600 mt-1 text-sm md:text-base">
            จัดการข้อมูลส่วนตัวและการตั้งค่า
          </p>
        </div>

        {/* ✅ Grid — ใช้ md:grid-cols-4 แทน lg:grid-cols-4 เพื่อรองรับ iPad */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-md p-4">
              <div className="text-center mb-4 md:mb-6">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-200 rounded-full flex items-center justify-center text-2xl md:text-3xl mx-auto mb-3">
                  {profile.fullname?.charAt(0)?.toUpperCase() || "A"}
                </div>
                <h3 className="font-bold text-slate-800 text-sm md:text-base">
                  {profile.fullname || "Admin"}
                </h3>
                <p className="text-xs md:text-sm text-slate-500 break-all">
                  {profile.email}
                </p>
                <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                  {profile.role || "Admin"}
                </span>
              </div>

              {/* ✅ Nav — แสดงแนวนอนบน mobile, แนวตั้งบน tablet+ */}
              <nav className="flex md:flex-col gap-2">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all text-sm ${activeTab === "profile" ? "bg-slate-700 text-white" : "hover:bg-slate-100 text-slate-600"}`}
                >
                  <span>👤</span>{" "}
                  <span className="hidden sm:inline">ข้อมูลส่วนตัว</span>
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all text-sm ${activeTab === "settings" ? "bg-slate-700 text-white" : "hover:bg-slate-100 text-slate-600"}`}
                >
                  <span>⚙️</span>{" "}
                  <span className="hidden sm:inline">การตั้งค่า</span>
                </button>
                <div className="hidden md:block">
                  <hr className="my-2" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all text-sm"
                  >
                    <span>🚪</span> ออกจากระบบ
                  </button>
                </div>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-2xl shadow-md p-4 md:p-6">
              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  ✅ {success}
                </div>
              )}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  ⚠️ {error}
                </div>
              )}

              {/* Profile Tab */}
              {activeTab === "profile" && (
                <form onSubmit={handleProfileSubmit}>
                  <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-4 md:mb-6 flex items-center gap-2">
                    <span>👤</span> ข้อมูลส่วนตัว
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        ชื่อ-นามสกุล
                      </label>
                      <input
                        type="text"
                        value={profile.fullname}
                        onChange={(e) =>
                          setProfile({ ...profile, fullname: e.target.value })
                        }
                        className="w-full px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm md:text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        อีเมล
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full px-4 py-2.5 md:py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm md:text-base"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        ไม่สามารถเปลี่ยนอีเมลได้
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        เบอร์โทรศัพท์
                      </label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            phone: e.target.value.replace(/[^0-9]/g, ""),
                          })
                        }
                        className="w-full px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm md:text-base"
                        placeholder="0xx-xxx-xxxx"
                        inputMode="numeric"
                        maxLength={10}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        ที่อยู่
                      </label>
                      <textarea
                        value={profile.address}
                        onChange={(e) =>
                          setProfile({ ...profile, address: e.target.value })
                        }
                        rows={3}
                        className="w-full px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm md:text-base"
                        placeholder="บ้านเลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        วันที่สร้างบัญชี
                      </label>
                      <input
                        type="text"
                        value={profile.createdAt}
                        disabled
                        className="w-full px-4 py-2.5 md:py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm md:text-base"
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 md:px-6 py-2.5 md:py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center gap-2 text-sm md:text-base"
                    >
                      {saving ? (
                        <>
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>{" "}
                          กำลังบันทึก...
                        </>
                      ) : (
                        <>
                          <span>💾</span> บันทึกข้อมูล
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-4 md:mb-6 flex items-center gap-2">
                    <span>⚙️</span> การตั้งค่า
                  </h2>
                  <div className="space-y-3 md:space-y-4">
                    {[
                      {
                        key: "emailNotifications",
                        title: "แจ้งเตือนทางอีเมล",
                        desc: "รับข่าวสารและการแจ้งเตือนทางอีเมล",
                      },
                      {
                        key: "orderAlerts",
                        title: "แจ้งเตือนคำสั่งซื้อใหม่",
                        desc: "รับการแจ้งเตือนเมื่อมีคำสั่งซื้อใหม่",
                      },
                      {
                        key: "lowStockAlerts",
                        title: "แจ้งเตือนสินค้าใกล้หมด",
                        desc: "รับการแจ้งเตือนเมื่อสินค้า stock ต่ำ",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-3 md:p-4 bg-slate-50 rounded-xl"
                      >
                        <div>
                          <h4 className="font-medium text-slate-800 text-sm md:text-base">
                            {item.title}
                          </h4>
                          <p className="text-xs md:text-sm text-slate-500">
                            {item.desc}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                          <input
                            type="checkbox"
                            checked={
                              settings[item.key as keyof typeof settings]
                            }
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                [item.key]: e.target.checked,
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-slate-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-700"></div>
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* ✅ Logout button สำหรับ mobile (ที่ซ่อนในเมนู sidebar) */}
                  <div className="mt-6 md:hidden">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-all font-medium"
                    >
                      <span>🚪</span> ออกจากระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}