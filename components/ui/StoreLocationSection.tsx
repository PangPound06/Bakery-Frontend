"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Branch } from "./StoreLocationMap";

const StoreLocationMap = dynamic(() => import("./StoreLocationMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-amber-50 text-amber-700 text-sm">
      กำลังโหลดแผนที่...
    </div>
  ),
});

export default function StoreLocationSection() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [focus, setFocus] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await api.get<{ branches: Branch[] }>("/api/store/branches", {
          noAuth: true,
        });
        setBranches(d.branches || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-2 pb-12 bg-amber-50">
      {/* ── Header ── */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-4"
        >
          ← กลับหน้าหลัก
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <span>📍</span>
          <span className="bg-gradient-to-r from-amber-700 to-orange-500 bg-clip-text text-transparent">
            ที่ตั้งร้าน
          </span>
        </h1>
        <p className="text-amber-600 mt-1">
          ทั้งหมด {branches.length} สาขา
        </p>
      </div>

      {loading ? (
        <div className="h-[420px] rounded-2xl bg-white/60 flex items-center justify-center text-amber-700">
          กำลังโหลด...
        </div>
      ) : branches.length === 0 ? (
        <div className="h-[200px] rounded-2xl bg-white/60 flex items-center justify-center text-gray-500">
          ยังไม่มีข้อมูลสาขา
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* แผนที่ */}
          <div className="lg:col-span-2 h-[320px] sm:h-[460px] rounded-2xl overflow-hidden shadow-sm border border-amber-100">
            <StoreLocationMap branches={branches} focus={focus} />
          </div>

          {/* รายการสาขา */}
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {branches.map((b) => {
              const dir = `https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}`;
              const isFocus = focus?.id === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => setFocus(b)}
                  className={`cursor-pointer bg-white rounded-2xl p-4 shadow-sm border transition-colors ${
                    isFocus
                      ? "border-amber-400 ring-2 ring-amber-200"
                      : "border-amber-100 hover:border-amber-300"
                  }`}
                >
                  <h3 className="font-bold text-amber-900 flex items-center gap-2">
                    <span>📍</span> {b.name}
                  </h3>
                  {b.address ? (
                    <p className="text-sm text-gray-600 mt-1">{b.address}</p>
                  ) : null}
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    {b.hours ? <p>🕒 {b.hours}</p> : null}
                    {b.phone ? (
                      <p>
                        📞{" "}
                        <a
                          href={`tel:${b.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-amber-600 hover:underline"
                        >
                          {b.phone}
                        </a>
                      </p>
                    ) : null}
                  </div>
                  <a
                    href={dir}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-block mt-3 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
                  >
                    นำทางไปสาขานี้
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
