"use client";

import { useEffect, useRef, useState } from "react";
import { checkSlipImage, SLIP_TYPES } from "@/lib/slipQr";

/**
 * เลือกรูปสลิป + ตรวจว่ามี QR ของสลิปจริงก่อนให้ส่ง
 *
 * ช่อง file ของเบราว์เซอร์ถูกซ่อนไว้ — ข้อความชื่อไฟล์เป็นแค่ป้ายแสดงผล กดไม่ได้
 * เปิดเลือกไฟล์ได้จากปุ่มเท่านั้น
 */

interface Props {
  disabled?: boolean;
  /** รูปที่ผ่านการตรวจ QR แล้ว — null = ยังไม่มีรูปที่ใช้ได้ */
  onValidSlipChange: (file: File | null) => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "valid" }
  | { kind: "invalid"; reason: string };

export default function SlipPicker({ disabled = false, onValidSlipChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  /** กันผลตรวจของรูปเก่ามาทับรูปใหม่ ถ้าลูกค้าเปลี่ยนรูปเร็วๆ */
  const checkSeq = useRef(0);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // คืนหน่วยความจำของรูปตัวอย่างเดิมเมื่อเปลี่ยนรูปหรือออกจากหน้า
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const seq = ++checkSeq.current;

    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
    setStatus({ kind: "checking" });
    onValidSlipChange(null);

    const result = await checkSlipImage(file);
    if (seq !== checkSeq.current) return;

    if (result.ok) {
      setStatus({ kind: "valid" });
      onValidSlipChange(file);
    } else {
      setStatus({ kind: "invalid", reason: result.reason });
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={SLIP_TYPES.join(",")}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          // ล้างค่า — เลือกไฟล์เดิมซ้ำแล้ว onChange ยังทำงาน
          e.target.value = "";
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || status.kind === "checking"}
          className="shrink-0 py-2 px-4 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          📎 {fileName ? "เปลี่ยนรูปสลิป" : "เลือกรูปสลิป"}
        </button>
        <span className="min-w-0 truncate text-sm text-gray-600 select-none pointer-events-none">
          {fileName || "ยังไม่ได้เลือกรูป"}
        </span>
      </div>

      {status.kind === "checking" && (
        <p className="mt-2 text-xs text-amber-700">กำลังตรวจหา QR Code ในสลิป...</p>
      )}
      {status.kind === "valid" && (
        <p className="mt-2 text-xs text-green-600">✓ พบ QR Code ของสลิปแล้ว</p>
      )}
      {status.kind === "invalid" && (
        <p className="mt-2 text-xs text-red-600">✗ {status.reason}</p>
      )}

      {preview && (
        <img
          src={preview}
          alt="ตัวอย่างสลิป"
          className={`mt-3 max-h-48 rounded-lg border mx-auto ${
            status.kind === "invalid" ? "border-red-300 opacity-60" : "border-amber-200"
          }`}
        />
      )}
    </div>
  );
}
