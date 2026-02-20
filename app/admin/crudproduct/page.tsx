"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  type: string;
  description: string;
  stockQuantity: number;
  isAvailable: boolean;
}

type ModalMode = "create" | "edit" | "view" | null;
type ImageInputType = "url" | "file";

export default function CrudProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageInputType, setImageInputType] = useState<ImageInputType>("url");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    category: "bakery",
    image: "",
    type: "",
    description: "",
    stockQuantity: 10,
    isAvailable: true,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      alert("กรุณาเข้าสู่ระบบ");
      router.push("/login");
      return;
    }

    try {
      const user = JSON.parse(userData);
      if (!user.email?.endsWith("@empbakery.com")) {
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        router.push("/");
        return;
      }
    } catch {
      router.push("/login");
      return;
    }

    fetchProducts();
  }, [router]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(
        "https://bakery-backend-production-6fc9.up.railway.app/api/products",
      );
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode: ModalMode, product?: Product) => {
    setModalMode(mode);
    setImageInputType("url");
    setPendingFile(null);

    if (product) {
      setSelectedProduct(product);
      setFormData({
        name: product.name,
        price: product.price,
        category: product.category,
        image: product.image,
        type: product.type,
        description: product.description,
        stockQuantity: product.stockQuantity,
        isAvailable: product.isAvailable,
      });
      setImagePreview(product.image);
    } else {
      setSelectedProduct(null);
      setFormData({
        name: "",
        price: 0,
        category: "bakery",
        image: "",
        type: "",
        description: "",
        stockQuantity: 10,
        isAvailable: true,
      });
      setImagePreview("");
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedProduct(null);
    setImagePreview("");
    setImageInputType("url");
    setPendingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleStockChange = (value: number) => {
    const newStock = Math.max(0, value);
    setFormData((prev) => ({
      ...prev,
      stockQuantity: newStock,
      isAvailable: newStock > 0,
    }));
  };

  // ✅ แก้ไข: เลือกไฟล์แล้วแสดง preview อย่างเดียว — ไม่ upload ทันที
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, GIF, WEBP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("ขนาดไฟล์ต้องไม่เกิน 5MB");
      return;
    }

    // เก็บไฟล์ไว้รอ upload ตอนกดบันทึก
    setPendingFile(file);

    // แสดง preview จาก local เท่านั้น (ไม่ upload)
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ✅ ฟังก์ชัน upload จริง — เรียกเฉพาะตอนกดบันทึก
  const uploadImageFile = async (file: File): Promise<string | null> => {
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const token = localStorage.getItem("token");
      const response = await fetch(
        "https://bakery-backend-production-6fc9.up.railway.app/api/upload/image",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formDataUpload,
        },
      );

      if (response.ok) {
        const data = await response.json();
        return data.url || data.imageUrl;
      }
      return null;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handleUrlChange = (url: string) => {
    setFormData((prev) => ({ ...prev, image: url }));
    setImagePreview(url);
    setPendingFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = formData.image;

      // ✅ ถ้ามีไฟล์รอ upload → upload ตอนนี้เท่านั้น
      if (pendingFile) {
        const uploadedUrl = await uploadImageFile(pendingFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          alert("อัพโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่");
          setSaving(false);
          return;
        }
      }

      if (!imageUrl) {
        alert("กรุณาเลือกรูปภาพ");
        setSaving(false);
        return;
      }

      const dataToSubmit = {
        ...formData,
        image: imageUrl,
        isAvailable: formData.stockQuantity > 0,
      };

      const token = localStorage.getItem("token");
      const url =
        modalMode === "create"
          ? "https://bakery-backend-production-6fc9.up.railway.app/api/products"
          : `https://bakery-backend-production-6fc9.up.railway.app/api/products/${selectedProduct?.id}`;

      const method = modalMode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (response.ok) {
        alert(
          modalMode === "create" ? "เพิ่มสินค้าสำเร็จ!" : "แก้ไขสินค้าสำเร็จ!",
        );
        fetchProducts();
        closeModal();
      } else {
        const data = await response.json();
        alert(data.message || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("ต้องการลบสินค้านี้หรือไม่?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `https://bakery-backend-production-6fc9.up.railway.app/api/products/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        alert("ลบสินค้าสำเร็จ!");
        fetchProducts();
      } else {
        alert("เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("เกิดข้อผิดพลาด");
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchCategory =
      filterCategory === "all" || product.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "bakery":
        return "bg-amber-100 text-amber-700";
      case "cake":
        return "bg-pink-100 text-pink-700";
      case "drink":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStockColor = (stock: number) => {
    if (stock === 0) return "text-red-600 bg-red-50";
    if (stock <= 5) return "text-orange-600 bg-orange-50";
    if (stock <= 10) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  const getAvailabilityStatus = (product: Product) => {
    if (product.stockQuantity === 0) {
      return { text: "✗ สินค้าหมด", className: "bg-red-100 text-red-700" };
    }
    if (product.isAvailable) {
      return { text: "✓ พร้อมขาย", className: "bg-green-100 text-green-700" };
    }
    return { text: "⏸ ปิดการขาย", className: "bg-gray-100 text-gray-700" };
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-800 flex items-center gap-3">
              <span className="text-4xl">📦</span>
              จัดการสินค้า
            </h1>
            <p className="text-amber-600 mt-1">
              สินค้าทั้งหมด {products.length} รายการ
            </p>
          </div>
          <button
            onClick={() => openModal("create")}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            เพิ่มสินค้าใหม่
          </button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-md flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="ค้นหาสินค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-400"
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
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">ทุกหมวดหมู่</option>
            <option value="bakery">🥐 Bakery</option>
            <option value="cake">🎂 Cake</option>
            <option value="drink">☕ Drink</option>
          </select>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-amber-500">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    รูปภาพ
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    ชื่อสินค้า
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    หมวดหมู่
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    ราคา
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    Stock
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                    สถานะ
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => {
                  const status = getAvailabilityStatus(product);
                  return (
                    <tr
                      key={product.id}
                      className={`border-b border-amber-100 hover:bg-amber-50 ${index % 2 === 0 ? "bg-white" : "bg-amber-50/50"}`}
                    >
                      <td className="px-6 py-4">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-amber-800">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {product.type}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryBadge(product.category)}`}
                        >
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-amber-600">
                        ฿{product.price}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStockColor(product.stockQuantity)}`}
                        >
                          {product.stockQuantity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${status.className}`}
                        >
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openModal("view", product)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                            title="ดูรายละเอียด"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => openModal("edit", product)}
                            className="p-2 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors"
                            title="แก้ไข"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            title="ลบ"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-500">ไม่พบสินค้า</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b bg-amber-500 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {modalMode === "create" && (
                  <>
                    <span>➕</span> เพิ่มสินค้าใหม่
                  </>
                )}
                {modalMode === "edit" && (
                  <>
                    <span>✏️</span> แก้ไขสินค้า
                  </>
                )}
                {modalMode === "view" && (
                  <>
                    <span>👁️</span> รายละเอียดสินค้า
                  </>
                )}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-amber-600 rounded-lg transition-colors text-white"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Image Preview */}
              <div className="flex justify-center">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-xl border-2 border-amber-200"
                  />
                ) : (
                  <div className="w-32 h-32 bg-amber-50 rounded-xl border-2 border-dashed border-amber-300 flex items-center justify-center">
                    <span className="text-4xl">📷</span>
                  </div>
                )}
              </div>

              {/* ✅ แสดงชื่อไฟล์ที่เลือก (ยังไม่ upload) */}
              {pendingFile && (
                <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 py-2 rounded-lg">
                  <span>📎</span>
                  <span>{pendingFile.name}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อสินค้า *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={modalMode === "view"}
                  required
                  className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                />
              </div>

              {/* Category & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    หมวดหมู่ *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    disabled={modalMode === "view"}
                    className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                  >
                    <option value="bakery">Bakery</option>
                    <option value="cake">Cake</option>
                    <option value="drink">Drink</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ประเภท *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    disabled={modalMode === "view"}
                    className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                  >
                    <option value="">-- เลือกประเภท --</option>
                    {formData.category === "bakery" && (
                      <>
                        <option value="Brownie">Brownie</option>
                        <option value="Cookie">Cookie</option>
                        <option value="Cupcake">Cupcake</option>
                        <option value="Muffin">Muffin</option>
                        <option value="Pastry">Pastry</option>
                        <option value="Sweet Roll">Sweet Roll</option>
                      </>
                    )}
                    {formData.category === "cake" && (
                      <>
                        <option value="Chocolate">Chocolate</option>
                        <option value="Cheesecake">Cheesecake</option>
                        <option value="Crape">Crape</option>
                        <option value="Fruit">Fruit</option>
                        <option value="Special">Special</option>
                      </>
                    )}
                    {formData.category === "drink" && (
                      <>
                        <option value="Chocolate">Chocolate</option>
                        <option value="Coffee">Coffee</option>
                        <option value="Juice">Juice</option>
                        <option value="Tea">Tea</option>
                        <option value="Smoothie">Smoothie</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ราคา (บาท) *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: Number(e.target.value),
                      })
                    }
                    disabled={modalMode === "view"}
                    required
                    min="0"
                    className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock *
                  </label>
                  <input
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => handleStockChange(Number(e.target.value))}
                    disabled={modalMode === "view"}
                    required
                    min="0"
                    className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                  />
                  {formData.stockQuantity === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      ⚠️ สถานะจะเปลี่ยนเป็น "สินค้าหมด" อัตโนมัติ
                    </p>
                  )}
                </div>
              </div>

              {/* Image Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รูปภาพ *
                </label>

                {modalMode !== "view" && (
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setImageInputType("url")}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${imageInputType === "url" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
                    >
                      🔗 URL รูปภาพ
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputType("file")}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${imageInputType === "file" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
                    >
                      📁 อัพโหลดไฟล์
                    </button>
                  </div>
                )}

                {imageInputType === "url" && (
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    disabled={modalMode === "view"}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                  />
                )}

                {imageInputType === "file" && modalMode !== "view" && (
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="w-full flex flex-col items-center justify-center px-4 py-6 bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl cursor-pointer hover:bg-amber-100 hover:border-amber-400 transition-all"
                    >
                      <svg
                        className="w-10 h-10 text-amber-400 mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <span className="text-amber-600 font-medium">
                        คลิกเพื่อเลือกไฟล์
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        JPG, PNG, GIF, WEBP
                      </span>
                    </label>
                  </div>
                )}

                {modalMode === "view" && (
                  <div className="px-4 py-3 bg-gray-100 rounded-xl text-gray-600 text-sm break-all">
                    {formData.image}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รายละเอียด
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  disabled={modalMode === "view"}
                  rows={3}
                  className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 resize-none"
                />
              </div>

              {/* Buttons */}
              {modalMode !== "view" && (
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={saving || (!formData.image && !pendingFile)}
                    className="flex-1 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        กำลังบันทึก...
                      </>
                    ) : modalMode === "create" ? (
                      <>
                        <span>➕</span> เพิ่มสินค้า
                      </>
                    ) : (
                      <>
                        <span>💾</span> บันทึก
                      </>
                    )}
                  </button>
                </div>
              )}

              {modalMode === "view" && (
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    ปิด
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal("edit", selectedProduct!)}
                    className="flex-1 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <span>✏️</span> แก้ไข
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
