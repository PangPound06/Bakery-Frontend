"use client";

import { useStoreStatus } from "@/lib/useStoreStatus";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cartUrl } from "@/lib/cart";

interface ProductOption {
  name: string;
  extraPrice: number;
}

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
  options?: string | null;
}

interface ProductDetailProps {
  category: string;
  categoryIcon: string;
  categoryLabel: string;
}

const FRESH_STOCK_VALUE = 9999;
const FRESH_MAX_QTY = 10;
const isFreshProduct = (p: Product) => p.stockQuantity === FRESH_STOCK_VALUE;
const parseOptions = (optionsStr?: string | null): ProductOption[] => {
  if (!optionsStr) return [];
  try {
    return JSON.parse(optionsStr);
  } catch {
    return [];
  }
};

// ✅ cake size config
const cakeSizeConfig = {
  slice: { label: "แบบชิ้น", deduct: 1, multiplier: 1 },
  "1lb": { label: "1 ปอนด์ (8 ชิ้น)", deduct: 8, multiplier: 8 },
  "2lb": { label: "2 ปอนด์ (16 ชิ้น)", deduct: 16, multiplier: 16 },
};

const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function ProductDetail({
  category,
  categoryIcon,
  categoryLabel,
}: ProductDetailProps) {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ProductOption | null>(
    null,
  );
  const [cakeSize, setCakeSize] = useState<"slice" | "1lb" | "2lb">("slice");

  // ✅ declare unit ใน component scope — ใช้ได้ทั้ง handleAddToCart และ render
  const unit =
    category === "drink" ? "แก้ว" : category === "food" ? "จาน" : "ชิ้น";

  const checkFavorite = async (productId: number) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = user.id || user.userId;
      if (!userId) return;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/favorites/check/${userId}/${productId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setIsFavorite(data.isFavorite);
      }
    } catch {}
  };

  const toggleFavorite = async () => {
    if (!product || togglingFav) return;
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = user.id || user.userId;
    if (!userId) return;
    setTogglingFav(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/favorites/toggle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            productId: product.id,
            productName: product.name,
            productImage: product.image,
            price: product.price,
            category: product.category,
            type: product.type,
          }),
        },
      );
      const data = await response.json();
      if (data.success) setIsFavorite(data.action === "added");
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingFav(false);
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productName = (params.name as string).replace(/-/g, " ");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/products/category/${category}`,
        );
        if (response.ok) {
          const data = await response.json();
          const found = data.find(
            (item: Product) =>
              item.name.toLowerCase() === productName.toLowerCase(),
          );
          if (found) {
            setProduct(found);
            checkFavorite(found.id);
          } else setError("ไม่พบสินค้า");
        } else setError("ไม่สามารถโหลดข้อมูลได้");
      } catch {
        setError("ไม่สามารถเชื่อมต่อ server ได้");
      } finally {
        setLoading(false);
      }
    };
    if (params.name) fetchProduct();
  }, [params.name, category]);

  useEffect(() => {
    if (!product) return;
    const opts = parseOptions(product.options);
    if (opts.length === 1) setSelectedOption(opts[0]);
  }, [product]);

  const { blockOnline } = useStoreStatus();

  const handleAddToCart = async () => {
    if (!product || adding || added) return;

    const isCake = category === "cake";
    const fresh = isFreshProduct(product);

    const productOptions = parseOptions(product.options);
    if (productOptions.length > 0 && !isCake && !selectedOption) {
      setError("กรุณาเลือกตัวเลือกก่อนเพิ่มลงตะกร้า");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // ✅ เช็ค fresh product
    if (fresh) {
      const cartRes = await fetch(cartUrl(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!cartRes.ok) {
        setError("ไม่สามารถเช็คตะกร้าได้");
        return;
      }
      const cartText = await cartRes.text();
      const cartData: { items?: { productId: number; quantity: number }[] } =
        cartText ? JSON.parse(cartText) : { items: [] };
      const totalInCart =
        cartData.items
          ?.filter((i) => i.productId === product.id)
          .reduce((sum, i) => sum + i.quantity, 0) ?? 0;
      if (totalInCart + quantity > 10) {
        setError(
          `สินค้าทำสดสั่งได้รวมสูงสุด 10 ${unit} (ในตะกร้ามีแล้ว ${totalInCart} ${unit})`,
        );
        return;
      }
    }

    setAdding(true);
    setError("");
    try {
      const isCake = category === "cake";
      const sizeConfig = cakeSizeConfig[cakeSize];
      const basePrice = product.price + (selectedOption?.extraPrice ?? 0);
      const finalPrice = isCake ? basePrice * sizeConfig.multiplier : basePrice;
      const actualQuantity = isCake ? sizeConfig.deduct * quantity : quantity;
      const optionLabel = isCake
        ? `${sizeConfig.label}${selectedOption ? ` - ${selectedOption.name}` : ""}`
        : selectedOption
          ? selectedOption.name
          : null;

      const response = await fetch(
        cartUrl("/add"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: product.id,
            name: product.name,
            price: finalPrice,
            category: product.category,
            image: product.image,
            quantity: actualQuantity,
            selectedOption: optionLabel,
          }),
        },
      );
      const data = await response.json();
      if (response.ok) {
        setAdded(true);
        if (!isFreshProduct(product)) {
          setProduct((prev) =>
            prev
              ? { ...prev, stockQuantity: prev.stockQuantity - actualQuantity }
              : null,
          );
        }
        window.dispatchEvent(new Event("cartUpdated"));
        setTimeout(() => setAdded(false), 2000);
      } else setError(data.error || "เกิดข้อผิดพลาด");
    } catch {
      setError("ไม่สามารถเชื่อมต่อ server ได้");
    } finally {
      setAdding(false);
    }
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

  if (!product)
    return (
      <div className="min-h-screen bg-cream    flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold text-body mb-2">
            ไม่พบสินค้า
          </h2>
          <p className="text-muted mb-6">
            สินค้าที่คุณกำลังมองหาอาจถูกลบหรือไม่มีอยู่
          </p>
          <Link
            href={`/${category}`}
            className="px-6 py-3 bg-brick text-white rounded-full hover:bg-brick-hover transition-colors font-medium"
          >
            ← กลับหน้า {categoryLabel}
          </Link>
        </div>
      </div>
    );

  const fresh = isFreshProduct(product);
  const isOutOfStock = fresh
    ? false
    : product.stockQuantity <= 0 || !product.isAvailable;
  const productOptions = parseOptions(product.options);
  const hasOptions = productOptions.length > 0;

  // ✅ คำนวณตาม cakeSize
  const isCake = category === "cake";
  const sizeConfig = cakeSizeConfig[cakeSize];
  const pricePerOrder = isCake
    ? product.price * sizeConfig.multiplier
    : product.price + (selectedOption?.extraPrice ?? 0);
  const cakeMaxQty =
    isCake && !fresh
      ? Math.floor(product.stockQuantity / sizeConfig.deduct)
      : fresh
        ? FRESH_MAX_QTY
        : product.stockQuantity;
  const maxQuantity = cakeMaxQty;

  return (
    <div className="min-h-screen bg-cream   ">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="hover:text-brick transition-colors">
            หน้าหลัก
          </Link>
          <span>/</span>
          <Link
            href={`/${category}`}
            className="hover:text-brick transition-colors"
          >
            {categoryIcon} {categoryLabel}
          </Link>
          <span>/</span>
          <span className="text-body font-medium">{product.name}</span>
        </nav>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-[32px] border border-line overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="relative">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-[400px] lg:h-full object-cover"
              />
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="bg-error text-white px-6 py-3 rounded-xl text-xl font-bold">
                    สินค้าหมด
                  </span>
                </div>
              )}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className="bg-brick text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                  {product.type}
                </span>
                <span className="bg-white/90 backdrop-blur text-body px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                  {categoryIcon} {product.category}
                </span>
              </div>
              {!fresh &&
                product.stockQuantity > 0 &&
                product.stockQuantity <= 5 && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-error text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg animate-pulse">
                      เหลือ {product.stockQuantity} ชิ้น!
                    </span>
                  </div>
                )}
            </div>

            <div className="p-8 lg:p-10 flex flex-col">
              <h1 className="font-display text-3xl lg:text-[40px] leading-tight font-bold text-ink mb-3">
                {product.name}
              </h1>

              <div className="flex items-center gap-4 mb-6">
                <span className="text-3xl font-bold text-ink">
                  ฿{formatPrice(pricePerOrder)}
                  {selectedOption?.extraPrice ? (
                    <span className="text-lg text-ok ml-1">
                      (+฿{selectedOption.extraPrice})
                    </span>
                  ) : null}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${isOutOfStock ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}
                >
                  {isOutOfStock ? "สินค้าหมด" : "พร้อมขาย"}
                </span>
                <button
                  onClick={toggleFavorite}
                  disabled={togglingFav}
                  className={`ml-auto w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md ${isFavorite ? "bg-danger-soft hover:bg-danger-soft" : "bg-sand hover:bg-sand"} disabled:opacity-50`}
                  title={
                    isFavorite ? "ลบออกจากรายการโปรด" : "เพิ่มเข้ารายการโปรด"
                  }
                >
                  <span className="text-2xl">{isFavorite ? "❤️" : "🤍"}</span>
                </button>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-body mb-2">
                  📝 รายละเอียดสินค้า
                </h3>
                <p className="text-ink leading-relaxed">
                  {product.description || "ไม่มีรายละเอียดเพิ่มเติม"}
                </p>
              </div>

              {/* ✅ ซ่อน Options selector ถ้าเป็น Cake */}
              {hasOptions && !isCake && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-body mb-3">
                    🎛️ เลือกตัวเลือก <span className="text-error">*</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {productOptions.map((o) => (
                      <button
                        key={o.name}
                        type="button"
                        onClick={() => setSelectedOption(o)}
                        className={`flex flex-col items-center justify-center px-3 py-3 rounded-xl border-2 transition-all ${selectedOption?.name === o.name ? "border-brick bg-warn-bg" : "border-line hover:border-line-strong hover:bg-warn-bg/50"}`}
                      >
                        <span className="font-semibold text-body text-sm">
                          {o.name}
                        </span>
                        <span
                          className={`text-xs mt-0.5 ${o.extraPrice > 0 ? "text-ok font-medium" : "text-muted"}`}
                        >
                          {o.extraPrice > 0 ? `+฿${o.extraPrice}` : "ราคาเดิม"}
                        </span>
                      </button>
                    ))}
                  </div>
                  {!selectedOption && (
                    <p className="text-xs text-brick mt-2">
                      ⚠️ กรุณาเลือกตัวเลือกก่อนสั่ง
                    </p>
                  )}
                </div>
              )}

              {/* ✅ เลือกขนาดเค้ก — เฉพาะ category cake */}
              {isCake && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-body mb-3">
                    🎂 เลือกขนาด
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(["slice", "1lb", "2lb"] as const).map((size) => {
                      const cfg = cakeSizeConfig[size];
                      const maxForSize = fresh
                        ? FRESH_MAX_QTY
                        : Math.floor(product.stockQuantity / cfg.deduct);
                      const outOfStock = !fresh && maxForSize <= 0;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setCakeSize(size);
                            setQuantity(1);
                          }}
                          disabled={outOfStock}
                          className={`flex flex-col items-center justify-center px-3 py-3 rounded-xl border-2 transition-all ${
                            cakeSize === size
                              ? "border-brick bg-warn-bg"
                              : outOfStock
                                ? "border-line bg-sand opacity-40 cursor-not-allowed"
                                : "border-line hover:border-line-strong hover:bg-warn-bg/50"
                          }`}
                        >
                          <span className="font-semibold text-body text-sm text-center leading-tight">
                            {cfg.label}
                          </span>
                          <span className="text-xs text-ok font-medium mt-0.5">
                            ฿{formatPrice(product.price * cfg.multiplier)}
                          </span>
                          {!fresh && (
                            <span className="text-[10px] text-muted mt-0.5">
                              {outOfStock
                                ? "หมด"
                                : `สั่งได้ ${maxForSize} ออเดอร์`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-warn-bg rounded-xl p-4 text-center">
                  <p className="text-sm text-muted mb-1">หมวดหมู่</p>
                  <p className="font-semibold text-brick capitalize">
                    {categoryIcon} {product.category}
                  </p>
                </div>
                <div className="bg-warn-bg rounded-xl p-4 text-center">
                  <p className="text-sm text-muted mb-1">ประเภท</p>
                  <p className="font-semibold text-brick">{product.type}</p>
                </div>
                <div className="bg-warn-bg rounded-xl p-4 text-center">
                  <p className="text-sm text-muted mb-1">คงเหลือ</p>
                  {fresh ? (
                    <p className="font-semibold text-ok">🍽️ ทำสด</p>
                  ) : (
                    <p
                      className={`font-semibold ${product.stockQuantity <= 5 ? "text-error" : "text-ok"}`}
                    >
                      {product.stockQuantity} ชิ้น
                    </p>
                  )}
                </div>
                <div className="bg-warn-bg rounded-xl p-4 text-center">
                  <p className="text-sm text-muted mb-1">สถานะ</p>
                  <p
                    className={`font-semibold ${isOutOfStock ? "text-error" : "text-ok"}`}
                  >
                    {isOutOfStock ? "❌ หมด" : "✅ พร้อมขาย"}
                  </p>
                </div>
              </div>

              <div className="mt-auto">
                {error && (
                  <div className="mb-4 p-3 bg-danger-soft text-error rounded-xl text-center text-sm">
                    ⚠️ {error}
                  </div>
                )}

                {!isOutOfStock && (
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-body font-medium">จำนวน:</span>
                    <div className="flex items-center border-2 border-line-strong rounded-xl overflow-hidden">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-4 py-2 bg-warn-bg hover:bg-warn-soft text-body font-bold text-lg transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        min={1}
                        max={maxQuantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val))
                            setQuantity(
                              Math.min(maxQuantity, Math.max(1, val)),
                            );
                        }}
                        className="w-16 py-2 font-bold text-body text-center focus:outline-none bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() =>
                          setQuantity(Math.min(maxQuantity, quantity + 1))
                        }
                        className="px-4 py-2 bg-warn-bg hover:bg-warn-soft text-body font-bold text-lg transition-colors"
                      >
                        +
                      </button>
                    </div>
                    {/* ✅ ใช้ unit จาก component scope */}
                    <span className="text-sm text-muted">
                      {fresh
                        ? `(สูงสุด ${FRESH_MAX_QTY} ${unit})`
                        : `(สูงสุด ${maxQuantity} ออเดอร์)`}
                    </span>
                  </div>
                )}

                <button
                  onClick={handleAddToCart}
                  disabled={
                    blockOnline ||
                    adding ||
                    added ||
                    isOutOfStock ||
                    (hasOptions && !isCake && !selectedOption)
                  }
                  className={`w-full min-h-14 rounded-full font-semibold text-[17px] transition-all duration-200 flex items-center justify-center gap-3 ${
                    added
                      ? "bg-ok text-white"
                      : blockOnline ||
                          adding ||
                          isOutOfStock ||
                          (hasOptions && !isCake && !selectedOption)
                        ? "bg-line text-muted cursor-not-allowed"
                        : "bg-brick hover:bg-brick-hover text-white"
                  }`}
                >
                  {blockOnline ? (
                    <span>ปิดรับออเดอร์ออนไลน์ชั่วคราว</span>
                  ) : adding ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>กำลังเพิ่ม...</span>
                    </>
                  ) : added ? (
                    <>
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>เพิ่มลงตะกร้าแล้ว!</span>
                    </>
                  ) : isOutOfStock ? (
                    <span>สินค้าหมด</span>
                  ) : hasOptions && !isCake && !selectedOption ? (
                    <span>กรุณาเลือกตัวเลือกก่อน</span>
                  ) : (
                    <>
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
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span>
                        เพิ่มลงตะกร้า — ฿{formatPrice(pricePerOrder * quantity)}
                      </span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => router.back()}
                  className="w-full mt-3 min-h-12 rounded-full font-semibold text-ink border-[1.5px] border-ink hover:bg-ink/5 transition-colors"
                >
                  ← ย้อนกลับ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}