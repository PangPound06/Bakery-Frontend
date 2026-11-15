"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
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

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("userStatusChanged"));

        setStatus("success");

        setTimeout(() => {
          window.location.href = "/order-mode";
        }, 1500);
      } catch {
        setStatus("error");
        setErrorMessage("เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-cream   flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <div className="w-16 h-16 border-4 border-brick border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-body mb-2">
              กำลังเข้าสู่ระบบ...
            </h2>
            <p className="text-muted">กรุณารอสักครู่</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-6xl mb-6">✅</div>
            <h2 className="text-xl font-semibold text-ok mb-2">
              เข้าสู่ระบบสำเร็จ!
            </h2>
            <p className="text-muted">กำลังพาคุณไปหน้าหลัก...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-6xl mb-6">❌</div>
            <h2 className="text-xl font-semibold text-error mb-2">
              เข้าสู่ระบบไม่สำเร็จ
            </h2>
            <p className="text-muted mb-6">{errorMessage}</p>
            <button
              onClick={() => (window.location.href = "/login")}
              className="bg-brick hover:bg-brick-hover text-white font-semibold py-3 px-6 rounded-full transition-all"
            >
              กลับหน้าเข้าสู่ระบบ
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
