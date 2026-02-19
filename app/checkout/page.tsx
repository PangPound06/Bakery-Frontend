"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CartItem {
  id: number;
  productId: number;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  category: string;
}

interface OrderSummary {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "card">("qr");
  const [processing, setProcessing] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [error, setError] = useState("");

  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState("");
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [slipValidating, setSlipValidating] = useState(false);
  const [slipValid, setSlipValid] = useState(false);

  const [cardData, setCardData] = useState({
    cardNumber: "",
    expiry: "",
    cvc: "",
    name: "",
  });

  const [shippingData, setShippingData] = useState({
    fullname: "",
    phone: "",
    address: "",
    note: "",
  });

  const PROMPTPAY_ID = "0931253748";

  useEffect(() => {
    fetchCartData();
    loadUserData();
  }, []);

  const loadUserData = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.fullname) {
      setShippingData((prev) => ({ ...prev, fullname: user.fullname }));
    }
  };

  const fetchCartData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("https://bakery-backend-production-6fc9.up.railway.app/api/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const subtotal = data.items.reduce(
          (sum: number, item: CartItem) => sum + item.price * item.quantity,
          0,
        );
        const shipping = 0;
        const total = subtotal + shipping;

        setOrderSummary({ items: data.items, subtotal, shipping, total });
        generateQRCode(total);
      } else {
        router.push("/cart");
      }
    } catch (err) {
      console.error("Error fetching cart:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (amount: number) => {
    try {
      const response = await fetch(
        "https://bakery-backend-production-6fc9.up.railway.app/api/payment/promptpay/generate",
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
    } catch (err) {
      setQrCodeUrl(`https://promptpay.io/${PROMPTPAY_ID}/${amount}.png`);
    }
  };

  // โหลด jsQR library แบบ dynamic
  const loadJsQR = (): Promise<typeof import("jsqr").default> => {
    return new Promise((resolve, reject) => {
      if ((window as any).jsQR) {
        resolve((window as any).jsQR);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
      script.onload = () => resolve((window as any).jsQR);
      script.onerror = () => reject(new Error("ไม่สามารถโหลด QR scanner ได้"));
      document.head.appendChild(script);
    });
  };

  // ตรวจจับ QR Code ในรูปภาพ (สแกนหลายขนาด)
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
      const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const fullResult = jsQR(fullImageData.data, canvas.width, canvas.height);
      if (fullResult) return true;

      const regions = [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.15, y: 0.15, w: 0.7, h: 0.7 },
        { x: 0.25, y: 0, w: 0.5, h: 0.5 },
        { x: 0.25, y: 0.5, w: 0.5, h: 0.5 },
      ];

      for (const region of regions) {
        const sx = Math.floor(img.width * region.x);
        const sy = Math.floor(img.height * region.y);
        const sw = Math.floor(img.width * region.w);
        const sh = Math.floor(img.height * region.h);

        if (sw < 50 || sh < 50) continue;

        canvas.width = sw;
        canvas.height = sh;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        const regionData = ctx.getImageData(0, 0, sw, sh);
        const regionResult = jsQR(regionData.data, sw, sh);
        if (regionResult) return true;
      }

      const scales = [1.5, 2];
      for (const scale of scales) {
        const scaledW = Math.floor(img.width * scale);
        const scaledH = Math.floor(img.height * scale);

        if (scaledW > 4000 || scaledH > 4000) continue;

        canvas.width = scaledW;
        canvas.height = scaledH;
        ctx.drawImage(img, 0, 0, scaledW, scaledH);
        const scaledData = ctx.getImageData(0, 0, scaledW, scaledH);
        const scaledResult = jsQR(scaledData.data, scaledW, scaledH);
        if (scaledResult) return true;
      }

      return false;
    } catch {
      console.warn("QR detection unavailable, skipping QR check");
      return false;
    }
  };

  // ตรวจสอบว่าเป็นสลิปโอนเงินหรือไม่
  const validateSlipImage = (
    file: File,
  ): Promise<{ valid: boolean; reason?: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = async () => {
          const width = img.width;
          const height = img.height;
          const aspectRatio = height / width;

          if (width < 200 || height < 300) {
            resolve({
              valid: false,
              reason: "รูปภาพมีขนาดเล็กเกินไป กรุณาอัพโหลดสลิปที่ชัดเจน",
            });
            return;
          }

          if (aspectRatio < 0.8) {
            resolve({
              valid: false,
              reason: "สลิปโอนเงินควรเป็นภาพแนวตั้ง กรุณาตรวจสอบรูปภาพ",
            });
            return;
          }

          if (file.size < 10000) {
            resolve({
              valid: false,
              reason: "ไฟล์มีขนาดเล็กเกินไป กรุณาอัพโหลดสลิปที่ชัดเจน",
            });
            return;
          }

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const samplePoints = [
              { x: 10, y: 10 },
              { x: width - 10, y: 10 },
              { x: width / 2, y: 10 },
              { x: 10, y: height - 10 },
              { x: width - 10, y: height - 10 },
            ];

            let lightPixelCount = 0;
            for (const point of samplePoints) {
              const pixel = ctx.getImageData(point.x, point.y, 1, 1).data;
              const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
              if (brightness > 150) lightPixelCount++;
            }

            if (lightPixelCount < 2) {
              resolve({
                valid: false,
                reason:
                  "รูปภาพไม่เหมือนสลิปโอนเงิน สลิปควรมีพื้นหลังสีขาวหรือสีอ่อน",
              });
              return;
            }

            const hasQR = await detectQRCode(img, canvas, ctx);
            if (!hasQR) {
              resolve({
                valid: false,
                reason:
                  "ไม่พบ QR Code ในรูปภาพ สลิปโอนเงินจากแอปธนาคารจะต้องมี QR Code กรุณาอัพโหลดสลิปที่มี QR Code",
              });
              return;
            }
          }

          resolve({ valid: true });
        };

        img.onerror = () => {
          resolve({ valid: false, reason: "ไม่สามารถอ่านรูปภาพได้" });
        };

        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        resolve({ valid: false, reason: "ไม่สามารถอ่านไฟล์ได้" });
      };

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

    if (file.size > 5 * 1024 * 1024) {
      setError("ขนาดไฟล์ต้องไม่เกิน 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSlipPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    setSlipFile(file);

    setSlipValidating(true);
    const validation = await validateSlipImage(file);
    setSlipValidating(false);

    if (!validation.valid) {
      setError(validation.reason || "รูปภาพไม่ถูกต้อง");
      setSlipValid(false);
    } else {
      setSlipValid(true);
    }
  };

  const uploadSlip = async (): Promise<string | null> => {
    if (!slipFile) return null;

    setUploadingSlip(true);
    try {
      const formData = new FormData();
      formData.append("file", slipFile);

      const response = await fetch("https://bakery-backend-production-6fc9.up.railway.app/api/slip/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        return data.path;
      } else {
        setError(data.message || "อัพโหลดสลิปไม่สำเร็จ");
        return null;
      }
    } catch (err) {
      setError("ไม่สามารถอัพโหลดสลิปได้");
      return null;
    } finally {
      setUploadingSlip(false);
    }
  };

  const removeSlip = () => {
    setSlipFile(null);
    setSlipPreview("");
    setSlipValid(false);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCardInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === "cardNumber") {
      formattedValue = value
        .replace(/\s/g, "")
        .replace(/(\d{4})/g, "$1 ")
        .trim()
        .slice(0, 19);
    } else if (name === "expiry") {
      formattedValue = value
        .replace(/\D/g, "")
        .replace(/(\d{2})(\d)/, "$1/$2")
        .slice(0, 5);
    } else if (name === "cvc") {
      formattedValue = value.replace(/\D/g, "").slice(0, 4);
    }

    setCardData({ ...cardData, [name]: formattedValue });
  };

  // ═══ Card Payment — ใช้ /api/payment/card/charge ═══
  const handleCardPayment = async (): Promise<{
    success: boolean;
    paymentId?: string;
    cardLast4?: string;
  }> => {
    try {
      const [expMonth, expYear] = cardData.expiry.split("/");

      const response = await fetch(
        "https://bakery-backend-production-6fc9.up.railway.app/api/payment/card/charge",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: orderSummary?.total,
            cardNumber: cardData.cardNumber.replace(/\s/g, ""),
            expMonth: expMonth,
            expYear: "20" + expYear,
            cvc: cardData.cvc,
            cardName: cardData.name,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          paymentId: data.paymentId,
          cardLast4: data.cardLast4,
        };
      } else {
        setError(data.message || "การชำระเงินล้มเหลว");
        return { success: false };
      }
    } catch (err) {
      setError("ไม่สามารถเชื่อมต่อ Payment Gateway ได้");
      return { success: false };
    }
  };

  // ═══ Handle Payment ═══
  const handlePayment = async () => {
    setError("");

    if (
      !shippingData.fullname ||
      !shippingData.phone ||
      !shippingData.address
    ) {
      setError("กรุณากรอกข้อมูลการจัดส่งให้ครบถ้วน");
      return;
    }

    if (paymentMethod === "qr") {
      if (!slipFile) {
        setError("กรุณาอัพโหลดสลิปการโอนเงิน");
        return;
      }
      if (!slipValid) {
        setError("กรุณาอัพโหลดสลิปโอนเงินที่ถูกต้อง");
        return;
      }
    }

    if (paymentMethod === "card") {
      if (
        !cardData.cardNumber ||
        !cardData.expiry ||
        !cardData.cvc ||
        !cardData.name
      ) {
        setError("กรุณากรอกข้อมูลบัตรให้ครบถ้วน");
        return;
      }
    }

    setProcessing(true);

    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      let paymentId: string | null = null;
      let paymentStatus = "pending";
      let slipImagePath: string | null = null;
      let cardLast4: string | null = null;

      if (paymentMethod === "qr") {
        slipImagePath = await uploadSlip();
        if (!slipImagePath) {
          setProcessing(false);
          return;
        }
        paymentStatus = "pending";
      }

      if (paymentMethod === "card") {
        const cardResult = await handleCardPayment();
        if (!cardResult.success) {
          setProcessing(false);
          return;
        }
        paymentId = cardResult.paymentId || null;
        cardLast4 = cardResult.cardLast4 || null;
        paymentStatus = "paid";
      }

      const orderResponse = await fetch("https://bakery-backend-production-6fc9.up.railway.app/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: user.email,
          items: orderSummary?.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity,
          })),
          subtotal: orderSummary?.subtotal,
          shipping: orderSummary?.shipping,
          total: orderSummary?.total,
          paymentMethod: paymentMethod === "qr" ? "qr_promptpay" : "card",
          paymentStatus: paymentStatus,
          paymentId: paymentId,
          slipImage: slipImagePath,
          shippingInfo: shippingData,
          cardName: paymentMethod === "card" ? cardData.name : null,
          cardLast4: cardLast4,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        setError(orderData.message || "ไม่สามารถสร้างคำสั่งซื้อได้");
        setProcessing(false);
        return;
      }

      await fetch("https://bakery-backend-production-6fc9.up.railway.app/api/cart/clear", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      window.dispatchEvent(new Event("cartUpdated"));
      localStorage.setItem("lastOrderId", orderData.orderId.toString());

      router.push("/checkout/success");
    } catch (err) {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/cart"
            className="text-amber-600 hover:text-amber-700 flex items-center gap-2 mb-4"
          >
            ← กลับไปตะกร้าสินค้า
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">
            💳 ดำเนินการชำระเงิน
          </h1>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* ข้อมูลการจัดส่ง */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                📦 ข้อมูลการจัดส่ง
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อผู้รับ *
                  </label>
                  <input
                    type="text"
                    value={shippingData.fullname}
                    onChange={(e) =>
                      setShippingData({
                        ...shippingData,
                        fullname: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="ชื่อ-นามสกุล"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เบอร์โทรศัพท์ *
                  </label>
                  <input
                    type="tel"
                    value={shippingData.phone}
                    onChange={(e) =>
                      setShippingData({
                        ...shippingData,
                        phone: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    maxLength={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="0812345678"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ที่อยู่จัดส่ง *
                  </label>
                  <textarea
                    value={shippingData.address}
                    onChange={(e) =>
                      setShippingData({
                        ...shippingData,
                        address: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    rows={3}
                    placeholder="บ้านเลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    หมายเหตุ
                  </label>
                  <input
                    type="text"
                    value={shippingData.note}
                    onChange={(e) =>
                      setShippingData({
                        ...shippingData,
                        note: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="เช่น ฝากไว้ที่ป้อม รปภ."
                  />
                </div>
              </div>
            </div>

            {/* วิธีชำระเงิน */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                💰 เลือกวิธีชำระเงิน
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setPaymentMethod("qr")}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    paymentMethod === "qr"
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                      📱
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">
                        QR PromptPay
                      </p>
                      <p className="text-sm text-gray-500">
                        สแกนจ่ายผ่านแอปธนาคาร
                      </p>
                    </div>
                    {paymentMethod === "qr" && (
                      <span className="ml-auto text-amber-500 text-xl">✓</span>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    paymentMethod === "card"
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
                      💳
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">
                        บัตรเดบิต/เครดิต
                      </p>
                      <p className="text-sm text-gray-500">
                        Visa, Mastercard, JCB
                      </p>
                    </div>
                    {paymentMethod === "card" && (
                      <span className="ml-auto text-amber-500 text-xl">✓</span>
                    )}
                  </div>
                </button>
              </div>

              {/* QR PromptPay */}
              {paymentMethod === "qr" && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 text-center">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      ขั้นตอนที่ 1: สแกน QR Code เพื่อชำระเงิน
                    </h3>
                    <div className="bg-white p-4 rounded-xl inline-block shadow-md mb-4">
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl}
                          alt="PromptPay QR Code"
                          className="w-48 h-48 mx-auto"
                        />
                      ) : (
                        <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400">
                            กำลังสร้าง QR...
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-amber-600">
                      ฿{orderSummary?.total.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      PromptPay: {PROMPTPAY_ID}
                    </p>
                  </div>

                  {/* อัพโหลดสลิป */}
                  <div
                    className={`rounded-xl p-6 ${
                      slipValid
                        ? "bg-gradient-to-br from-green-50 to-emerald-50"
                        : "bg-gradient-to-br from-yellow-50 to-orange-50"
                    }`}
                  >
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      📤 ขั้นตอนที่ 2: อัพโหลดสลิปการโอนเงิน{" "}
                      <span className="text-red-500">*</span>
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      ⚠️ กรุณาอัพโหลดสลิปโอนเงินจากแอปธนาคารเท่านั้น
                      ระบบจะตรวจสอบความถูกต้อง
                    </p>

                    {!slipPreview ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-amber-300 rounded-xl p-8 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-all"
                      >
                        <div className="text-5xl mb-3">🧾</div>
                        <p className="text-gray-700 font-medium mb-2">
                          คลิกเพื่อเลือกรูปสลิป
                        </p>
                        <p className="text-sm text-gray-500">
                          รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 5MB
                        </p>
                        <p className="text-xs text-amber-600 mt-2">
                          📌 ต้องเป็นสลิปโอนเงินจากแอปธนาคารเท่านั้น
                        </p>
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
                          className={`p-4 rounded-xl shadow-md ${
                            slipValid ? "bg-white" : "bg-red-50"
                          }`}
                        >
                          <img
                            src={slipPreview}
                            alt="Slip Preview"
                            className="max-h-64 mx-auto rounded-lg"
                          />
                        </div>

                        <div className="mt-4">
                          {slipValidating ? (
                            <div className="flex items-center justify-center gap-2 text-amber-600">
                              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>กำลังตรวจสอบสลิป...</span>
                            </div>
                          ) : slipValid ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-green-600">
                                <span className="text-xl">✅</span>
                                <span className="font-medium">
                                  สลิปถูกต้อง - {slipFile?.name}
                                </span>
                              </div>
                              <button
                                onClick={removeSlip}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                🗑️ ลบ
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-red-600">
                                <span className="text-xl">❌</span>
                                <span className="font-medium">
                                  รูปภาพไม่ถูกต้อง
                                </span>
                              </div>
                              <button
                                onClick={removeSlip}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                🗑️ เลือกใหม่
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Card Payment */}
              {paymentMethod === "card" && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    กรอกข้อมูลบัตร
                  </h3>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-yellow-800">
                      🧪 ทดสอบด้วย Test Card:
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Card:{" "}
                      <span className="font-mono">4242 4242 4242 4242</span> |
                      Exp: <span className="font-mono">12/28</span> | CVC:{" "}
                      <span className="font-mono">123</span>
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ชื่อบนบัตร
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={cardData.name}
                        onChange={handleCardInput}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="JOHN DOE"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        หมายเลขบัตร
                      </label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={cardData.cardNumber}
                        onChange={handleCardInput}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="4242 4242 4242 4242"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          วันหมดอายุ
                        </label>
                        <input
                          type="text"
                          name="expiry"
                          value={cardData.expiry}
                          onChange={handleCardInput}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="MM/YY"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CVC
                        </label>
                        <input
                          type="text"
                          name="cvc"
                          value={cardData.cvc}
                          onChange={handleCardInput}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="123"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                📋 สรุปคำสั่งซื้อ
              </h2>

              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {orderSummary?.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-gray-500">x{item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-amber-600">
                      ฿{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>ยอดรวมสินค้า</span>
                  <span>฿{orderSummary?.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>ค่าจัดส่ง</span>
                  <span className="text-green-600">ฟรี</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-800">
                      ยอดรวมทั้งหมด
                    </span>
                    <span className="text-2xl font-bold text-amber-600">
                      ฿{orderSummary?.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {paymentMethod === "qr" && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    ✅ เช็คลิสต์:
                  </p>
                  <div className="space-y-1 text-sm">
                    <div
                      className={
                        shippingData.fullname &&
                        shippingData.phone &&
                        shippingData.address
                          ? "text-green-600"
                          : "text-gray-400"
                      }
                    >
                      {shippingData.fullname &&
                      shippingData.phone &&
                      shippingData.address
                        ? "✓"
                        : "○"}{" "}
                      กรอกข้อมูลจัดส่งแล้ว
                    </div>
                    <div
                      className={
                        slipFile
                          ? slipValid
                            ? "text-green-600"
                            : "text-red-500"
                          : "text-gray-400"
                      }
                    >
                      {slipFile ? (slipValid ? "✓" : "✗") : "○"}{" "}
                      {slipFile
                        ? slipValid
                          ? "อัพโหลดสลิปถูกต้อง"
                          : "สลิปไม่ถูกต้อง"
                        : "อัพโหลดสลิป"}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={
                  processing ||
                  uploadingSlip ||
                  slipValidating ||
                  (paymentMethod === "qr" && (!slipFile || !slipValid))
                }
                className={`w-full mt-6 py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                  processing ||
                  uploadingSlip ||
                  slipValidating ||
                  (paymentMethod === "qr" && (!slipFile || !slipValid))
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg"
                }`}
              >
                {processing || uploadingSlip ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {uploadingSlip
                      ? "กำลังอัพโหลดสลิป..."
                      : "กำลังดำเนินการ..."}
                  </>
                ) : slipValidating ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    กำลังตรวจสอบสลิป...
                  </>
                ) : paymentMethod === "qr" ? (
                  slipFile && slipValid ? (
                    "✅ ยืนยันการชำระเงิน"
                  ) : slipFile && !slipValid ? (
                    "❌ สลิปไม่ถูกต้อง"
                  ) : (
                    "📤 กรุณาอัพโหลดสลิปก่อน"
                  )
                ) : (
                  `💳 ชำระเงิน ฿${orderSummary?.total.toLocaleString()}`
                )}
              </button>

              {paymentMethod === "qr" && !slipValid && slipFile && (
                <p className="text-xs text-red-500 text-center mt-2">
                  * กรุณาอัพโหลดสลิปโอนเงินจากแอปธนาคาร
                </p>
              )}

              {paymentMethod === "qr" && !slipFile && (
                <p className="text-xs text-amber-600 text-center mt-2">
                  * กรุณาอัพโหลดสลิปการโอนเงินก่อนยืนยัน
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
