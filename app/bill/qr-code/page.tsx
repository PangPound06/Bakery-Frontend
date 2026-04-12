"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

const PROMPTPAY_ID = "0931253748";

const formatPrice = (price: number) =>
  price.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function BillQRContent() {
  const [grandTotal, setGrandTotal] = useState(0);
  const [tableNo, setTableNo] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [loadingQR, setLoadingQR] = useState(true);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState("");
  const [slipValidating, setSlipValidating] = useState(false);
  const [slipValid, setSlipValid] = useState(false);
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    const table = localStorage.getItem("tableNo") || "";
    setTableNo(table);

    const total = parseFloat(searchParams.get("total") || "0");

    if (!total || total <= 0) {
      router.replace("/bill");
      return;
    }

    setGrandTotal(total);
    generateQRCode(total);
  }, [searchParams]);

  const generateQRCode = async (amount: number) => {
    setLoadingQR(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payment/promptpay/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        },
      );
      const data = await response.json();
      if (data.success && data.qrCodeBase64) {
        setQrCodeUrl(`data:image/png;base64,${data.qrCodeBase64}`);
      } else {
        setQrCodeUrl(`https://promptpay.io/${PROMPTPAY_ID}/${amount}.png`);
      }
    } catch {
      setQrCodeUrl(`https://promptpay.io/${PROMPTPAY_ID}/${amount}.png`);
    } finally {
      setLoadingQR(false);
    }
  };

  const loadJsQR = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).jsQR) {
        resolve((window as any).jsQR);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
      script.onload = () => resolve((window as any).jsQR);
      script.onerror = () => reject(new Error("โหลด QR scanner ไม่ได้"));
      document.head.appendChild(script);
    });
  };

  const detectQRCode = async (
    img: HTMLImageElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
  ): Promise<boolean> => {
    try {
      const jsQR = await loadJsQR();
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      if (
        jsQR(
          ctx.getImageData(0, 0, canvas.width, canvas.height).data,
          canvas.width,
          canvas.height,
        )
      )
        return true;
      const regions = [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.15, y: 0.15, w: 0.7, h: 0.7 },
      ];
      for (const r of regions) {
        const sx = Math.floor(img.width * r.x),
          sy = Math.floor(img.height * r.y);
        const sw = Math.floor(img.width * r.w),
          sh = Math.floor(img.height * r.h);
        if (sw < 50 || sh < 50) continue;
        canvas.width = sw;
        canvas.height = sh;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        if (jsQR(ctx.getImageData(0, 0, sw, sh).data, sw, sh)) return true;
      }
      for (const scale of [1.5, 2]) {
        const sw = Math.floor(img.width * scale),
          sh = Math.floor(img.height * scale);
        if (sw > 4000 || sh > 4000) continue;
        canvas.width = sw;
        canvas.height = sh;
        ctx.drawImage(img, 0, 0, sw, sh);
        if (jsQR(ctx.getImageData(0, 0, sw, sh).data, sw, sh)) return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const validateSlipImage = (
    file: File,
  ): Promise<{ valid: boolean; reason?: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = async () => {
          const { width, height } = img;
          if (width < 200 || height < 300) {
            resolve({ valid: false, reason: "รูปภาพมีขนาดเล็กเกินไป" });
            return;
          }
          if (height / width < 0.8) {
            resolve({ valid: false, reason: "สลิปควรเป็นภาพแนวตั้ง" });
            return;
          }
          if (file.size < 10000) {
            resolve({ valid: false, reason: "ไฟล์มีขนาดเล็กเกินไป" });
            return;
          }
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0);
            const pts = [
              { x: 10, y: 10 },
              { x: width - 10, y: 10 },
              { x: width / 2, y: 10 },
              { x: 10, y: height - 10 },
              { x: width - 10, y: height - 10 },
            ];
            let light = 0;
            for (const p of pts) {
              const px = ctx.getImageData(p.x, p.y, 1, 1).data;
              if ((px[0] + px[1] + px[2]) / 3 > 150) light++;
            }
            if (light < 2) {
              resolve({
                valid: false,
                reason: "รูปภาพไม่เหมือนสลิปโอนเงิน (พื้นหลังควรสีอ่อน)",
              });
              return;
            }
            const hasQR = await detectQRCode(img, canvas, ctx);
            if (!hasQR) {
              resolve({
                valid: false,
                reason: "ไม่พบ QR Code ในรูปภาพ กรุณาอัพโหลดสลิปจากแอปธนาคาร",
              });
              return;
            }
          }
          try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/slip/verify`,
              {
                method: "POST",
                body: fd,
              },
            );
            const data = await res.json();
            if (data.success && data.amount != null) {
              const diff = Math.abs(data.amount - grandTotal);
              if (diff > 1) {
                resolve({
                  valid: false,
                  reason: `ยอดเงินในสลิป (฿${data.amount.toLocaleString()}) ไม่ตรงกับยอดที่ต้องชำระ (฿${grandTotal.toLocaleString()})`,
                });
                return;
              }
            }
          } catch {
            /* ผ่าน */
          }
          resolve({ valid: true });
        };
        img.onerror = () =>
          resolve({ valid: false, reason: "อ่านรูปภาพไม่ได้" });
        img.src = e.target?.result as string;
      };
      reader.onerror = () =>
        resolve({ valid: false, reason: "อ่านไฟล์ไม่ได้" });
      reader.readAsDataURL(file);
    });
  };

  const handleSlipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setSlipValid(false);
    if (!file.type.startsWith("image/")) {
      setError("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("ขนาดไฟล์ต้องไม่เกิน 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setSlipPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setSlipFile(file);
    setSlipValidating(true);
    const result = await validateSlipImage(file);
    setSlipValidating(false);
    if (!result.valid) {
      setError(result.reason || "รูปภาพไม่ถูกต้อง");
    } else {
      setSlipValid(true);
    }
  };

  const removeSlip = () => {
    setSlipFile(null);
    setSlipPreview("");
    setSlipValid(false);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirm = async () => {
    if (!slipFile || !slipValid) return;
    const token = getToken();
    if (!token) return;
    setUploadingSlip(true);
    try {
      const fd = new FormData();
      fd.append("file", slipFile);
      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/slip/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        },
      );
      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        setError(uploadData.message || "อัพโหลดสลิปไม่สำเร็จ");
        return;
      }

      const buffetPriceStr = localStorage.getItem("buffetPrice");
      const dineType = localStorage.getItem("dineType");

      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dinein/request-bill`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            slipImage: uploadData.path,
            tableNo: localStorage.getItem("tableNo"),
            buffetPrice:
              dineType === "buffet" && buffetPriceStr
                ? Number(buffetPriceStr)
                : null,
            buffetPax:
              dineType === "buffet"
                ? Number(localStorage.getItem("buffetPax") || 1)
                : 1,
            dineType: dineType || "alacarte",
          }),
        },
      );

      await Swal.fire({
        icon: "success",
        title: "ส่งสลิปสำเร็จ!",
        text: "พนักงานจะตรวจสอบและยืนยันการชำระเงินของท่าน",
        confirmButtonColor: "#f97316",
        confirmButtonText: "รับทราบ",
      });

      router.replace("/order-detail");
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setUploadingSlip(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-base font-bold text-amber-900">ชำระเงินผ่าน QR</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-4">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="bg-amber-800 px-6 py-4 text-center">
            <p className="text-amber-200 text-xs mb-0.5">
              สแกน QR เพื่อชำระเงิน
            </p>
            <p className="text-white font-bold text-lg">
              {tableNo && `🪑 โต๊ะ ${tableNo}`}
            </p>
          </div>
          <div className="px-6 py-6 text-center">
            <div className="bg-white border-2 border-amber-100 rounded-2xl p-4 inline-block shadow-md mb-4">
              {loadingQR ? (
                <div className="w-48 h-48 flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="PromptPay QR"
                  className="w-48 h-48 mx-auto"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-gray-400 text-sm">
                  ไม่พบ QR Code
                </div>
              )}
            </div>
            <p className="text-3xl font-bold text-orange-500 mb-1">
              ฿{formatPrice(grandTotal)}
            </p>
            <p className="text-sm text-gray-400">PromptPay: {PROMPTPAY_ID}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="px-6 py-5">
            <h2 className="text-base font-bold text-gray-800 mb-1">
              📤 อัพโหลดสลิปการโอนเงิน <span className="text-red-500">*</span>
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              กรุณาอัพโหลดสลิปจากแอปธนาคารเท่านั้น
            </p>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl">
                ⚠️ {error}
              </div>
            )}
            {!slipPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-amber-200 rounded-2xl p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-amber-50 transition-all"
              >
                <div className="text-4xl mb-3">🧾</div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  คลิกเพื่อเลือกรูปสลิป
                </p>
                <p className="text-xs text-gray-400">JPG, PNG ไม่เกิน 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSlipSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div>
                <div
                  className={`p-3 rounded-2xl ${slipValid ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
                >
                  <img
                    src={slipPreview}
                    alt="Slip"
                    className="max-h-64 mx-auto rounded-xl"
                  />
                </div>
                <div className="mt-3">
                  {slipValidating ? (
                    <div className="flex items-center justify-center gap-2 text-amber-600 py-2">
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">กำลังตรวจสอบสลิป...</span>
                    </div>
                  ) : slipValid ? (
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <span>✅</span>
                        <span className="font-medium">สลิปถูกต้อง</span>
                      </div>
                      <button
                        onClick={removeSlip}
                        className="text-xs text-red-500 hover:text-red-700 px-3 py-1 hover:bg-red-50 rounded-lg"
                      >
                        เปลี่ยน
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2 text-red-500 text-sm">
                        <span>❌</span>
                        <span className="font-medium">สลิปไม่ถูกต้อง</span>
                      </div>
                      <button
                        onClick={removeSlip}
                        className="text-xs text-red-500 hover:text-red-700 px-3 py-1 hover:bg-red-50 rounded-lg"
                      >
                        เลือกใหม่
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!slipFile || !slipValid || uploadingSlip || slipValidating}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
            slipFile && slipValid && !uploadingSlip && !slipValidating
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg hover:shadow-xl active:scale-[0.98]"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {uploadingSlip ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              กำลังอัพโหลดสลิป...
            </>
          ) : slipValidating ? (
            <>
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              กำลังตรวจสอบ...
            </>
          ) : slipFile && slipValid ? (
            "✅ ยืนยันการชำระเงิน"
          ) : (
            "📤 กรุณาอัพโหลดสลิปก่อน"
          )}
        </button>
      </div>
    </div>
  );
}

export default function BillQRPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-amber-50 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BillQRContent />
    </Suspense>
  );
}
