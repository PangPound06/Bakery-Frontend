"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

interface Supplier {
  id: number;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  taxId: string;
  address: string;
  category: string;
  paymentTerms: string;
  status: "active" | "suspended";
  rating: number;
  note: string;
  createdAt: string;
}

interface PurchaseOrder {
  id: number;
  supplierId: number;
  supplierName: string;
  poCode: string;
  itemName: string;
  itemQty: number;
  itemUnit: string;
  itemPrice: number;
  total: number;
  status: "pending" | "confirmed" | "rejected" | "delivered";
  paymentStatus: "unpaid" | "paid" | "cancelled";
  createdAt: string;
  note: string;
}

const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const API =
  process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL}`;

export default function SupplierPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "list" | "po" | "invoice" | "report"
  >("list");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([] as PurchaseOrder[]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("ทั้งหมด");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [editSupplierForm, setEditSupplierForm] = useState({
    name: "",
    contactName: "",
    phone: "",
    email: "",
    taxId: "",
    address: "",
    category: "วัตถุดิบ",
    paymentTerms: "Net 30 วัน",
    note: "",
  });
  const [poTarget, setPoTarget] = useState<Supplier | null>(null);
  const [showEditPOModal, setShowEditPOModal] = useState(false);
  const [editPO, setEditPO] = useState<PurchaseOrder | null>(null);
  const [editPOForm, setEditPOForm] = useState({
    itemName: "",
    itemQty: 1,
    itemUnit: "กก.",
    itemPrice: 0,
  });

  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contactName: "",
    phone: "",
    email: "",
    taxId: "",
    address: "",
    category: "วัตถุดิบ",
    paymentTerms: "Net 30 วัน",
    note: "",
  });
  const [newPO, setNewPO] = useState({
    itemName: "",
    itemQty: 1,
    itemUnit: "กก.",
    itemPrice: 0,
    note: "",
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.replace("/login");
      return;
    }
    const user = JSON.parse(userData);
    if (!user.email?.endsWith("@empbakery.com")) router.replace("/");
  }, [router]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterCat !== "ทั้งหมด") params.set("category", filterCat);
      if (filterStatus !== "ทั้งหมด") params.set("status", filterStatus);
      const res = await fetch(`${API}/api/suppliers?${params}`);
      const data = await res.json();
      const list: Supplier[] = Array.isArray(data) ? data : [];
      setSuppliers(list);
      if (!selectedSupplier && list.length > 0) setSelectedSupplier(list[0]);
    } catch (e) {
      console.error("fetch suppliers error", e);
    }
  }, [search, filterCat, filterStatus]);

  const fetchPOs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/purchase-orders`);
      const data = await res.json();
      setPos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("fetch POs error", e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSuppliers(), fetchPOs()]).finally(() =>
      setLoading(false),
    );
  }, [fetchSuppliers, fetchPOs]);

  const safePos = Array.isArray(pos) ? pos : [];
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

  const kpi = {
    total: safeSuppliers.length,
    pendingPO: safePos.filter((p) => p.status === "pending").length,
    unpaidInvoice: safePos.filter((p) => p.paymentStatus === "unpaid").length,
    unpaidTotal: safePos
      .filter((p) => p.paymentStatus === "unpaid")
      .reduce((s, p) => s + p.total, 0),
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name || !newSupplier.contactName || !newSupplier.phone) {
      await Swal.fire({
        title: "กรุณากรอกข้อมูลให้ครบ",
        icon: "warning",
        confirmButtonColor: "#f97316",
      });
      return;
    }
    try {
      const res = await fetch(`${API}/api/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplier),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      await fetchSuppliers();
      setShowAddModal(false);
      setNewSupplier({
        name: "",
        contactName: "",
        phone: "",
        email: "",
        taxId: "",
        address: "",
        category: "วัตถุดิบ",
        paymentTerms: "Net 30 วัน",
        note: "",
      });
      await Swal.fire({
        title: "เพิ่ม Supplier สำเร็จ",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: err?.message || "ไม่สามารถเชื่อมต่อ Backend ได้",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
    }
  };

  const handleCreatePO = async () => {
    if (!poTarget || !newPO.itemName) {
      await Swal.fire({
        title: "กรุณากรอกชื่อสินค้า",
        icon: "warning",
        confirmButtonColor: "#f97316",
      });
      return;
    }
    try {
      const res = await fetch(`${API}/api/purchase-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: poTarget.id,
          supplierName: poTarget.name,
          items: [
            {
              name: newPO.itemName,
              qty: newPO.itemQty,
              unit: newPO.itemUnit,
              price: newPO.itemPrice,
            },
          ],
          note: newPO.note,
        }),
      });
      if (!res.ok) throw new Error();
      const created: PurchaseOrder = await res.json();
      await fetchPOs();
      setShowPOModal(false);
      setNewPO({
        itemName: "",
        itemQty: 1,
        itemUnit: "กก.",
        itemPrice: 0,
        note: "",
      });
      await Swal.fire({
        title: `สร้าง ${created.poCode} สำเร็จ`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch {
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
    }
  };

  const handleUpdateSupplier = async () => {
    if (
      !selectedSupplier ||
      !editSupplierForm.name ||
      !editSupplierForm.contactName ||
      !editSupplierForm.phone
    ) {
      await Swal.fire({
        title: "กรุณากรอกข้อมูลให้ครบ",
        icon: "warning",
        confirmButtonColor: "#f97316",
      });
      return;
    }
    try {
      const res = await fetch(`${API}/api/suppliers/${selectedSupplier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSupplierForm),
      });
      if (!res.ok) throw new Error();
      const updated: Supplier = await res.json();
      setSuppliers((prev) =>
        prev.map((s) => (s.id === selectedSupplier.id ? updated : s)),
      );
      setSelectedSupplier(updated);
      setShowEditSupplierModal(false);
      await Swal.fire({
        title: "แก้ไขสำเร็จ",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch {
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
    }
  };

  const handleSuspend = async (sup: Supplier) => {
    const action = sup.status === "active" ? "ระงับ" : "เปิดใช้งาน";
    const result = await Swal.fire({
      title: `${action} Supplier?`,
      text: `ต้องการ${action} ${sup.name} หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#6b7280",
      confirmButtonText: `ยืนยัน${action}`,
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`${API}/api/suppliers/${sup.id}/toggle-status`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error();
      const updated: Supplier = await res.json();
      setSuppliers((prev) => prev.map((s) => (s.id === sup.id ? updated : s)));
      if (selectedSupplier?.id === sup.id) setSelectedSupplier(updated);
    } catch {
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
    }
  };

  const handleUpdatePOStatus = async (poId: number, currentStatus: string) => {
    const { value } = await Swal.fire({
      title: "เปลี่ยนสถานะ PO",
      html: `
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
        ${[
          { value: "pending", label: "⏳ รอดำเนินการ", color: "#f59e0b" },
          { value: "confirmed", label: "✅ ยืนยันแล้ว", color: "#3b82f6" },
          { value: "delivered", label: "📦 ได้รับแล้ว", color: "#10b981" },
          { value: "rejected", label: "❌ ปฏิเสธ", color: "#ef4444" },
        ]
          .map(
            (opt) => `
          <button type="button" onclick="document.getElementById('swal-po-val').value='${opt.value}';this.parentElement.querySelectorAll('button').forEach(b=>b.style.opacity='0.4');this.style.opacity='1';this.style.outline='2px solid ${opt.color}'"
            style="padding:10px 16px;border-radius:12px;border:1.5px solid #e5e7eb;background:white;font-size:14px;cursor:pointer;text-align:left;transition:all 0.15s;${currentStatus === opt.value ? `opacity:1;outline:2px solid ${opt.color}` : "opacity:0.7"}">
            ${opt.label}
          </button>
        `,
          )
          .join("")}
        <input type="hidden" id="swal-po-val" value="${currentStatus}" />
      </div>
    `,
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonText: "ยกเลิก",
      confirmButtonText: "บันทึก",
      preConfirm: () =>
        (document.getElementById("swal-po-val") as HTMLInputElement)?.value,
    });
    if (!value || value === currentStatus) return;
    try {
      const res = await fetch(`${API}/api/purchase-orders/${poId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      if (!res.ok) throw new Error();
      await fetchPOs();
    } catch {
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
    }
  };

  const handleUpdatePaymentStatus = async (
    poId: number,
    currentStatus: string,
  ) => {
    const { value } = await Swal.fire({
      title: "เปลี่ยนสถานะการชำระ",
      html: `
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
        ${[
          { value: "unpaid", label: "⏳ ยังไม่ชำระ", color: "#f59e0b" },
          { value: "paid", label: "✅ ชำระแล้ว", color: "#10b981" },
          { value: "cancelled", label: "❌ ยกเลิก", color: "#ef4444" },
        ]
          .map(
            (opt) => `
          <button type="button" onclick="document.getElementById('swal-pay-val').value='${opt.value}';this.parentElement.querySelectorAll('button').forEach(b=>b.style.opacity='0.4');this.style.opacity='1';this.style.outline='2px solid ${opt.color}'"
            style="padding:10px 16px;border-radius:12px;border:1.5px solid #e5e7eb;background:white;font-size:14px;cursor:pointer;text-align:left;transition:all 0.15s;${currentStatus === opt.value ? `opacity:1;outline:2px solid ${opt.color}` : "opacity:0.7"}">
            ${opt.label}
          </button>
        `,
          )
          .join("")}
        <input type="hidden" id="swal-pay-val" value="${currentStatus}" />
      </div>
    `,
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonText: "ยกเลิก",
      confirmButtonText: "บันทึก",
      preConfirm: () =>
        (document.getElementById("swal-pay-val") as HTMLInputElement)?.value,
    });
    if (!value || value === currentStatus) return;
    try {
      const res = await fetch(
        `${API}/api/purchase-orders/${poId}/payment-status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus: value }),
        },
      );
      if (!res.ok) throw new Error();
      await fetchPOs();
    } catch {
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
    }
  };

  const handleUpdatePOItem = async () => {
    if (!editPO || !editPOForm.itemName) {
      await Swal.fire({
        title: "กรุณากรอกชื่อสินค้า",
        icon: "warning",
        confirmButtonColor: "#f97316",
      });
      return;
    }
    try {
      const res = await fetch(`${API}/api/purchase-orders/${editPO.id}/item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPOForm),
      });
      if (!res.ok) throw new Error();
      const updated: PurchaseOrder = await res.json();
      setPos((prev) => prev.map((p) => (p.id === editPO.id ? updated : p)));
      setShowEditPOModal(false);
      setEditPO(null);
      await Swal.fire({
        title: "แก้ไขสำเร็จ",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch {
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
    }
  };

  const getStatusTag = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800",
      confirmed: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
      delivered: "bg-emerald-100 text-emerald-800",
    };
    const text: Record<string, string> = {
      pending: "รอดำเนินการ",
      confirmed: "ยืนยันแล้ว",
      rejected: "ปฏิเสธ",
      delivered: "ได้รับแล้ว",
    };
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || "bg-gray-100 text-gray-700"}`}
      >
        {text[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-amber-700 text-sm">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 flex">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 p-3 md:p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 gap-3">
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-amber-900 flex items-center gap-2">
                  <span>⭐</span> Manage Supplier
                </h1>
                <p className="text-amber-600 text-sm mt-0.5">
                  ข้อมูลผู้จัดจำหน่ายและการดำเนินการ
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 md:px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0"
              >
                <span>+</span>
                <span className="hidden sm:inline">เพิ่ม Supplier</span>
                <span className="sm:hidden">เพิ่ม</span>
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
              {[
                {
                  label: "Supplier ทั้งหมด",
                  labelMobile: "Supplier",
                  value: kpi.total,
                  sub: `${suppliers.filter((s) => s.status === "active").length} ใช้งานอยู่`,
                  subColor: "text-emerald-600",
                },
                {
                  label: "PO รอดำเนินการ",
                  labelMobile: "PO รอ",
                  value: kpi.pendingPO,
                  sub: `${pos.filter((p) => p.status === "confirmed").length} ยืนยันแล้ว`,
                  subColor: "text-blue-600",
                },
                {
                  label: "ค้างชำระ",
                  labelMobile: "ค้างชำระ",
                  value: kpi.unpaidInvoice,
                  sub: `฿${formatPrice(kpi.unpaidTotal)} รวม`,
                  subColor: "text-red-500",
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-3 md:p-5 shadow-sm border border-amber-100"
                >
                  <p className="text-[10px] md:text-xs text-gray-500 mb-1 truncate md:hidden">
                    {card.labelMobile}
                  </p>
                  <p className="text-xs text-gray-500 mb-1 truncate hidden md:block">
                    {card.label}
                  </p>
                  <p className="text-lg md:text-2xl font-bold text-amber-700">
                    {card.value}
                  </p>
                  <p
                    className={`text-[10px] md:text-xs font-medium mt-1 truncate ${card.subColor}`}
                  >
                    {card.sub}
                  </p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
              <div className="flex border-b border-gray-100 px-2 overflow-x-auto scrollbar-hide">
                {(
                  [
                    ["list", "รายชื่อ Supplier"],
                    ["po", "คำสั่งซื้อ (PO)"],
                    ["invoice", "ใบแจ้งหนี้"],
                    ["report", "รายงาน"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-4 md:px-5 py-3.5 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === key ? "border-amber-500 text-amber-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                  >
                    {label}
                    {key === "po" &&
                      pos.filter((p) => p.status === "pending").length > 0 && (
                        <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {pos.filter((p) => p.status === "pending").length}
                        </span>
                      )}
                  </button>
                ))}
              </div>

              <div className="p-3 md:p-5">
                {/* LIST TAB */}
                {activeTab === "list" && (
                  <>
                    {/* Search filters */}
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mb-4">
                      <div className="relative flex-1">
                        <svg
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <input
                          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                          placeholder="ค้นหา Supplier..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <select
                          className="flex-1 sm:flex-none px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                          value={filterCat}
                          onChange={(e) => setFilterCat(e.target.value)}
                        >
                          {["ทั้งหมด", "วัตถุดิบ", "บรรจุภัณฑ์", "อุปกรณ์"].map(
                            (c) => (
                              <option key={c}>{c}</option>
                            ),
                          )}
                        </select>
                        <select
                          className="flex-1 sm:flex-none px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          {["ทั้งหมด", "ใช้งาน", "ระงับ"].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        {/* ✅ thead responsive */}
                        <thead>
                          <tr className="bg-gray-50 text-xs text-gray-500 font-medium">
                            <th className="text-left px-4 py-3 rounded-l-lg">
                              บริษัท
                            </th>
                            <th className="text-left px-4 py-3">ประเภท</th>
                            <th className="text-left px-4 py-3">ติดต่อ</th>
                            <th className="text-left px-4 py-3">PO ล่าสุด</th>
                            <th className="text-left px-4 py-3">สถานะ</th>
                            <th className="text-center px-4 py-3 rounded-r-lg">
                              จัดการ
                            </th>
                          </tr>
                        </thead>

                        {/* ✅ tbody responsive */}
                        <tbody>
                          {[...suppliers]
                            .sort((a, b) => a.name.localeCompare(b.name, "en"))
                            .map((sup) => {
                              const lastPO = pos
                                .filter((p) => p.supplierId === sup.id)
                                .sort(
                                  (a, b) =>
                                    new Date(b.createdAt).getTime() -
                                    new Date(a.createdAt).getTime(),
                                )[0];
                              const initials = sup.name.slice(0, 2);
                              const colors = [
                                "bg-amber-100 text-amber-800",
                                "bg-blue-100 text-blue-800",
                                "bg-emerald-100 text-emerald-800",
                                "bg-purple-100 text-purple-800",
                              ];
                              return (
                                <tr
                                  key={sup.id}
                                  onClick={() => setSelectedSupplier(sup)}
                                  className={`border-t border-gray-50 cursor-pointer transition-colors ${selectedSupplier?.id === sup.id ? "bg-amber-50" : "hover:bg-gray-50"}`}
                                >
                                  {/* บริษัท — แสดงตลอด + badge สถานะบนมือถือ */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${colors[sup.id % colors.length]}`}
                                      >
                                        {initials}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-amber-700 truncate">
                                          {sup.name}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate max-w-[140px]">
                                          {(sup.note || "").slice(0, 20)}
                                          {(sup.note || "").length > 20
                                            ? "..."
                                            : ""}
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-4 py-3">
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${sup.category === "วัตถุดิบ" ? "bg-blue-50 text-blue-700" : sup.category === "บรรจุภัณฑ์" ? "bg-emerald-50 text-emerald-700" : "bg-purple-50 text-purple-700"}`}
                                    >
                                      {sup.category}
                                    </span>
                                  </td>

                                  <td className="px-4 py-3">
                                    <p className="text-xs text-amber-700">
                                      {sup.contactName}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {sup.phone}
                                    </p>
                                  </td>

                                  <td className="px-4 py-3">
                                    {lastPO ? (
                                      <div>
                                        <p className="text-xs font-medium text-amber-700">
                                          {lastPO.poCode}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          {lastPO.createdAt?.slice(0, 10)}
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-400">-</p>
                                    )}
                                  </td>

                                  <td className="px-4 py-3">
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${sup.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                                    >
                                      {sup.status === "active"
                                        ? "ใช้งานอยู่"
                                        : "ระงับแล้ว"}
                                    </span>
                                  </td>

                                  {/* จัดการ — แสดงตลอด */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPoTarget(sup);
                                          setShowPOModal(true);
                                        }}
                                        className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors"
                                      >
                                        PO ใหม่
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSuspend(sup);
                                        }}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${sup.status === "active" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}
                                      >
                                        {sup.status === "active"
                                          ? "ระงับ"
                                          : "เปิดใช้"}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                      {suppliers.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                          <p className="text-4xl mb-2">🔍</p>
                          <p className="text-sm">ไม่พบ Supplier</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* PO TAB */}
                {activeTab === "po" && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 font-medium">
                          <th className="text-left px-4 py-3 rounded-l-lg">
                            รหัส PO
                          </th>
                          <th className="text-left px-4 py-3">Supplier</th>
                          <th className="text-left px-4 py-3">รายการ</th>
                          <th className="text-left px-4 py-3">ยอดรวม</th>
                          <th className="text-left px-4 py-3">สถานะ PO</th>
                          <th className="text-left px-4 py-3">การชำระ</th>
                          <th className="text-left px-4 py-3">วันที่</th>
                          <th className="text-left px-4 py-3 rounded-r-lg">
                            แก้ไข
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...pos]
                          .sort((a, b) =>
                            a.supplierName.localeCompare(b.supplierName, "en"),
                          )
                          .map((po) => {
                            return (
                              <tr
                                key={po.id}
                                className="border-t border-gray-50 hover:bg-gray-50"
                              >
                                <td className="px-4 py-3 font-bold text-amber-700 text-sm">
                                  {po.poCode}
                                </td>
                                <td className="px-4 py-3 text-sm text-amber-700">
                                  {po.supplierName}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                  {po.itemName} x{po.itemQty} {po.itemUnit}
                                </td>
                                <td className="px-4 py-3 font-semibold text-amber-600 text-sm">
                                  ฿{formatPrice(po.total ?? 0)}
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() =>
                                      handleUpdatePOStatus(po.id, po.status)
                                    }
                                    className="hover:opacity-70 transition-opacity"
                                    title="คลิกเพื่อเปลี่ยนสถานะ"
                                  >
                                    {getStatusTag(po.status)}
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() =>
                                      handleUpdatePaymentStatus(
                                        po.id,
                                        po.paymentStatus,
                                      )
                                    }
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium hover:opacity-70 transition-opacity ${po.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : po.paymentStatus === "cancelled" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                                    title="คลิกเพื่อเปลี่ยนสถานะการชำระ"
                                  >
                                    {po.paymentStatus === "paid"
                                      ? "ชำระแล้ว ✓"
                                      : po.paymentStatus === "cancelled"
                                        ? "ยกเลิก"
                                        : "ยังไม่ชำระ"}
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                  {po.createdAt?.slice(0, 10)}
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => {
                                      setEditPO(po);
                                      setEditPOForm({
                                        itemName: po.itemName,
                                        itemQty: po.itemQty,
                                        itemUnit: po.itemUnit,
                                        itemPrice: po.itemPrice,
                                      });
                                      setShowEditPOModal(true);
                                    }}
                                    className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                                  >
                                    ✏️ แก้ไข
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* INVOICE TAB */}
                {activeTab === "invoice" && (
                  <div>
                    <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
                      <div className="bg-amber-50 rounded-xl p-3 md:p-4 border border-amber-100">
                        <p className="text-[10px] md:text-xs text-amber-700 mb-1 truncate">
                          ค้างชำระทั้งหมด
                        </p>
                        <p className="text-base md:text-2xl font-bold text-amber-800 truncate">
                          ฿
                          {formatPrice(
                            pos
                              .filter((p) => p.paymentStatus === "unpaid")
                              .reduce((s, p) => s + p.total, 0),
                          )}
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3 md:p-4 border border-emerald-100">
                        <p className="text-[10px] md:text-xs text-emerald-700 mb-1 truncate">
                          ชำระแล้ว
                        </p>
                        <p className="text-base md:text-2xl font-bold text-emerald-800 truncate">
                          ฿
                          {formatPrice(
                            pos
                              .filter((p) => p.paymentStatus === "paid")
                              .reduce((s, p) => s + p.total, 0),
                          )}
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3 md:p-4 border border-blue-100">
                        <p className="text-[10px] md:text-xs text-blue-700 mb-1">
                          PO ทั้งหมด
                        </p>
                        <p className="text-base md:text-2xl font-bold text-blue-800">
                          {pos.length}
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 text-xs text-gray-500 font-medium">
                            <th className="text-left px-4 py-3 rounded-l-lg">
                              รหัส PO
                            </th>
                            <th className="text-left px-4 py-3 hidden sm:table-cell">
                              Supplier
                            </th>
                            <th className="text-left px-4 py-3">ยอดเงิน</th>
                            <th className="text-left px-4 py-3 hidden md:table-cell">
                              กำหนดชำระ
                            </th>
                            <th className="text-left px-4 py-3 rounded-r-lg">
                              สถานะ
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...pos]
                            .sort((a, b) =>
                              a.supplierName.localeCompare(
                                b.supplierName,
                                "en",
                              ),
                            )
                            .map((po) => {
                              const sup = suppliers.find(
                                (s) => s.id === po.supplierId,
                              );
                              return (
                                <tr
                                  key={po.id}
                                  className="border-t border-gray-50 hover:bg-gray-50"
                                >
                                  <td className="px-4 py-3 font-bold text-amber-700 text-sm">
                                    {po.poCode}
                                    <p className="text-[10px] text-gray-400 font-normal sm:hidden">
                                      {po.supplierName}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-amber-700 hidden sm:table-cell">
                                    {po.supplierName}
                                  </td>
                                  <td className="px-4 py-3 font-semibold text-amber-600">
                                    ฿{formatPrice(po.total ?? 0)}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                                    {sup?.paymentTerms || "-"}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${po.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : po.paymentStatus === "cancelled" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                                    >
                                      {po.paymentStatus === "paid"
                                        ? "ชำระแล้ว"
                                        : po.paymentStatus === "cancelled"
                                          ? "ยกเลิก"
                                          : "รอชำระ"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* REPORT TAB */}
                {activeTab === "report" && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        ยอดสั่งซื้อต่อ Supplier
                      </p>
                      {[...suppliers]
                        .sort((a, b) => a.name.localeCompare(b.name, "en"))
                        .map((sup) => {
                          const total = pos
                            .filter(
                              (p) =>
                                p.supplierId === sup.id &&
                                p.status !== "rejected" &&
                                p.status !== "pending" &&
                                p.paymentStatus !== "cancelled" &&
                                p.paymentStatus !== "unpaid",
                            )
                            .reduce((s, p) => s + p.total, 0);
                          const max = Math.max(
                            ...suppliers.map((s) =>
                              pos
                                .filter(
                                  (p) =>
                                    p.supplierId === s.id &&
                                    p.status !== "rejected" &&
                                    p.status !== "pending" &&
                                    p.paymentStatus !== "cancelled" &&
                                    p.paymentStatus !== "unpaid",
                                )
                                .reduce((a, p) => a + p.total, 0),
                            ),
                            1,
                          );
                          return (
                            <div
                              key={sup.id}
                              className="flex items-center gap-3 mb-2"
                            >
                              <p className="text-xs text-amber-800 w-24 md:w-32 truncate">
                                {sup.name}
                              </p>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${(total / max) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-700 w-12 md:w-14 text-right">
                                ฿{(total / 1000).toFixed(1)}k
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel — ซ่อนบนมือถือและ iPad แสดง lg+ */}
          {selectedSupplier && (
            <div className="hidden lg:block w-64 bg-white border-l border-amber-100 p-5 overflow-y-auto flex-shrink-0">
              <p className="text-sm font-medium text-amber-700 mb-4">
                รายละเอียด Supplier
              </p>
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-base font-medium mx-auto mb-2">
                  {selectedSupplier.name.slice(0, 2)}
                </div>
                <p className="text-sm font-medium text-amber-700">
                  {selectedSupplier.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedSupplier.category}
                </p>
                <span
                  className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${selectedSupplier.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                >
                  {selectedSupplier.status === "active"
                    ? "ใช้งานอยู่"
                    : "ระงับแล้ว"}
                </span>
              </div>
              <hr className="border-gray-100 my-3" />
              <div className="space-y-3 mb-4">
                {[
                  { label: "ผู้ติดต่อ", value: selectedSupplier.contactName },
                  { label: "โทรศัพท์", value: selectedSupplier.phone },
                  { label: "อีเมล", value: selectedSupplier.email || "-" },
                  {
                    label: "เลขผู้เสียภาษี",
                    value: selectedSupplier.taxId || "-",
                  },
                  {
                    label: "เงื่อนไขชำระ",
                    value: selectedSupplier.paymentTerms,
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-xs font-medium text-amber-700 mt-0.5">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              <hr className="border-gray-100 my-3" />
              <div>
                <p className="text-xs text-gray-400 mb-2">PO ล่าสุด</p>
                <div className="space-y-2">
                  {pos
                    .filter((p) => p.supplierId === selectedSupplier.id)
                    .slice(0, 3)
                    .map((po) => (
                      <div key={po.id} className="flex items-start gap-2">
                        <div
                          className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${po.status === "delivered" ? "bg-emerald-500" : po.status === "pending" ? "bg-amber-500" : "bg-blue-500"}`}
                        />
                        <div>
                          <p className="text-xs font-medium text-gray-700">
                            {po.poCode}
                          </p>
                          <p className="text-xs text-gray-400">
                            ฿{formatPrice(po.total ?? 0)} ·{" "}
                            {po.createdAt?.slice(0, 10)}
                          </p>
                        </div>
                      </div>
                    ))}
                  {pos.filter((p) => p.supplierId === selectedSupplier.id)
                    .length === 0 && (
                    <p className="text-xs text-gray-400">ยังไม่มี PO</p>
                  )}
                </div>
              </div>
              <hr className="border-gray-100 my-3" />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setPoTarget(selectedSupplier);
                    setShowPOModal(true);
                  }}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-medium transition-colors"
                >
                  + สร้าง PO ใหม่
                </button>
                <button
                  onClick={() => {
                    setEditSupplierForm({
                      name: selectedSupplier.name,
                      contactName: selectedSupplier.contactName,
                      phone: selectedSupplier.phone,
                      email: selectedSupplier.email || "",
                      taxId: selectedSupplier.taxId || "",
                      address: selectedSupplier.address || "",
                      category: selectedSupplier.category,
                      paymentTerms: selectedSupplier.paymentTerms,
                      note: selectedSupplier.note || "",
                    });
                    setShowEditSupplierModal(true);
                  }}
                  className="w-full py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-medium transition-colors"
                >
                  ✏️ แก้ไขข้อมูล
                </button>
                <button
                  onClick={() => handleSuspend(selectedSupplier)}
                  className={`w-full py-2 rounded-xl text-xs font-medium transition-colors ${selectedSupplier.status === "active" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                >
                  {selectedSupplier.status === "active"
                    ? "ระงับ Supplier"
                    : "เปิดใช้งานอีกครั้ง"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 bg-amber-500 rounded-t-2xl">
              <h2 className="text-lg font-bold text-white">
                + เพิ่ม Supplier ใหม่
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white hover:bg-amber-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              {[
                {
                  label: "ชื่อบริษัท *",
                  key: "name",
                  placeholder: "บ.ชื่อบริษัท จำกัด",
                },
                {
                  label: "ชื่อผู้ติดต่อ *",
                  key: "contactName",
                  placeholder: "คุณชื่อ นามสกุล",
                },
                {
                  label: "โทรศัพท์ *",
                  key: "phone",
                  placeholder: "0XX-XXX-XXXX",
                },
                {
                  label: "อีเมล",
                  key: "email",
                  placeholder: "email@company.com",
                },
                {
                  label: "เลขผู้เสียภาษี",
                  key: "taxId",
                  placeholder: "13 หลัก",
                },
                {
                  label: "ที่อยู่",
                  key: "address",
                  placeholder: "ที่อยู่บริษัท",
                },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <input
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder={field.placeholder}
                    inputMode={
                      field.key === "phone" || field.key === "taxId"
                        ? "numeric"
                        : "text"
                    }
                    maxLength={
                      field.key === "phone"
                        ? 10
                        : field.key === "taxId"
                          ? 13
                          : undefined
                    }
                    value={(newSupplier as any)[field.key]}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (field.key === "phone")
                        val = val.replace(/\D/g, "").slice(0, 10);
                      if (field.key === "taxId")
                        val = val.replace(/\D/g, "").slice(0, 13);
                      if (field.key === "contactName")
                        val = val.replace(/[^a-zA-Zก-๙\s]/g, "");
                      setNewSupplier((prev) => ({ ...prev, [field.key]: val }));
                    }}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ประเภทสินค้า
                  </label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    value={newSupplier.category}
                    onChange={(e) =>
                      setNewSupplier((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  >
                    {["วัตถุดิบ", "บรรจุภัณฑ์", "อุปกรณ์"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เงื่อนไขชำระ
                  </label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    value={newSupplier.paymentTerms}
                    onChange={(e) =>
                      setNewSupplier((prev) => ({
                        ...prev,
                        paymentTerms: e.target.value,
                      }))
                    }
                  >
                    {[
                      "ชำระทันที",
                      "Net 15 วัน",
                      "Net 30 วัน",
                      "Net 45 วัน",
                    ].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  หมายเหตุ
                </label>
                <textarea
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  rows={2}
                  placeholder="สินค้าที่จัดจำหน่าย..."
                  value={newSupplier.note}
                  onChange={(e) =>
                    setNewSupplier((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-amber-800 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddSupplier}
                  className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {showPOModal && poTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 bg-amber-500 rounded-t-2xl">
              <h2 className="text-lg font-bold text-white">
                สร้าง PO — {poTarget.name}
              </h2>
              <button
                onClick={() => setShowPOModal(false)}
                className="text-white hover:bg-amber-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 rounded-xl p-3 text-sm">
                <p className="font-medium text-amber-800">{poTarget.name}</p>
                <p className="text-amber-600 text-xs mt-0.5">
                  เงื่อนไข: {poTarget.paymentTerms}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  รายการสินค้า
                </label>
                <div className="grid grid-cols-12 gap-2 mb-1">
                  <p className="col-span-4 text-xs text-gray-400 px-1">
                    ชื่อสินค้า
                  </p>
                  <p className="col-span-2 text-xs text-gray-400 px-1">จำนวน</p>
                  <p className="col-span-2 text-xs text-gray-400 px-1">หน่วย</p>
                  <p className="col-span-4 text-xs text-gray-400 px-1">
                    ราคา/หน่วย (฿)
                  </p>
                </div>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="col-span-4 px-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                    placeholder="เช่น แป้งสาลี"
                    value={newPO.itemName}
                    onChange={(e) =>
                      setNewPO((prev) => ({
                        ...prev,
                        itemName: e.target.value,
                      }))
                    }
                  />
                  <input
                    type="number"
                    className="col-span-2 px-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                    placeholder="0"
                    value={newPO.itemQty}
                    min={1}
                    onChange={(e) =>
                      setNewPO((prev) => ({
                        ...prev,
                        itemQty: Number(e.target.value),
                      }))
                    }
                  />
                  <select
                    className="col-span-2 px-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                    value={newPO.itemUnit}
                    onChange={(e) =>
                      setNewPO((prev) => ({
                        ...prev,
                        itemUnit: e.target.value,
                      }))
                    }
                  >
                    {["กก.", "ลิตร", "ใบ", "ชิ้น", "กล่อง", "ถุง"].map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="col-span-4 px-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                    placeholder="0.00"
                    value={newPO.itemPrice}
                    min={0}
                    onChange={(e) =>
                      setNewPO((prev) => ({
                        ...prev,
                        itemPrice: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="mt-3 text-right">
                  <span className="text-sm font-bold text-amber-700">
                    ยอดรวม: ฿{formatPrice(newPO.itemQty * newPO.itemPrice)}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  หมายเหตุ
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  rows={2}
                  placeholder="หมายเหตุเพิ่มเติม..."
                  value={newPO.note}
                  onChange={(e) =>
                    setNewPO((prev) => ({ ...prev, note: e.target.value }))
                  }
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPOModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-amber-800 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleCreatePO}
                  className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
                >
                  ส่ง PO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit PO Item Modal */}
      {showEditPOModal && editPO && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 bg-amber-500 rounded-t-2xl">
              <h2 className="text-lg font-bold text-white">
                ✏️ แก้ไข {editPO.poCode}
              </h2>
              <button
                onClick={() => setShowEditPOModal(false)}
                className="text-white hover:bg-amber-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-12 gap-2 mb-1">
                <p className="col-span-4 text-xs text-gray-400 px-1">
                  ชื่อสินค้า
                </p>
                <p className="col-span-2 text-xs text-gray-400 px-1">จำนวน</p>
                <p className="col-span-2 text-xs text-gray-400 px-1">หน่วย</p>
                <p className="col-span-4 text-xs text-gray-400 px-1">
                  ราคา/หน่วย (฿)
                </p>
              </div>
              <div className="grid grid-cols-12 gap-2 items-center">
                <input
                  className="col-span-4 px-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                  value={editPOForm.itemName}
                  onChange={(e) =>
                    setEditPOForm((prev) => ({
                      ...prev,
                      itemName: e.target.value,
                    }))
                  }
                />
                <input
                  type="number"
                  className="col-span-2 px-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                  value={editPOForm.itemQty}
                  min={1}
                  onChange={(e) =>
                    setEditPOForm((prev) => ({
                      ...prev,
                      itemQty: Number(e.target.value),
                    }))
                  }
                />
                <select
                  className="col-span-2 px-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                  value={editPOForm.itemUnit}
                  onChange={(e) =>
                    setEditPOForm((prev) => ({
                      ...prev,
                      itemUnit: e.target.value,
                    }))
                  }
                >
                  {["กก.", "ลิตร", "ใบ", "ชิ้น", "กล่อง", "ถุง"].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
                <input
                  type="number"
                  className="col-span-4 px-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                  value={editPOForm.itemPrice}
                  min={0}
                  onChange={(e) =>
                    setEditPOForm((prev) => ({
                      ...prev,
                      itemPrice: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-amber-600">
                  ยอดรวม: ฿
                  {formatPrice(editPOForm.itemQty * editPOForm.itemPrice)}
                </span>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEditPOModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-amber-800 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleUpdatePOItem}
                  className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {showEditSupplierModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 bg-amber-500 rounded-t-2xl">
              <h2 className="text-lg font-bold text-white">
                ✏️ แก้ไข {selectedSupplier.name}
              </h2>
              <button
                onClick={() => setShowEditSupplierModal(false)}
                className="text-white hover:bg-amber-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              {[
                {
                  label: "ชื่อบริษัท *",
                  key: "name",
                  placeholder: "บ.ชื่อบริษัท จำกัด",
                },
                {
                  label: "ชื่อผู้ติดต่อ *",
                  key: "contactName",
                  placeholder: "คุณชื่อ นามสกุล",
                },
                {
                  label: "โทรศัพท์ *",
                  key: "phone",
                  placeholder: "0XX-XXX-XXXX",
                },
                {
                  label: "อีเมล",
                  key: "email",
                  placeholder: "email@company.com",
                },
                {
                  label: "เลขผู้เสียภาษี",
                  key: "taxId",
                  placeholder: "13 หลัก",
                },
                {
                  label: "ที่อยู่",
                  key: "address",
                  placeholder: "ที่อยู่บริษัท",
                },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <input
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder={field.placeholder}
                    inputMode={
                      field.key === "phone" || field.key === "taxId"
                        ? "numeric"
                        : "text"
                    }
                    maxLength={
                      field.key === "phone"
                        ? 10
                        : field.key === "taxId"
                          ? 13
                          : undefined
                    }
                    value={(editSupplierForm as any)[field.key]}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (field.key === "phone")
                        val = val.replace(/\D/g, "").slice(0, 10);
                      if (field.key === "taxId")
                        val = val.replace(/\D/g, "").slice(0, 13);
                      if (field.key === "contactName")
                        val = val.replace(/[^a-zA-Zก-๙\s]/g, "");
                      setEditSupplierForm((prev) => ({
                        ...prev,
                        [field.key]: val,
                      }));
                    }}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ประเภทสินค้า
                  </label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    value={editSupplierForm.category}
                    onChange={(e) =>
                      setEditSupplierForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  >
                    {["วัตถุดิบ", "บรรจุภัณฑ์", "อุปกรณ์"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เงื่อนไขชำระ
                  </label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    value={editSupplierForm.paymentTerms}
                    onChange={(e) =>
                      setEditSupplierForm((prev) => ({
                        ...prev,
                        paymentTerms: e.target.value,
                      }))
                    }
                  >
                    {[
                      "ชำระทันที",
                      "Net 15 วัน",
                      "Net 30 วัน",
                      "Net 45 วัน",
                    ].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  หมายเหตุ
                </label>
                <textarea
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  rows={2}
                  placeholder="สินค้าที่จัดจำหน่าย..."
                  value={editSupplierForm.note}
                  onChange={(e) =>
                    setEditSupplierForm((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEditSupplierModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-amber-800 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleUpdateSupplier}
                  className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
