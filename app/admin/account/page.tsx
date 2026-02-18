"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  const [activeTab, setActiveTab] = useState<
    "profile" | "password" | "settings"
  >("profile");

  const [profile, setProfile] = useState<AdminProfile>({
    id: 0,
    email: "",
    fullname: "",
    role: "",
    phone: "",
    address: "",
    createdAt: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
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
        router.push("/");
        return;
      }
      fetchProfile(user.email);
    } else {
      router.push("/login");
      return;
    }
  }, [router]);

  const fetchProfile = async (email: string) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/admin/profile/${email}`,
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
        `http://localhost:8080/api/admin/profile/${profile.email}`,
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
        // อัพเดท localStorage
        const userData = localStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          user.fullname = profile.fullname;
          localStorage.setItem("user", JSON.stringify(user));
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage("error", "รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showMessage("error", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `http://localhost:8080/api/admin/profile/${profile.email}/password`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        showMessage("success", "เปลี่ยนรหัสผ่านสำเร็จ");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        showMessage("error", data.message || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      showMessage("error", "ไม่สามารถเชื่อมต่อ server ได้");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    const confirmed = window.confirm("คุณต้องการออกจากระบบหรือไม่?");
    if (confirmed) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
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
    <div className="min-h-screen bg-amber-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <span className="text-4xl">⚙️</span>
            บัญชีของฉัน
          </h1>
          <p className="text-slate-600 mt-1">
            จัดการข้อมูลส่วนตัวและการตั้งค่า
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md p-4">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">
                  {profile.fullname?.charAt(0)?.toUpperCase() || "A"}
                </div>
                <h3 className="font-bold text-slate-800">
                  {profile.fullname || "Admin"}
                </h3>
                <p className="text-sm text-slate-500">{profile.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                  {profile.role || "Admin"}
                </span>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === "profile"
                      ? "bg-slate-700 text-white"
                      : "hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  <span>👤</span> ข้อมูลส่วนตัว
                </button>
                <button
                  onClick={() => setActiveTab("password")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === "password"
                      ? "bg-slate-700 text-white"
                      : "hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  <span>🔒</span> เปลี่ยนรหัสผ่าน
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === "settings"
                      ? "bg-slate-700 text-white"
                      : "hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  <span>⚙️</span> การตั้งค่า
                </button>
                <hr className="my-2" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
                >
                  <span>🚪</span> ออกจากระบบ
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-md p-6">
              {/* Messages */}
              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  ✅ {success}
                </div>
              )}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  ⚠️ {error}
                </div>
              )}

              {/* Profile Tab */}
              {activeTab === "profile" && (
                <form onSubmit={handleProfileSubmit}>
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
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
                        className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500"
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
                          setProfile({ ...profile, phone: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="0xx-xxx-xxxx"
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
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
                        className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center gap-2"
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

              {/* Password Tab */}
              {activeTab === "password" && (
                <form onSubmit={handlePasswordSubmit}>
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span>🔒</span> เปลี่ยนรหัสผ่าน
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        รหัสผ่านปัจจุบัน
                      </label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            currentPassword: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        รหัสผ่านใหม่
                      </label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            newPassword: e.target.value,
                          })
                        }
                        required
                        minLength={6}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        ยืนยันรหัสผ่านใหม่
                      </label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>{" "}
                          กำลังบันทึก...
                        </>
                      ) : (
                        <>
                          <span>🔐</span> เปลี่ยนรหัสผ่าน
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span>⚙️</span> การตั้งค่า
                  </h2>

                  <div className="space-y-4">
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
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                      >
                        <div>
                          <h4 className="font-medium text-slate-800">
                            {item.title}
                          </h4>
                          <p className="text-sm text-slate-500">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}