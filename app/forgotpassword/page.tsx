"use client";

import { useState } from "react";
import Link from "next/link";

type Step = "email" | "otp" | "newPassword" | "success";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // ส่ง OTP ไปยังอีเมล
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("กรุณากรอกอีเมล");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8080/api/auth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      const data = await response.json();

      if (data.success) {
        // เริ่มนับถอยหลัง 60 วินาที
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        setStep("otp");
        alert("📧 ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว");
      } else {
        setError(data.message || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      setError("ไม่สามารถเชื่อมต่อ server ได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  // จัดการการกรอก OTP
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  // วาง OTP จาก clipboard
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      const lastInput = document.getElementById(`otp-5`);
      lastInput?.focus();
    }
  };

  // ยืนยัน OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("กรุณากรอกรหัส OTP ให้ครบ 6 หลัก");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8080/api/auth/verify-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: otpCode }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setResetToken(data.resetToken);
        setStep("newPassword");
      } else {
        setError(data.message || "รหัส OTP ไม่ถูกต้อง");
      }
    } catch (err: any) {
      setError("ไม่สามารถเชื่อมต่อ server ได้");
    } finally {
      setLoading(false);
    }
  };

  // รีเซ็ตรหัสผ่าน
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("กรุณากรอกรหัสผ่านให้ครบ");
      return;
    }

    if (newPassword.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8080/api/auth/reset-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            resetToken,
            newPassword,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setStep("success");
      } else {
        setError(data.message || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      setError("ไม่สามารถเชื่อมต่อ server ได้");
    } finally {
      setLoading(false);
    }
  };

  // ส่ง OTP ใหม่
  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:8080/api/auth/resend-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        alert("📧 ส่งรหัส OTP ใหม่แล้ว");
        setOtp(["", "", "", "", "", ""]);
      } else {
        setError(data.message || "ไม่สามารถส่ง OTP ใหม่ได้");
      }
    } catch (err) {
      setError("ไม่สามารถเชื่อมต่อ server ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="text-4xl font-bold text-amber-600 mb-2">
                🧁 Pound Bakery
              </h1>
            </Link>
          </div>

          {/* Step 1: กรอกอีเมล */}
          {step === "email" && (
            <>
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🔑</span>
                </div>
                <h2 className="text-2xl font-semibold text-amber-700 mb-2">
                  ลืมรหัสผ่าน?
                </h2>
                <p className="text-amber-800 text-sm">
                  กรอกอีเมลของคุณเพื่อรับรหัส OTP
                </p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSendOTP} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    อีเมล
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="example@email.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      กำลังส่ง...
                    </span>
                  ) : (
                    "📧 ส่งรหัส OTP"
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step 2: กรอก OTP */}
          {step === "otp" && (
            <>
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">📱</span>
                </div>
                <h2 className="text-2xl font-semibold text-amber-700 mb-2">
                  ยืนยันรหัส OTP
                </h2>
                <p className="text-amber-800 text-sm">
                  เราส่งรหัส 6 หลักไปที่
                  <br />
                  <span className="font-medium text-amber-600">{email}</span>
                </p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleVerifyOTP} className="space-y-5">
                {/* OTP Input */}
                <div
                  className="flex justify-center gap-2"
                  onPaste={handleOtpPaste}
                >
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) =>
                        handleOtpChange(
                          index,
                          e.target.value.replace(/\D/g, ""),
                        )
                      }
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    />
                  ))}
                </div>

                <p className="text-center text-xs text-gray-500">
                  💡 สามารถวาง (Ctrl+V) รหัส OTP ได้เลย
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      กำลังตรวจสอบ...
                    </span>
                  ) : (
                    "✓ ยืนยัน OTP"
                  )}
                </button>

                {/* Resend OTP */}
                <div className="text-center">
                  <p className="text-sm text-amber-800 mb-2">ไม่ได้รับรหัส?</p>
                  {countdown > 0 ? (
                    <p className="text-sm text-gray-500">
                      ส่งรหัสใหม่ได้ใน{" "}
                      <span className="font-bold text-amber-600">
                        {countdown}
                      </span>{" "}
                      วินาที
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={loading}
                      className="text-amber-600 hover:text-amber-700 font-medium text-sm"
                    >
                      📧 ส่งรหัสใหม่
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp(["", "", "", "", "", ""]);
                    setError("");
                  }}
                  className="w-full text-amber-800 hover:text-amber-700 font-medium py-2 transition-colors"
                >
                  ← เปลี่ยนอีเมล
                </button>
              </form>
            </>
          )}

          {/* Step 3: ตั้งรหัสผ่านใหม่ */}
          {step === "newPassword" && (
            <>
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🔐</span>
                </div>
                <h2 className="text-2xl font-semibold text-amber-700 mb-2">
                  ตั้งรหัสผ่านใหม่
                </h2>
                <p className="text-amber-800 text-sm">
                  กรุณากรอกรหัสผ่านใหม่ของคุณ
                </p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    รหัสผ่านใหม่
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors pr-12"
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    ยืนยันรหัสผ่านใหม่
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    required
                  />
                </div>

                {/* Password Strength */}
                {newPassword && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      <div
                        className={`h-1 flex-1 rounded ${
                          newPassword.length >= 2 ? "bg-red-400" : "bg-gray-200"
                        }`}
                      ></div>
                      <div
                        className={`h-1 flex-1 rounded ${
                          newPassword.length >= 4
                            ? "bg-yellow-400"
                            : "bg-gray-200"
                        }`}
                      ></div>
                      <div
                        className={`h-1 flex-1 rounded ${
                          newPassword.length >= 6
                            ? "bg-green-400"
                            : "bg-gray-200"
                        }`}
                      ></div>
                      <div
                        className={`h-1 flex-1 rounded ${
                          newPassword.length >= 8 &&
                          /[A-Z]/.test(newPassword) &&
                          /[0-9]/.test(newPassword)
                            ? "bg-green-500"
                            : "bg-gray-200"
                        }`}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {newPassword.length < 6
                        ? "⚠️ รหัสผ่านสั้นเกินไป"
                        : newPassword.length >= 8 &&
                            /[A-Z]/.test(newPassword) &&
                            /[0-9]/.test(newPassword)
                          ? "✅ รหัสผ่านแข็งแรง"
                          : "✓ รหัสผ่านใช้ได้"}
                    </p>
                  </div>
                )}

                {/* Match Indicator */}
                {confirmPassword && (
                  <p
                    className={`text-sm ${
                      newPassword === confirmPassword
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {newPassword === confirmPassword
                      ? "✓ รหัสผ่านตรงกัน"
                      : "✗ รหัสผ่านไม่ตรงกัน"}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      กำลังบันทึก...
                    </span>
                  ) : (
                    "🔐 เปลี่ยนรหัสผ่าน"
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step 4: สำเร็จ */}
          {step === "success" && (
            <div className="text-center py-6">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">✅</span>
              </div>
              <h2 className="text-2xl font-semibold text-amber-700 mb-2">
                เปลี่ยนรหัสผ่านสำเร็จ!
              </h2>
              <p className="text-amber-800 mb-8">
                คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว
              </p>

              <Link
                href="/login"
                className="block w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg text-center"
              >
                🔓 เข้าสู่ระบบ
              </Link>
            </div>
          )}

          {/* Back to Login */}
          {step !== "success" && (
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-amber-800 hover:text-amber-700 text-sm font-medium"
              >
                ← กลับหน้าเข้าสู่ระบบ
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-amber-800 hover:text-amber-700 text-sm font-medium"
          >
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
}
