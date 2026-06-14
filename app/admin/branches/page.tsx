"use client";

import { useEffect, useState, useCallback } from "react";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";

interface Branch {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  hours?: string;
  active: boolean;
  sortOrder: number;
}

interface FormState {
  id: number | null;
  name: string;
  latitude: string;
  longitude: string;
  address: string;
  phone: string;
  hours: string;
  active: boolean;
  sortOrder: number;
}

const EMPTY: FormState = {
  id: null,
  name: "",
  latitude: "",
  longitude: "",
  address: "",
  phone: "",
  hours: "",
  active: true,
  sortOrder: 0,
};

const API = process.env.NEXT_PUBLIC_API_URL;

const BranchLocationPicker = dynamic(
  () => import("@/components/ui/BranchLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-amber-50 text-amber-700 text-sm">
        กำลังโหลดแผนที่...
      </div>
    ),
  },
);

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/store/branches/all`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      setBranches(data.branches || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const editBranch = (b: Branch) => {
    setForm({
      id: b.id,
      name: b.name,
      latitude: String(b.latitude),
      longitude: String(b.longitude),
      address: b.address || "",
      phone: b.phone || "",
      hours: b.hours || "",
      active: b.active,
      sortOrder: b.sortOrder,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // คลิก/ลากหมุดบนแผนที่ → เติมพิกัดอัตโนมัติ
  const handlePick = (lat: number, lng: number) => {
    setForm((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      Swal.fire({ icon: "warning", title: "กรุณากรอกชื่อสาขา" });
      return;
    }
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      Swal.fire({ icon: "warning", title: "กรุณากรอกพิกัดให้ถูกต้อง" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        latitude: lat,
        longitude: lng,
        address: form.address.trim(),
        phone: form.phone.trim(),
        hours: form.hours.trim(),
        active: form.active,
        sortOrder: form.sortOrder,
      };
      const url = form.id
        ? `${API}/api/store/branches/${form.id}`
        : `${API}/api/store/branches`;
      const res = await fetch(url, {
        method: form.id ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        Swal.fire({
          icon: "error",
          title: "ไม่สำเร็จ",
          text: data.message || data.error || "เกิดข้อผิดพลาด",
        });
        return;
      }
      Swal.fire({
        icon: "success",
        title: form.id ? "อัปเดตสาขาแล้ว" : "เพิ่มสาขาแล้ว",
        timer: 1200,
        showConfirmButton: false,
      });
      setForm(EMPTY);
      load();
    } catch {
      Swal.fire({ icon: "error", title: "เชื่อมต่อไม่สำเร็จ" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: Branch) => {
    const c = await Swal.fire({
      title: `ลบสาขา "${b.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!c.isConfirmed) return;
    try {
      const res = await fetch(`${API}/api/store/branches/${b.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ" });
        return;
      }
      Swal.fire({
        icon: "success",
        title: "ลบแล้ว",
        timer: 1000,
        showConfirmButton: false,
      });
      if (form.id === b.id) setForm(EMPTY);
      load();
    } catch {
      Swal.fire({ icon: "error", title: "เชื่อมต่อไม่สำเร็จ" });
    }
  };

  const input =
    "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400";

  return (
    <div className="min-h-screen bg-[#faf7f2] p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-amber-800 flex items-center gap-3">
          Manage Branches
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          เพิ่ม/แก้ไข/ลบสาขา — สาขาที่ "เปิดใช้งาน" จะแสดงบนหน้าที่ตั้งร้านของลูกค้า
        </p>

        {/* ฟอร์มเพิ่ม/แก้ไข */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100 mb-6">
          <h2 className="font-bold text-amber-900 mb-4">
            {form.id ? "แก้ไขสาขา" : "เพิ่มสาขาใหม่"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">ชื่อสาขา *</label>
              <input
                className={input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น สาขาสีลม"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">
                ตำแหน่งบนแผนที่ — คลิก/ลากหมุดเพื่อปักตำแหน่งสาขา *
              </label>
              <div className="h-[300px] rounded-lg overflow-hidden border border-gray-200">
                <BranchLocationPicker
                  key={form.id ?? "new"}
                  lat={form.latitude ? parseFloat(form.latitude) : null}
                  lng={form.longitude ? parseFloat(form.longitude) : null}
                  onChange={handlePick}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Latitude *
              </label>
              <input
                readOnly
                className={`${input} bg-gray-50`}
                value={form.latitude}
                placeholder="คลิกบนแผนที่"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Longitude *
              </label>
              <input
                readOnly
                className={`${input} bg-gray-50`}
                value={form.longitude}
                placeholder="คลิกบนแผนที่"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">ที่อยู่</label>
              <input
                className={input}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="123 ถนน... กรุงเทพฯ"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">เบอร์โทร</label>
              <input
                className={input}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="02-123-4567"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                เวลาเปิด-ปิด
              </label>
              <input
                className={input}
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                placeholder="ทุกวัน 08:00 - 20:00 น."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                ลำดับการแสดง
              </label>
              <input
                type="number"
                className={input}
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                id="active"
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 accent-amber-500"
              />
              <label htmlFor="active" className="text-sm text-gray-700">
                เปิดใช้งาน (แสดงบนหน้าลูกค้า)
              </label>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            คลิกตำแหน่งร้านบนแผนที่ ระบบจะกรอกพิกัดให้อัตโนมัติ (ลากหมุดเพื่อปรับละเอียดได้)
          </p>

          <div className="flex gap-2 mt-4">
            <button
              onClick={save}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : form.id ? "บันทึกการแก้ไข" : "เพิ่มสาขา"}
            </button>
            {form.id && (
              <button
                onClick={() => setForm(EMPTY)}
                className="px-5 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </div>

        {/* รายการสาขา */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 font-bold text-amber-900">
            สาขาทั้งหมด ({branches.length})
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-400">กำลังโหลด...</div>
          ) : branches.length === 0 ? (
            <div className="p-6 text-center text-gray-400">ยังไม่มีสาขา</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className="px-5 py-4 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">
                        {b.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          b.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {b.active ? "เปิดใช้งาน" : "ปิด"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {b.address || "—"} · {b.latitude}, {b.longitude}
                    </p>
                  </div>
                  <button
                    onClick={() => editBranch(b)}
                    className="px-3 py-1.5 rounded-lg text-sm text-amber-700 hover:bg-amber-50 font-medium"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => remove(b)}
                    className="px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 font-medium"
                  >
                    ลบ
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}