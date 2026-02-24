"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";

interface Admin {
  id: number;
  email: string;
  fullname: string;
  role: string;
  status: string;
}

export default function UserManagementPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "admin",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await fetch(
        "https://bakery-backend-production-6fc9.up.railway.app/api/admin/list",
      );
      const data = await response.json();
      setAdmins(data);
    } catch (err) {
      console.error("Error fetching admins:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const openAddModal = () => {
    setEditingAdmin(null);
    setFormData({
      fullname: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "admin",
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({
      fullname: admin.fullname || "",
      email: admin.email,
      password: "",
      confirmPassword: "",
      role: admin.role || "admin",
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.fullname || !formData.email) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (!formData.email.endsWith("@empbakery.com")) {
      setError("อีเมลต้องลงท้ายด้วย @empbakery.com");
      return;
    }
    if (!editingAdmin && !formData.password) {
      setError("กรุณากรอกรหัสผ่าน");
      return;
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    if (formData.password && formData.password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    try {
      let response;
      if (editingAdmin) {
        response = await fetch(
          `https://bakery-backend-production-6fc9.up.railway.app/api/admin/${editingAdmin.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullname: formData.fullname,
              role: formData.role,
              ...(formData.password && { password: formData.password }),
            }),
          },
        );
      } else {
        response = await fetch(
          "https://bakery-backend-production-6fc9.up.railway.app/api/admin/register",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullname: formData.fullname,
              email: formData.email,
              password: formData.password,
              role: formData.role,
            }),
          },
        );
      }

      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        fetchAdmins();
        await Swal.fire({
          title: "สำเร็จ!",
          text: editingAdmin ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่ม Admin สำเร็จ",
          icon: "success",
          confirmButtonColor: "#f97316",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        setError(data.message || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      setError("ไม่สามารถเชื่อมต่อ server ได้");
    }
  };

  const toggleStatus = async (admin: Admin) => {
    try {
      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/admin/${admin.id}/toggle-status`,
        { method: "PUT" },
      );
      const data = await response.json();
      if (data.success) {
        fetchAdmins();
        await Swal.fire({
          title: "สำเร็จ!",
          text: `เปลี่ยนสถานะเป็น ${data.status} สำเร็จ`,
          icon: "success",
          confirmButtonColor: "#f97316",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const deleteAdmin = async (admin: Admin) => {
    const result = await Swal.fire({
      title: "ลบ Admin?",
      text: `ต้องการลบ "${admin.fullname || admin.email}" ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/admin/${admin.id}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (data.success) {
        fetchAdmins();
        await Swal.fire({
          title: "ลบสำเร็จ!",
          icon: "success",
          confirmButtonColor: "#f97316",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error("Error deleting admin:", err);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case "super_admin":
        return "bg-purple-100 text-purple-800";
      case "admin":
        return "bg-blue-100 text-blue-800";
      case "staff":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role?.toLowerCase()) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "staff":
        return "Staff";
      default:
        return role || "Staff";
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black flex items-center gap-2">
              👥 User Management
            </h1>
            <p className="text-amber-600 mt-1">
              จัดการผู้ใช้งานระบบ Admin ({admins.length} คน)
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <span>+</span> เพิ่ม Admin ใหม่
          </button>
        </div>

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            ✅ {success}
          </div>
        )}

        <div className="mb-6">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="ค้นหาผู้ใช้..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-amber-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left">ชื่อ</th>
                <th className="px-6 py-4 text-left">อีเมล</th>
                <th className="px-6 py-4 text-center">บทบาท</th>
                <th className="px-6 py-4 text-center">สถานะ</th>
                <th className="px-6 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    กำลังโหลด...
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                          {admin.fullname?.charAt(0)?.toUpperCase() || "A"}
                        </div>
                        <span className="font-medium">
                          {admin.fullname || "ไม่ระบุชื่อ"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{admin.email}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadge(admin.role)}`}
                      >
                        {getRoleDisplayName(admin.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleStatus(admin)}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${admin.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                      >
                        {admin.status === "active" ? "✓ Active" : "✗ Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEditModal(admin)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="แก้ไข"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteAdmin(admin)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="ลบ"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-amber-500 text-white rounded-t-xl">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>+</span>
                {editingAdmin ? "แก้ไข Admin" : "เพิ่ม Admin ใหม่"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                  ⚠️ {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  value={formData.fullname}
                  onChange={(e) =>
                    setFormData({ ...formData, fullname: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ชื่อ นามสกุล"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  อีเมล *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="example@empbakery.com"
                  disabled={!!editingAdmin}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  * ต้องลงท้ายด้วย @empbakery.com
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รหัสผ่าน{" "}
                  {editingAdmin ? "(เว้นว่างถ้าไม่ต้องการเปลี่ยน)" : "*"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ยืนยันรหัสผ่าน
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  บทบาท *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="staff">Staff (พนักงาน)</option>
                  <option value="admin">Admin (ผู้ดูแล)</option>
                  <option value="super_admin">
                    Super Admin (ผู้ดูแลสูงสุด)
                  </option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                >
                  {editingAdmin ? "💾 บันทึก" : "+ เพิ่มผู้ใช้"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}