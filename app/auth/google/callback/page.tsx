"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleCallback = () => {
      try {
        const token = searchParams.get("token");
        const userId = searchParams.get("userId");
        const email = searchParams.get("email");
        const fullname = searchParams.get("fullname");
        const profileImage = searchParams.get("profileImage");
        const authProvider = searchParams.get("authProvider");
        const error = searchParams.get("error");

        if (error) {
          setStatus("error");
          setErrorMessage(decodeURIComponent(error));
          return;
        }

        if (!token || !email) {
          setStatus("error");
          setErrorMessage("ข้อมูลไม่ครบถ้วน กรุณาลองใหม่");
          return;
        }

        // เก็บข้อมูลลง localStorage
        const userData = {
          userId: userId ? parseInt(userId) : null,
          email: email,
          fullname: fullname || "",
          profileImage: profileImage || "",
          authProvider: authProvider || "google",
        };

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userType");

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("userType", "user");

        // แจ้ง component อื่นๆ ว่า login แล้ว
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("userStatusChanged"));

        setStatus("success");

        // redirect ไปหน้าแรก
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } catch (err) {
        setStatus("error");
        setErrorMessage("เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              กำลังเข้าสู่ระบบ...
            </h2>
            <p className="text-gray-500">กรุณารอสักครู่</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-6xl mb-6">✅</div>
            <h2 className="text-xl font-semibold text-green-600 mb-2">
              เข้าสู่ระบบสำเร็จ!
            </h2>
            <p className="text-gray-500">กำลังพาคุณไปหน้าหลัก...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-6xl mb-6">❌</div>
            <h2 className="text-xl font-semibold text-red-600 mb-2">
              เข้าสู่ระบบไม่สำเร็จ
            </h2>
            <p className="text-gray-500 mb-6">{errorMessage}</p>
            <button
              onClick={() => (window.location.href = "/login")}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
            >
              กลับหน้าเข้าสู่ระบบ
            </button>
          </>
        )}
      </div>
    </div>
  );
}