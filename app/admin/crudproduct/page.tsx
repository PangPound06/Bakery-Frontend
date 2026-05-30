"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  categoryId?: number;
  categoryName?: string;
  categoryIcon?: string;
  image: string;
  type: string;
  description: string;
  stockQuantity: number;
  isAvailable: boolean;
  options?: string | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
}

interface ProductOption {
  name: string;
  extraPrice: number;
  stockMultiplier?: number;
}

type ModalMode = "create" | "edit" | "view" | null;
type ImageInputType = "url" | "file";
type StockType = "stock" | "fresh";

const DEFAULT_TYPES: Record<string, string[]> = {};

const FRESH_STOCK_VALUE = 9999;

const parseOptions = (optionsStr?: string | null): ProductOption[] => {
  if (!optionsStr) return [];
  try {
    return JSON.parse(optionsStr);
  } catch {
    return [];
  }
};

const MULTIPLIER_OPTIONS: Record<string, { value: number; label: string }[]> = {
  cake: [
    { value: 1, label: "1 ชิ้น (แบบชิ้น)" },
    { value: 8, label: "8 ชิ้น (1 ปอนด์)" },
    { value: 16, label: "16 ชิ้น (2 ปอนด์)" },
  ],
  drink: [{ value: 1, label: "1 แก้ว (ร้อน / เย็น / ปั่น)" }],
  bakery: [{ value: 1, label: "1 ชิ้น" }],
  food: [{ value: 1, label: "1 จาน/ชาม" }],
};

const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
  const [typeList, setTypeList] =
    useState<Record<string, string[]>>(DEFAULT_TYPES);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionPrice, setNewOptionPrice] = useState<number>(0);
  const [newOptionMultiplier, setNewOptionMultiplier] = useState<number>(1);
  const [showOptionsManager, setShowOptionsManager] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    category: "bakery",
    image: "",
    type: "",
    description: "",
    stockQuantity: 10,
    isAvailable: true,
    stockType: "stock" as StockType,
  });

  // ✅ Category states
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("");
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryIcon, setEditCategoryIcon] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.replace("/login");
      return;
    }
    try {
      const user = JSON.parse(userData);
      if (!user.email?.endsWith("@empbakery.com")) {
        router.replace("/");
        return;
      }
    } catch {
      router.replace("/login");
      return;
    }
    fetchProducts();
    fetchCategories();
  }, [router]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products`,
      );
      if (res.ok) setProducts(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch categories from API
  const fetchCategories = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories`,
      );
      if (res.ok) setCategories(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  // ✅ Category CRUD
  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name, icon: newCategoryIcon || "" }),
        },
      );
      const data = await res.json();
      if (data.success) {
        fetchCategories();
        setNewCategoryName("");
        setNewCategoryIcon("");
        Swal.fire({
          title: "เพิ่มหมวดหมู่สำเร็จ",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          title: data.message || "เกิดข้อผิดพลาด",
          icon: "error",
          confirmButtonColor: "#f97316",
        });
      }
    } catch {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
    }
  };

  const handleUpdateCategory = async (id: number) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editCategoryName,
            icon: editCategoryIcon,
          }),
        },
      );
      const data = await res.json();
      if (data.success) {
        fetchCategories();
        fetchProducts();
        setEditingCategory(null);
        Swal.fire({
          title: "แก้ไขสำเร็จ",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    const r = await Swal.fire({
      title: `ลบหมวดหมู่ "${name}"?`,
      text: "สินค้าในหมวดหมู่นี้จะไม่มีหมวดหมู่",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!r.isConfirmed) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${id}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();
      if (data.success) {
        fetchCategories();
        fetchProducts();
        Swal.fire({
          title: "ลบสำเร็จ",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          title: data.message,
          icon: "error",
          confirmButtonColor: "#f97316",
        });
      }
    } catch {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
    }
  };

  const isFreshProduct = (p: Product) => p.stockQuantity === FRESH_STOCK_VALUE;

  // ✅ ดึง types จากสินค้าที่มีอยู่จริงในแต่ละ category
  const getTypesForCategory = (cat: string): string[] => {
    const types = products
      .filter((p) => p.category === cat && p.type && p.type.trim() !== "")
      .map((p) => p.type);
    return [...new Set(types)].sort();
  };

  const getMultiplierOptions = (cat: string) =>
    MULTIPLIER_OPTIONS[cat] ?? MULTIPLIER_OPTIONS.bakery;

  const openModal = (mode: ModalMode, product?: Product) => {
    setModalMode(mode);
    setImageInputType("url");
    setPendingFile(null);
    setShowTypeManager(false);
    setShowOptionsManager(false);
    setNewOptionName("");
    setNewOptionPrice(0);
    setNewOptionMultiplier(1);
    if (product) {
      setSelectedProduct(product);
      const fresh = isFreshProduct(product);
      setFormData({
        name: product.name,
        price: product.price,
        category: product.category,
        image: product.image,
        type: product.type,
        description: product.description,
        stockQuantity: fresh ? 10 : product.stockQuantity,
        isAvailable: product.isAvailable,
        stockType: fresh ? "fresh" : "stock",
      });
      setImagePreview(product.image);
      setProductOptions(parseOptions(product.options));
    } else {
      setSelectedProduct(null);
      const defaultCat = categories.length > 0 ? categories[0].slug : "bakery";
      setFormData({
        name: "",
        price: 0,
        category: defaultCat,
        image: "",
        type: "",
        description: "",
        stockQuantity: 10,
        isAvailable: true,
        stockType: "stock",
      });
      setImagePreview("");
      setProductOptions([]);
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedProduct(null);
    setImagePreview("");
    setImageInputType("url");
    setPendingFile(null);
    setShowTypeManager(false);
    setShowOptionsManager(false);
    setNewTypeName("");
    setNewOptionName("");
    setNewOptionPrice(0);
    setNewOptionMultiplier(1);
    setProductOptions([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCategoryChange = (newCat: string) => {
    setFormData((prev) => {
      // ✅ ถ้า typeList ยังไม่มี key ของ newCat ให้ copy จาก product types
      if (!typeList[newCat] || typeList[newCat].length === 0) {
        const existingTypes = getTypesForCategory(newCat);
        if (existingTypes.length > 0) {
          setTypeList((prev) => ({ ...prev, [newCat]: existingTypes }));
        }
      }
      return { ...prev, category: newCat, type: "" };
    });
    setNewOptionMultiplier(1);
    setProductOptions((prev) =>
      prev.map((o) => ({ ...o, stockMultiplier: 1 })),
    );
  };

  const handleStockChange = (value: number) => {
    if (formData.stockType === "fresh") return;
    const n = Math.max(0, value);
    setFormData((prev) => ({ ...prev, stockQuantity: n, isAvailable: n > 0 }));
  };

  const handleStockTypeChange = (type: StockType) =>
    setFormData((prev) => ({
      ...prev,
      stockType: type,
      isAvailable: type === "fresh" ? true : prev.isAvailable,
    }));

  const handleAddOption = () => {
    const name = newOptionName.trim();
    if (!name) return;
    if (productOptions.find((o) => o.name === name)) {
      Swal.fire({
        title: "Option นี้มีอยู่แล้ว",
        icon: "warning",
        confirmButtonColor: "#f97316",
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }
    setProductOptions((prev) => [
      ...prev,
      {
        name,
        extraPrice: newOptionPrice,
        stockMultiplier: newOptionMultiplier,
      },
    ]);
    setNewOptionName("");
    setNewOptionPrice(0);
    setNewOptionMultiplier(1);
  };

  const handleDeleteOption = (name: string) =>
    setProductOptions((prev) => prev.filter((o) => o.name !== name));

  const handleOptionPriceChange = (name: string, price: number) =>
    setProductOptions((prev) =>
      prev.map((o) => (o.name === name ? { ...o, extraPrice: price } : o)),
    );

  const handleOptionMultiplierChange = (name: string, multiplier: number) =>
    setProductOptions((prev) =>
      prev.map((o) =>
        o.name === name
          ? { ...o, stockMultiplier: Math.max(1, multiplier) }
          : o,
      ),
    );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
        file.type,
      )
    ) {
      await Swal.fire({
        title: "ไฟล์ไม่ถูกต้อง",
        text: "กรุณาเลือกไฟล์รูปภาพ",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      await Swal.fire({
        title: "ไฟล์ใหญ่เกินไป",
        text: "ขนาดไฟล์ต้องไม่เกิน 5MB",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
      return;
    }
    setPendingFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImageFile = async (file: File): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/upload/image`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        },
      );
      if (res.ok) {
        const d = await res.json();
        return d.url || d.imageUrl;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleUrlChange = (url: string) => {
    setFormData((p) => ({ ...p, image: url }));
    setImagePreview(url);
    setPendingFile(null);
  };

  const handleAddType = () => {
    const t = newTypeName.trim();
    if (!t) return;
    const cur = typeList[formData.category] || [];
    if (cur.includes(t)) {
      Swal.fire({
        title: "ประเภทนี้มีอยู่แล้ว",
        icon: "warning",
        confirmButtonColor: "#f97316",
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }
    setTypeList((p) => ({ ...p, [formData.category]: [...cur, t] }));
    setNewTypeName("");
  };

  const handleDeleteType = async (type: string) => {
    const r = await Swal.fire({
      title: `ลบ "${type}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!r.isConfirmed) return;
    setTypeList((p) => ({
      ...p,
      [formData.category]: (p[formData.category] || []).filter(
        (x) => x !== type,
      ),
    }));
    if (formData.type === type) setFormData((p) => ({ ...p, type: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let imageUrl = formData.image;
      if (pendingFile) {
        const uploaded = await uploadImageFile(pendingFile);
        if (uploaded) {
          imageUrl = uploaded;
        } else {
          await Swal.fire({
            title: "อัพโหลดไม่สำเร็จ",
            icon: "error",
            confirmButtonColor: "#f97316",
          });
          setSaving(false);
          return;
        }
      }
      if (!imageUrl) {
        await Swal.fire({
          title: "กรุณาเลือกรูปภาพ",
          icon: "warning",
          confirmButtonColor: "#f97316",
        });
        setSaving(false);
        return;
      }
      const finalStock =
        formData.stockType === "fresh"
          ? FRESH_STOCK_VALUE
          : formData.stockQuantity;
      const finalAvail =
        formData.stockType === "fresh" ? true : formData.stockQuantity > 0;
      const optionsJson =
        productOptions.length > 0 ? JSON.stringify(productOptions) : null;
      const dataToSubmit = {
        ...formData,
        image: imageUrl,
        stockQuantity: finalStock,
        isAvailable: finalAvail,
        options: optionsJson,
      };
      const token = localStorage.getItem("token");
      const url =
        modalMode === "create"
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/products`
          : `${process.env.NEXT_PUBLIC_API_URL}/api/products/${selectedProduct?.id}`;
      const res = await fetch(url, {
        method: modalMode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSubmit),
      });
      if (res.ok) {
        fetchProducts();
        closeModal();
        await Swal.fire({
          title: "สำเร็จ!",
          text:
            modalMode === "create"
              ? "เพิ่มสินค้าสำเร็จ!"
              : "แก้ไขสินค้าสำเร็จ!",
          icon: "success",
          confirmButtonColor: "#f97316",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        const d = await res.json();
        await Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: d.message || "กรุณาลองใหม่",
          icon: "error",
          confirmButtonColor: "#f97316",
        });
      }
    } catch {
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const r = await Swal.fire({
      title: "ลบสินค้า?",
      text: "ต้องการลบสินค้านี้หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!r.isConfirmed) return;
    const token = localStorage.getItem("token");
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/products/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (res.ok) {
      fetchProducts();
      await Swal.fire({
        title: "ลบสำเร็จ!",
        icon: "success",
        confirmButtonColor: "#f97316",
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        icon: "error",
        confirmButtonColor: "#f97316",
      });
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterCategory === "all" || p.category === filterCategory),
  );

  const CATEGORY_COLORS = [
    "bg-amber-100 text-amber-700",
    "bg-pink-100 text-pink-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-red-100 text-red-700",
    "bg-purple-100 text-purple-700",
    "bg-orange-100 text-orange-700",
    "bg-teal-100 text-teal-700",
  ];

  const getCategoryBadge = (c: string) => {
    const idx = categories.findIndex((cat) => cat.slug === c);
    return CATEGORY_COLORS[idx >= 0 ? idx % CATEGORY_COLORS.length : 0];
  };

  const getCategoryDisplay = (p: Product) => {
    const cat = categories.find((c) => c.slug === p.category);
    return cat ? `${cat.icon} ${cat.name}` : p.category;
  };

  const getStockDisplay = (p: Product) => {
    if (isFreshProduct(p))
      return { text: "🥤 ทำสด", className: "text-teal-600 bg-teal-50" };
    if (p.stockQuantity === 0)
      return { text: "0", className: "text-red-600 bg-red-50" };
    if (p.stockQuantity <= 5)
      return {
        text: String(p.stockQuantity),
        className: "text-orange-600 bg-orange-50",
      };
    if (p.stockQuantity <= 10)
      return {
        text: String(p.stockQuantity),
        className: "text-yellow-600 bg-yellow-50",
      };
    return {
      text: String(p.stockQuantity),
      className: "text-green-600 bg-green-50",
    };
  };

  const getAvailabilityStatus = (p: Product) => {
    if (isFreshProduct(p))
      return { text: "✓ ทำสด", className: "bg-teal-100 text-teal-700" };
    if (p.stockQuantity === 0)
      return { text: "✗ หมด", className: "bg-red-100 text-red-700" };
    if (p.isAvailable)
      return { text: "✓ พร้อมขาย", className: "bg-green-100 text-green-700" };
    return { text: "⏸ ปิดขาย", className: "bg-gray-100 text-gray-700" };
  };

  const currentMultiplierOptions = getMultiplierOptions(formData.category);
  const isCakeCategory = formData.category === "cake";

  if (loading)
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-amber-600 font-medium">กำลังโหลด...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-amber-50 py-6 md:py-8 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-amber-800 flex items-center gap-3">
              <span className="text-3xl md:text-4xl">📦</span> Manage Products
            </h1>
            <p className="text-amber-600 mt-1 text-sm md:text-base">
              สินค้าทั้งหมด {products.length} รายการ
            </p>
          </div>
          <button
            onClick={() => openModal("create")}
            className="px-4 md:px-6 py-2.5 md:py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm md:text-base shrink-0"
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

        {/* ✅ Category Manager */}
        <div className="bg-white rounded-2xl shadow-md mb-6 overflow-hidden">
          <button
            onClick={() => setShowCategoryManager((v) => !v)}
            className="w-full flex items-center justify-between px-4 md:px-6 py-3 md:py-4 hover:bg-amber-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🏷️</span>
              <span className="font-medium text-amber-800 text-sm md:text-base">
                จัดการหมวดหมู่
              </span>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {categories.length}
              </span>
            </div>
            <span className="text-amber-500 text-sm">
              {showCategoryManager ? "▲ ซ่อน" : "▼ แสดง"}
            </span>
          </button>

          {showCategoryManager && (
            <div className="px-4 md:px-6 pb-4 md:pb-5 border-t border-amber-100">
              <div className="flex gap-2 mt-4 mb-4">
                <input
                  type="text"
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  placeholder="icon"
                  className="w-16 px-2 py-2 text-center text-lg border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), handleAddCategory())
                  }
                  placeholder="ชื่อหมวดหมู่ใหม่ (เช่น Snack)"
                  className="flex-1 px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  + เพิ่ม
                </button>
              </div>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-3 bg-amber-50 rounded-xl px-4 py-3"
                  >
                    {editingCategory === cat.id ? (
                      <>
                        <input
                          type="text"
                          value={editCategoryIcon}
                          onChange={(e) => setEditCategoryIcon(e.target.value)}
                          className="w-12 px-1 py-1 text-center text-lg border border-amber-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm border border-amber-300 rounded-lg"
                        />
                        <button
                          onClick={() => handleUpdateCategory(cat.id)}
                          className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium"
                        >
                          ✓ บันทึก
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
                        >
                          ยกเลิก
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xl w-8 text-center">
                          {cat.icon}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-800">
                            {cat.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            slug: {cat.slug} · ลำดับ: {cat.displayOrder}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {
                            products.filter((p) => p.category === cat.slug)
                              .length
                          }{" "}
                          สินค้า
                        </span>
                        <button
                          onClick={() => {
                            setEditingCategory(cat.id);
                            setEditCategoryName(cat.name);
                            setEditCategoryIcon(cat.icon || "");
                          }}
                          className="p-1.5 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl p-3 md:p-4 mb-6 shadow-md flex flex-col md:flex-row gap-3 md:gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="ค้นหาสินค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 md:py-3 pl-10 md:pl-12 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm md:text-base"
            />
            <svg
              className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-amber-400"
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
          {/* ✅ Dynamic category filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 md:py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm md:text-base"
          >
            <option value="all">ทุกหมวดหมู่</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-amber-500">
                  {[
                    "รูปภาพ",
                    "ชื่อสินค้า",
                    "หมวดหมู่",
                    "ราคา",
                    "Stock",
                    "สถานะ",
                    "จัดการ",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-white ${i === 2 ? "hidden md:table-cell text-left" : i === 5 ? "hidden lg:table-cell text-left" : i === 6 ? "text-center" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => {
                  const status = getAvailabilityStatus(product);
                  const stockDisplay = getStockDisplay(product);
                  const opts = parseOptions(product.options);
                  return (
                    <tr
                      key={product.id}
                      className={`border-b border-amber-100 hover:bg-amber-50 ${index % 2 === 0 ? "bg-white" : "bg-amber-50/50"}`}
                    >
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg"
                        />
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <p className="font-medium text-amber-800 text-sm md:text-base">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500">{product.type}</p>
                        {opts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5 max-w-[280px]">
                            {opts.slice(0, 3).map((o) => (
                              <span
                                key={o.name}
                                className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-full"
                              >
                                {o.name}
                                {o.extraPrice > 0 && (
                                  <span className="text-green-600 ml-0.5">
                                    +฿{o.extraPrice}
                                  </span>
                                )}
                              </span>
                            ))}
                            {opts.length > 3 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                                +{opts.length - 3} อื่นๆ
                              </span>
                            )}
                          </div>
                        )}
                        <span
                          className={`md:hidden inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryBadge(product.category)}`}
                        >
                          {getCategoryDisplay(product)}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 hidden md:table-cell">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryBadge(product.category)}`}
                        >
                          {getCategoryDisplay(product)}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 font-semibold text-amber-600 text-sm">
                        ฿{formatPrice(product.price)}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <span
                          className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${stockDisplay.className}`}
                        >
                          {stockDisplay.text}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 hidden lg:table-cell">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${status.className}`}
                        >
                          {status.text}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center justify-center gap-1 md:gap-2">
                          <button
                            onClick={() => openModal("view", product)}
                            className="p-1.5 md:p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            <svg
                              className="w-3.5 h-3.5 md:w-4 md:h-4"
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
                            className="p-1.5 md:p-2 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors"
                          >
                            <svg
                              className="w-3.5 h-3.5 md:w-4 md:h-4"
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
                            className="p-1.5 md:p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <svg
                              className="w-3.5 h-3.5 md:w-4 md:h-4"
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
            <div className="flex items-center justify-between p-4 md:p-6 border-b bg-amber-500 rounded-t-2xl">
              <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
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

            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
              <div className="flex justify-center">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-28 h-28 md:w-32 md:h-32 object-cover rounded-xl border-2 border-amber-200"
                  />
                ) : (
                  <div className="w-28 h-28 md:w-32 md:h-32 bg-amber-50 rounded-xl border-2 border-dashed border-amber-300 flex items-center justify-center">
                    <span className="text-4xl">📷</span>
                  </div>
                )}
              </div>
              {pendingFile && (
                <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 py-2 rounded-lg">
                  <span>📎</span>
                  <span>{pendingFile.name}</span>
                </div>
              )}

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
                  className="w-full px-4 py-2.5 md:py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 text-sm md:text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    หมวดหมู่ *
                  </label>
                  {/* ✅ Dynamic categories from API */}
                  <select
                    value={formData.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    disabled={modalMode === "view"}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 text-sm md:text-base"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      ประเภท *
                    </label>
                    {modalMode !== "view" && (
                      <button
                        type="button"
                        onClick={() => setShowTypeManager((v) => !v)}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium underline"
                      >
                        {showTypeManager ? "ซ่อน" : "⚙️ จัดการ"}
                      </button>
                    )}
                  </div>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    disabled={modalMode === "view"}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 text-sm md:text-base"
                  >
                    <option value="">-- เลือก --</option>
                    {[
                      ...new Set([
                        ...(typeList[formData.category] || []),
                        ...getTypesForCategory(formData.category),
                      ]),
                    ]
                      .sort()
                      .map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {showTypeManager && modalMode !== "view" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-amber-800">
                    จัดการประเภท — {formData.category}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), handleAddType())
                      }
                      placeholder="ชื่อประเภทใหม่"
                      className="flex-1 px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddType}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      + เพิ่ม
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ...new Set([
                        ...(typeList[formData.category] || []),
                        ...getTypesForCategory(formData.category),
                      ]),
                    ]
                      .sort()
                      .map((t) => (
                        <div
                          key={t}
                          className="flex items-center gap-1 bg-white border border-amber-200 rounded-full px-3 py-1"
                        >
                          <span className="text-xs text-gray-700">{t}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteType(t)}
                            className="text-red-400 hover:text-red-600 ml-1 text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 md:gap-4">
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
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 text-sm md:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ประเภทสต็อก
                  </label>
                  {modalMode === "view" ? (
                    <div
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium text-center ${formData.stockType === "fresh" ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700"}`}
                    >
                      {formData.stockType === "fresh"
                        ? "🥤 ทำสด"
                        : "📦 มีสต็อก"}
                    </div>
                  ) : (
                    <div className="flex gap-1.5 h-[46px]">
                      <button
                        type="button"
                        onClick={() => handleStockTypeChange("stock")}
                        className={`flex-1 rounded-xl text-xs font-medium transition-all ${formData.stockType === "stock" ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"}`}
                      >
                        📦 สต็อก
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStockTypeChange("fresh")}
                        className={`flex-1 rounded-xl text-xs font-medium transition-all ${formData.stockType === "fresh" ? "bg-teal-500 text-white" : "bg-teal-50 text-teal-600 border border-teal-200 hover:bg-teal-100"}`}
                      >
                        🥤 ทำสด
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {formData.stockType === "stock" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    จำนวน Stock *
                  </label>
                  <input
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => handleStockChange(Number(e.target.value))}
                    disabled={modalMode === "view"}
                    required
                    min="0"
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 text-sm md:text-base"
                  />
                  {formData.stockQuantity === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      ⚠️ สถานะจะเปลี่ยนเป็น "สินค้าหมด" อัตโนมัติ
                    </p>
                  )}
                </div>
              )}
              {formData.stockType === "fresh" && modalMode !== "view" && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <span className="text-teal-500 text-lg">🥤</span>
                  <p className="text-sm text-teal-700">
                    สินค้าทำสด — พร้อมขายตลอดเวลา ไม่มีการนับ Stock
                  </p>
                </div>
              )}

              {/* Options Manager */}
              <div className="border border-purple-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-purple-50">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-600">🎛️</span>
                    <label className="text-sm font-medium text-purple-800">
                      ตัวเลือกสินค้า (Options)
                    </label>
                    {productOptions.length > 0 && (
                      <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">
                        {productOptions.length} ตัวเลือก
                      </span>
                    )}
                  </div>
                  {modalMode !== "view" && (
                    <button
                      type="button"
                      onClick={() => setShowOptionsManager((v) => !v)}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium underline"
                    >
                      {showOptionsManager ? "ซ่อน" : "⚙️ จัดการ"}
                    </button>
                  )}
                </div>
                {productOptions.length > 0 && (
                  <div className="px-4 py-3 flex flex-wrap gap-2 bg-white border-t border-purple-100">
                    {productOptions.map((o) => (
                      <div
                        key={o.name}
                        className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-full px-3 py-1"
                      >
                        <span className="text-xs text-purple-700 font-medium">
                          {o.name}
                        </span>
                        {o.extraPrice > 0 && (
                          <span className="text-xs text-green-600">
                            +฿{o.extraPrice}
                          </span>
                        )}
                        {(o.stockMultiplier ?? 1) > 1 && (
                          <span className="text-xs text-blue-500 font-medium">
                            ลด {o.stockMultiplier} ชิ้น
                          </span>
                        )}
                        {modalMode !== "view" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(o.name)}
                            className="text-red-400 hover:text-red-600 text-xs font-bold ml-0.5"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {showOptionsManager && modalMode !== "view" && (
                  <div className="px-4 pb-4 pt-3 space-y-4 border-t border-purple-100 bg-white">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-purple-700">
                        ➕ เพิ่มตัวเลือกใหม่
                      </p>
                      <input
                        type="text"
                        value={newOptionName}
                        onChange={(e) => setNewOptionName(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          (e.preventDefault(), handleAddOption())
                        }
                        placeholder={
                          formData.category === "drink"
                            ? "เช่น ร้อน, เย็น, ปั่น"
                            : formData.category === "cake"
                              ? "เช่น แบบชิ้น, 1 ปอนด์ (8 ชิ้น), 2 ปอนด์ (16 ชิ้น)"
                              : formData.category === "food"
                                ? "เช่น ต้ม, ผัด, นึ่ง, ทอด, พื้นบ้าน"
                                : "ชื่อตัวเลือก"
                        }
                        className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">
                            ราคาเพิ่มเติม
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              ฿
                            </span>
                            <input
                              type="number"
                              value={newOptionPrice}
                              onChange={(e) =>
                                setNewOptionPrice(Number(e.target.value))
                              }
                              min={0}
                              placeholder="0"
                              className="w-full pl-7 pr-3 py-2 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">
                            ลด stock ต่อออเดอร์
                          </label>
                          {isCakeCategory ? (
                            <select
                              value={newOptionMultiplier}
                              onChange={(e) =>
                                setNewOptionMultiplier(Number(e.target.value))
                              }
                              className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                              {currentMultiplierOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-500 flex items-center gap-1.5">
                              <span className="text-blue-400 text-base">✓</span>
                              <span>{currentMultiplierOptions[0]?.label}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={handleAddOption}
                            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                          >
                            + เพิ่ม
                          </button>
                        </div>
                      </div>
                    </div>
                    {productOptions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-amber-800">
                          ✏️ แก้ไขตัวเลือก
                        </p>
                        {productOptions.map((o) => (
                          <div
                            key={o.name}
                            className="bg-gray-50 rounded-xl p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-purple-700">
                                {o.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteOption(o.name)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">
                                  ราคาเพิ่มเติม
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                    ฿
                                  </span>
                                  <input
                                    type="number"
                                    value={o.extraPrice}
                                    onChange={(e) =>
                                      handleOptionPriceChange(
                                        o.name,
                                        Number(e.target.value),
                                      )
                                    }
                                    min={0}
                                    className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">
                                  ลด stock ต่อออเดอร์
                                </label>
                                {isCakeCategory ? (
                                  <select
                                    value={o.stockMultiplier ?? 1}
                                    onChange={(e) =>
                                      handleOptionMultiplierChange(
                                        o.name,
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-full px-3 py-1.5 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  >
                                    {currentMultiplierOptions.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-500 flex items-center gap-1.5">
                                    <span className="text-blue-400 text-base">
                                      ✓
                                    </span>
                                    <span>
                                      {currentMultiplierOptions[0]?.label}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {productOptions.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">
                        ยังไม่มี option — กด "+ เพิ่ม" เพื่อเริ่มต้น
                      </p>
                    )}
                  </div>
                )}
                {productOptions.length === 0 && !showOptionsManager && (
                  <div className="px-4 py-3 bg-white border-t border-purple-100">
                    <p className="text-xs text-gray-400">
                      {modalMode === "view"
                        ? "ไม่มีตัวเลือก"
                        : "ไม่มีตัวเลือก — กด ⚙️ จัดการ เพื่อเพิ่ม"}
                    </p>
                  </div>
                )}
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รูปภาพ *
                </label>
                {modalMode !== "view" && (
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setImageInputType("url")}
                      className={`flex-1 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${imageInputType === "url" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
                    >
                      🔗 URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputType("file")}
                      className={`flex-1 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${imageInputType === "file" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
                    >
                      📁 อัพโหลด
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
                    className="w-full px-4 py-2.5 md:py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 text-sm md:text-base"
                  />
                )}
                {imageInputType === "file" && modalMode !== "view" && (
                  <div>
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
                      className="w-full flex flex-col items-center justify-center px-4 py-5 bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl cursor-pointer hover:bg-amber-100 hover:border-amber-400 transition-all"
                    >
                      <svg
                        className="w-8 md:w-10 h-8 md:h-10 text-amber-400 mb-2"
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
                      <span className="text-amber-600 font-medium text-sm">
                        คลิกเพื่อเลือกไฟล์
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        JPG, PNG, GIF, WEBP
                      </span>
                    </label>
                  </div>
                )}
                {modalMode === "view" && (
                  <div className="px-4 py-3 bg-gray-100 rounded-xl text-amber-800 text-sm break-all">
                    {formData.image}
                  </div>
                )}
              </div>

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
                  className="w-full px-4 py-2.5 md:py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 resize-none text-sm md:text-base"
                />
              </div>

              {modalMode !== "view" ? (
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-gray-100 text-amber-800 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm md:text-base"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={saving || (!formData.image && !pendingFile)}
                    className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm md:text-base"
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
              ) : (
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-gray-100 text-amber-800 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm md:text-base"
                  >
                    ปิด
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal("edit", selectedProduct!)}
                    className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm md:text-base"
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
