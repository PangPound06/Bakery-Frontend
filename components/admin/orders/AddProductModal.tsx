"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchProducts } from "./orderApi";
import { formatPrice, parseOptions } from "./orderUtils";
import type { Product, ProductOption } from "./types";

/** stock 9999 = สินค้าไม่จำกัดจำนวน */
const UNLIMITED_STOCK = 9999;

const isSellable = (p: Product) => p.isAvailable && (p.stockQuantity > 0 || p.stockQuantity === UNLIMITED_STOCK);

interface Props {
  onClose: () => void;
  /** @returns true = เพิ่มสำเร็จ ปิดโมดัล */
  onAdd: (product: Product, option: ProductOption | null) => Promise<boolean>;
}

/** เลือกสินค้าที่จะเพิ่มเข้า order (ครั้งละ 1 ออเดอร์) — สินค้าที่มีตัวเลือกจะถามตัวเลือกก่อน */
export default function AddProductModal({ onClose, onAdd }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [choosingOptionFor, setChoosingOptionFor] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const categories = useMemo(() => ["all", ...Array.from(new Set(products.map((p) => p.category)))], [products]);

  const visible = useMemo(() => {
    const keyword = search.toLowerCase();
    return products.filter(
      (p) =>
        isSellable(p) &&
        p.name.toLowerCase().includes(keyword) &&
        (category === "all" || p.category === category),
    );
  }, [products, search, category]);

  const add = async (product: Product, option: ProductOption | null) => {
    if (await onAdd(product, option)) onClose();
  };

  const pick = (product: Product) => {
    if (parseOptions(product.options).length > 0) setChoosingOptionFor(product);
    else add(product, null);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-amber-500 text-white px-5 py-4 rounded-t-2xl flex items-center justify-between">
            <h3 className="font-bold text-lg">➕ เพิ่มสินค้า</h3>
            <button onClick={onClose} className="hover:bg-amber-600 p-1.5 rounded-lg" aria-label="ปิด">
              ✕
            </button>
          </div>

          <div className="p-4 border-b">
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex gap-1.5 px-3 py-2 border-b overflow-x-auto scrollbar-hide flex-shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  category === cat
                    ? "bg-amber-500 text-white"
                    : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                {cat === "all" ? "ทั้งหมด" : cat}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {visible.map((product) => (
              <ProductButton key={product.id} product={product} onPick={pick} />
            ))}
            {visible.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">ไม่พบสินค้า</div>}
          </div>
        </div>
      </div>

      {choosingOptionFor && (
        <OptionPicker
          product={choosingOptionFor}
          onCancel={() => setChoosingOptionFor(null)}
          onConfirm={(option) => {
            setChoosingOptionFor(null);
            add(choosingOptionFor, option);
          }}
        />
      )}
    </>
  );
}

function ProductButton({ product, onPick }: { product: Product; onPick: (product: Product) => void }) {
  const options = parseOptions(product.options);
  return (
    <button
      onClick={() => onPick(product)}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-amber-100 hover:border-amber-400 hover:bg-amber-50 text-left transition-all"
    >
      <img src={product.image} alt={product.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-amber-700 text-sm truncate">{product.name}</p>
        <p className="text-amber-500 text-xs font-bold">฿{formatPrice(product.price)}</p>
        {options.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {options.map((o) => (
              <span key={o.name} className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full">
                {o.name}
                {o.extraPrice > 0 ? ` +฿${o.extraPrice}` : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function OptionPicker({
  product,
  onCancel,
  onConfirm,
}: {
  product: Product;
  onCancel: () => void;
  onConfirm: (option: ProductOption) => void;
}) {
  const [selected, setSelected] = useState<ProductOption | null>(null);
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
      onClick={onCancel}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="bg-amber-500 text-white px-5 py-4 rounded-t-2xl">
          <h3 className="font-bold">เลือกตัวเลือก</h3>
          <p className="text-amber-100 text-sm">{product.name}</p>
        </div>
        <div className="p-4 space-y-2">
          {parseOptions(product.options).map((o) => (
            <button
              key={o.name}
              onClick={() => setSelected(o)}
              className={`w-full flex justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                selected?.name === o.name ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-amber-300"
              }`}
            >
              <span className="font-medium text-amber-700">{o.name}</span>
              <span className="text-sm text-green-600">
                ฿{formatPrice(product.price + o.extraPrice)}
                {o.extraPrice > 0 ? ` (+฿${o.extraPrice})` : ""}
              </span>
            </button>
          ))}
        </div>
        <div className="px-4 pb-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
          >
            ยกเลิก
          </button>
          <button
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
            className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 disabled:opacity-40"
          >
            ✅ เพิ่ม
          </button>
        </div>
      </div>
    </div>
  );
}
