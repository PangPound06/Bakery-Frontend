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
  const [saving, setSaving] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const PAGE_SIZE = 10;

  // โหลดจำนวนต่อบทบาทครั้งแรก
  useEffect(() => {
    fetchRoleCounts();
  }, []);

  // ค้นหาแบบ debounce → รีเซ็ตไปหน้าแรก
  useEffect(() => {
    const tmr = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(tmr);
  }, [searchTerm]);

  // ดึงข้อมูลเมื่อ หน้า/บทบาท/คำค้น เปลี่ยน
  useEffect(() => {
    fetchAdmins(page, selectedRole, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedRole, debouncedSearch]);

  // ✅ ดึงทีละหน้า + กรองบทบาท/ค้นหาที่ server (ไม่ดึง admin ทั้งหมด)
  const fetchAdmins = async (
    pageArg = page,
    roleArg = selectedRole,
    searchArg = debouncedSearch,
  ) => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.set("page", String(pageArg));
      params.set("size", String(PAGE_SIZE));
      if (roleArg && roleArg !== "all") params.set("role", roleArg);
      if (searchArg.trim()) params.set("search", searchArg.trim());
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/page?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await response.json();
      setAdmins(Array.isArray(data.content) ? data.content : []);
      setTotalPages(data.totalPages ?? 1);
      setTotalElements(data.totalElements ?? 0);
    } catch (err) {
      console.error("Error fetching admins:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ จำนวนต่อบทบาท + ทั้งหมด (สำหรับ badge บนแท็บ)
  const fetchRoleCounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/role-counts`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setRoleCounts(data.counts || {});
        setTotalAll(data.total || 0);
      }
    } catch (err) {
      console.error("Error fetching role counts:", err);
    }
  };

  const ROLE_ORDER = [
    "owner",
    "admin",
    "manager",
    "waiter",
    "bartender",
    "cashier",
    "chef",
    "commis_chef",
    "steward",
  ];
  // ✅ แท็บจาก roleCounts ของ server (เรียงตามกลุ่ม แล้วต่อด้วยบทบาทอื่น ๆ ที่มี)
  const roleTabs = [
    ...ROLE_ORDER.filter((r) => roleCounts[r]),
    ...Object.keys(roleCounts).filter((r) => !ROLE_ORDER.includes(r)),
  ];

  // ✅ server กรอง/แบ่งหน้ามาให้แล้ว ใช้ผลลัพธ์ตรง ๆ
  const filteredAdmins = admins;

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
    const token = localStorage.getItem("token");

    if (!formData.fullname.trim()) {
      setError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }

    if (!editingAdmin) {
      if (!formData.email.trim()) {
        setError("กรุณากรอกอีเมล");
        return;
      }
      if (!formData.email.endsWith("@empbakery.com")) {
        setError("อีเมลต้องลงท้ายด้วย @empbakery.com");
        return;
      }
      if (!formData.password) {
        setError("กรุณากรอกรหัสผ่าน");
        return;
      }
      if (formData.password.length < 6) {
        setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("รหัสผ่านไม่ตรงกัน");
        return;
      }
    } else {
      if (formData.password) {
        if (formData.password.length < 6) {
          setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError("รหัสผ่านไม่ตรงกัน");
          return;
        }
      }
    }

    setSaving(true);
    try {
      let response;
      if (editingAdmin) {
        const body: { fullname: string; role: string; password?: string } = {
          fullname: formData.fullname.trim(),
          role: formData.role,
        };
        if (formData.password) body.password = formData.password;
        response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${editingAdmin.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          },
        );
      } else {
        response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/admin/register`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              fullname: formData.fullname.trim(),
              email: formData.email.trim(),
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
        fetchRoleCounts();
        await Swal.fire({
          title: "สำเร็จ!",
          text: editingAdmin ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่ม Admin สำเร็จ",
          icon: "success",
          confirmButtonColor: "#a84a0e",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        setError(data.message || "เกิดข้อผิดพลาด");
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อ server ได้");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (admin: Admin) => {
    const token = localStorage.getItem("token");
    const newStatus = admin.status === "active" ? "Inactive" : "Active";
    const result = await Swal.fire({
      title: `เปลี่ยนสถานะเป็น ${newStatus}?`,
      text: `ต้องการเปลี่ยนสถานะของ "${admin.fullname || admin.email}" หรือไม่?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#a84a0e",
      cancelButtonColor: "#6b5e52",
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${admin.id}/toggle-status`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (data.success) {
        fetchAdmins();
        await Swal.fire({
          title: "สำเร็จ!",
          text: `เปลี่ยนสถานะเป็น ${data.status} สำเร็จ`,
          icon: "success",
          confirmButtonColor: "#a84a0e",
          timer: 1000,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const deleteAdmin = async (admin: Admin) => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");
    const isDeletingSelf = currentUser.email === admin.email;

    if (admin.role?.toLowerCase() === "owner") {
      await Swal.fire({
        title: "ไม่สามารถลบได้",
        text: "ไม่สามารถลบบัญชี Owner ได้",
        icon: "warning",
        confirmButtonColor: "#a84a0e",
      });
      return;
    }

    const result = await Swal.fire({
      title: isDeletingSelf ? "ลบบัญชีของคุณ?" : "ลบ Admin?",
      text: isDeletingSelf
        ? "คุณกำลังลบบัญชีของตัวเอง จะถูกออกจากระบบทันที"
        : `ต้องการลบ "${admin.fullname || admin.email}" ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#b3261e",
      cancelButtonColor: "#6b5e52",
      confirmButtonText: isDeletingSelf ? "ลบบัญชีและออกจากระบบ" : "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${admin.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (data.success) {
        if (isDeletingSelf) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("userType");
          await Swal.fire({
            title: "ลบบัญชีสำเร็จ!",
            text: "กำลังออกจากระบบ...",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
          window.location.href = "/login";
        } else {
          fetchAdmins();
          fetchRoleCounts();
          await Swal.fire({
            title: "ลบสำเร็จ!",
            icon: "success",
            confirmButtonColor: "#a84a0e",
            timer: 1500,
            showConfirmButton: false,
          });
        }
      }
    } catch (err) {
      console.error("Error deleting admin:", err);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case "owner":
        return "bg-warn-soft text-ink border border-line-strong";
      case "admin":
        return "bg-new-soft text-new-ink";
      case "manager":
        return "bg-new-soft text-new-ink";
      case "waiter":
        return "bg-success-soft text-success-ink";
      case "bartender":
        return "bg-new-soft text-new-ink";
      case "cashier":
        return "bg-success-soft text-success-ink";
      case "chef":
        return "bg-danger-soft text-danger";
      case "commis_chef":
        return "bg-warn-soft text-ink";
      case "steward":
        return "bg-success-soft text-success-ink";
      default:
        return "bg-sand text-body";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role?.toLowerCase()) {
      case "owner":
        return "👑 Owner";
      case "admin":
        return "🧑🏼‍💻 Admin";
      case "manager":
        return "🏪 Manager";
      case "waiter":
        return "🍽️ Waiter";
      case "bartender":
        return "🍹 Bartender";
      case "cashier":
        return "💰 Cashier";
      case "chef":
        return "👨‍🍳 Chef";
      case "commis_chef":
        return "🔪 Commis Chef";
      case "steward":
        return "🧹 Steward";
      default:
        return role || "Staff";
    }
  };

  // ✅ ตรวจว่าปุ่มลบควรแสดงหรือไม่ — Owner ลบไม่ได้เลย ไม่ว่าใครจะกด
  const canDelete = (admin: Admin) => {
    if (admin.role?.toLowerCase() === "owner") return false;
    return true;
  };

  if (loading)
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full animate-spin"
            style={{
              borderWidth: 3,
              borderStyle: "solid",
              borderColor: "#a84a0e transparent transparent transparent",
            }}
          ></div>
          <p className="text-body text-sm font-medium">
            กำลังโหลดข้อมูล...
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-warn-bg p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-ink flex items-center gap-2">
              👥 User Management
            </h1>
            <p className="text-brick mt-1 text-sm md:text-base">
              จัดการผู้ใช้งานระบบ Admin ({totalAll} คน)
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-brick hover:bg-brick-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm md:text-base shrink-0"
          >
            <span>+</span> เพิ่ม Admin ใหม่
          </button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              🔍
            </span>
            <input
              type="text"
              placeholder="ค้นหาผู้ใช้..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 md:py-3 border border-line-strong rounded-lg focus:ring-2 focus:ring-ink focus:border-new-ink text-sm md:text-base"
            />
          </div>
        </div>

        {/* ✅ แท็บกรองตามบทบาท — แยกดูทีละบทบาทเวลามีพนักงานเยอะ */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedRole("all");
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedRole === "all" ? "bg-brick text-white" : "bg-white text-body border border-line hover:border-line-strong"}`}
          >
            ทั้งหมด ({totalAll})
          </button>
          {roleTabs.map((r) => (
            <button
              key={r}
              onClick={() => {
                setSelectedRole(r);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedRole === r ? "bg-brick text-white" : "bg-white text-body border border-line hover:border-line-strong"}`}
            >
              {getRoleDisplayName(r)} ({roleCounts[r]})
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-brick text-white">
                <tr>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm">
                    ชื่อ
                  </th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm hidden md:table-cell">
                    อีเมล
                  </th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-center text-xs md:text-sm">
                    บทบาท
                  </th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-center text-xs md:text-sm">
                    สถานะ
                  </th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-center text-xs md:text-sm">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-muted"
                    >
                      กำลังโหลด...
                    </td>
                  </tr>
                ) : filteredAdmins.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-muted"
                    >
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="border-b hover:bg-sand">
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-new-soft rounded-full flex items-center justify-center text-new-ink font-semibold text-sm md:text-base">
                            {admin.fullname?.charAt(0)?.toUpperCase() || "A"}
                          </div>
                          <div>
                            <span className="font-medium text-sm md:text-base block">
                              {admin.fullname || "ไม่ระบุชื่อ"}
                            </span>
                            <span className="text-xs text-muted md:hidden block">
                              {admin.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-ink text-sm hidden md:table-cell">
                        {admin.email}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                        <span
                          className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(admin.role)}`}
                        >
                          {getRoleDisplayName(admin.role)}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                        <button
                          onClick={() => toggleStatus(admin)}
                          className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${admin.status === "active" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}
                        >
                          {admin.status === "active"
                            ? "✓ Active"
                            : "✗ Inactive"}
                        </button>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <div className="flex justify-center gap-1 md:gap-2">
                          <button
                            onClick={() => openEditModal(admin)}
                            className="p-1.5 md:p-2 text-new-ink hover:bg-new-soft rounded-lg transition-colors"
                            title="แก้ไข"
                          >
                            ✏️
                          </button>
                          {/* ✅ ซ่อนปุ่มลบถ้าเป็น Owner ลบตัวเอง */}
                          {canDelete(admin) ? (
                            <button
                              onClick={() => deleteAdmin(admin)}
                              className="p-1.5 md:p-2 text-error hover:bg-danger-soft rounded-lg transition-colors"
                              title="ลบ"
                            >
                              🗑️
                            </button>
                          ) : (
                            <button
                              disabled
                              className="p-1.5 md:p-2 text-faint rounded-lg cursor-not-allowed"
                              title="Owner ไม่สามารถลบตัวเองได้"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ✅ แบ่งหน้า (server-side) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-body">
              ทั้งหมด {totalElements} รายการ · หน้า {page + 1}/{totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page <= 0}
                className="px-3 py-1.5 rounded-lg border border-line bg-white text-body disabled:opacity-40 disabled:cursor-not-allowed hover:border-line-strong transition-colors"
              >
                ← ก่อนหน้า
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg border border-line bg-white text-body disabled:opacity-40 disabled:cursor-not-allowed hover:border-line-strong transition-colors"
              >
                ถัดไป →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setRoleDropdownOpen(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4 border-b bg-brick text-white rounded-t-xl">
              <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
                {editingAdmin ? "✏️ แก้ไข Admin" : "➕ เพิ่ม Admin ใหม่"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-line-strong text-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
              {error && (
                <div className="bg-danger-soft border border-danger-line text-error px-4 py-2 rounded-lg text-sm">
                  ⚠️ {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  value={formData.fullname}
                  onChange={(e) =>
                    setFormData({ ...formData, fullname: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-brick focus:outline-none text-sm md:text-base"
                  placeholder="ชื่อ นามสกุล"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  อีเมล *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={`w-full px-4 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-brick focus:outline-none text-sm md:text-base ${editingAdmin ? "bg-sand text-muted" : ""}`}
                  placeholder="example@empbakery.com"
                  disabled={!!editingAdmin}
                />
                {!editingAdmin && (
                  <p className="text-xs text-muted mt-1">
                    * ต้องลงท้ายด้วย @empbakery.com
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  รหัสผ่าน{" "}
                  {editingAdmin ? "(เว้นว่างถ้าไม่ต้องการเปลี่ยน)" : "*"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  disabled={
                    !!editingAdmin &&
                    editingAdmin.email !==
                      JSON.parse(localStorage.getItem("user") || "{}").email
                  }
                  className={`w-full px-4 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-brick focus:outline-none text-sm md:text-base ${!!editingAdmin && editingAdmin.email !== JSON.parse(localStorage.getItem("user") || "{}").email ? "bg-sand cursor-not-allowed" : ""}`}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-body mb-1">
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
                  disabled={
                    !!editingAdmin &&
                    editingAdmin.email !==
                      JSON.parse(localStorage.getItem("user") || "{}").email
                  }
                  className={`w-full px-4 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-brick focus:outline-none text-sm md:text-base ${!!editingAdmin && editingAdmin.email !== JSON.parse(localStorage.getItem("user") || "{}").email ? "bg-sand cursor-not-allowed" : ""}`}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  บทบาท *
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoleDropdownOpen(!roleDropdownOpen);
                    }}
                    className="w-full px-4 py-2.5 border border-line-strong rounded-xl text-sm text-left flex items-center justify-between bg-white hover:border-line-strong transition-colors focus:ring-2 focus:ring-brick focus:outline-none"
                  >
                    <span>{getRoleDisplayName(formData.role)}</span>
                    <span
                      className={`transition-transform duration-200 ${roleDropdownOpen ? "rotate-180" : ""}`}
                    >
                      ▾
                    </span>
                  </button>
                  {roleDropdownOpen && (
                    <div className="absolute z-50 w-full bottom-full mb-1 bg-white border border-line rounded-2xl shadow-xl overflow-y-auto max-h-72">
                      {[
                        {
                          label: "⚙️ ระบบ",
                          options: [
                            { value: "owner", label: "👑 Owner (เจ้าของ)" },
                            { value: "admin", label: "Admin (ผู้ดูแล)" },
                          ],
                        },
                        {
                          label: "🏪 ฝ่ายหน้าร้าน (Service Team)",
                          options: [
                            {
                              value: "manager",
                              label: "ผู้จัดการร้าน (Manager)",
                            },
                            {
                              value: "waiter",
                              label: "พนักงานเสิร์ฟ (Waiter)",
                            },
                            {
                              value: "bartender",
                              label: "พนักงานผสมเครื่องดื่ม (Bartender)",
                            },
                            {
                              value: "cashier",
                              label: "พนักงานแคชเชียร์ (Cashier)",
                            },
                          ],
                        },
                        {
                          label: "🍳 ฝ่ายหลังร้าน (Kitchen Team)",
                          options: [
                            { value: "chef", label: "เชฟ (Chef)" },
                            {
                              value: "commis_chef",
                              label: "ผู้ช่วยกุ๊ก (Commis Chef)",
                            },
                            {
                              value: "steward",
                              label: "พนักงานทำความสะอาด (Steward)",
                            },
                          ],
                        },
                      ].map((group) => (
                        <div key={group.label}>
                          <p className="px-4 py-2 text-xs font-semibold text-muted bg-sand border-b border-line">
                            {group.label}
                          </p>
                          {group.options.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, role: opt.value });
                                setRoleDropdownOpen(false);
                              }}
                              className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${
                                formData.role === opt.value
                                  ? "bg-warn-soft text-ink font-medium"
                                  : "text-body hover:bg-warn-bg hover:text-body"
                              }`}
                            >
                              {formData.role === opt.value ? "✓ " : "　"}
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-line-strong text-body rounded-lg hover:bg-sand text-sm md:text-base"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-brick text-white rounded-lg hover:bg-brick-hover disabled:opacity-50 text-sm md:text-base"
                >
                  {saving
                    ? "กำลังบันทึก..."
                    : editingAdmin
                      ? "💾 บันทึก"
                      : "➕ เพิ่มผู้ใช้"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}