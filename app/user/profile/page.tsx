"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Profile {
  id: number;
  userId: number;
  fullname: string;
  email: string;
  phone: string;
  address: string;
  profileImage: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    fullname: "",
    phone: "",
    address: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);
    fetchProfile(userData.id || userData.userId);
  }, [router]);

  const fetchProfile = async (userId: number) => {
    try {
      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/profile/${userId}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          setProfile(data.profile);
          setFormData({
            fullname: data.profile.fullname || "",
            phone: data.profile.phone || "",
            address: data.profile.address || "",
          });
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const userId = user.id || user.userId;
      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/profile/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      const data = await response.json();
      if (data.success) {
        setProfile(data.profile);

        // อัพเดท localStorage
        const updatedUser = { ...user, fullname: formData.fullname };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.dispatchEvent(new Event("userStatusChanged"));

        setIsEditing(false);
        setSuccess("บันทึกข้อมูลสำเร็จ");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      setError("ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setSaving(false);
    }
  };

  // ฟังก์ชันอัปโหลด
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const userId = user.id || user.userId;
      const res = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/profile/${userId}/image`,
        { method: "POST", body: formData },
      );
      const data = await res.json();
      if (data.success) {
        setProfile((prev) =>
          prev ? { ...prev, profileImage: data.url } : prev,
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-800">👤 ข้อมูลส่วนตัว</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <nav className="space-y-2">
                <Link
                  href="/user/profile"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-100 text-amber-700 font-medium"
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
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700"
                >
                  <span>⚙️</span> ตั้งค่า
                </Link>
              </nav>
            </div>
          </div>

          {/* Main */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg p-6">
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

              {/* Profile Header */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                {/* Avatar + ปุ่มอัปโหลด */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                    {profile?.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      formData.fullname?.charAt(0)?.toUpperCase() || "U"
                    )}
                  </div>
                  {/* ปุ่มอัปโหลดรูป */}
                  <label className="absolute bottom-0 right-0 w-7 h-7 bg-amber-500 hover:bg-amber-600 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-colors">
                    <span className="text-white text-xs">📷</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  {/* Loading overlay */}
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {formData.fullname || "ผู้ใช้"}
                  </h2>
                  <p className="text-gray-500">
                    {profile?.email || user?.email}
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (isEditing) {
                      setFormData({
                        fullname: profile?.fullname || "",
                        phone: profile?.phone || "",
                        address: profile?.address || "",
                      });
                    }
                    setIsEditing(!isEditing);
                  }}
                  className="ml-auto px-4 py-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  {isEditing ? "ยกเลิก" : "✏️ แก้ไข"}
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    type="text"
                    value={formData.fullname}
                    onChange={(e) =>
                      setFormData({ ...formData, fullname: e.target.value })
                    }
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                      isEditing
                        ? "border-amber-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    อีเมล
                  </label>
                  <input
                    type="email"
                    value={profile?.email || user?.email || ""}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-lg text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    ไม่สามารถเปลี่ยนอีเมลได้
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="0812345678"
                    className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                      isEditing
                        ? "border-amber-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ที่อยู่
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    disabled={!isEditing}
                    rows={3}
                    placeholder="บ้านเลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                    className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                      isEditing
                        ? "border-amber-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  />
                </div>

                {isEditing && (
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          fullname: profile?.fullname || "",
                          phone: profile?.phone || "",
                          address: profile?.address || "",
                        });
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
                    >
                      {saving ? "กำลังบันทึก..." : "💾 บันทึกข้อมูล"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
