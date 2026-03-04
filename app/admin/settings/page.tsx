"use client";

import { useState, type ReactNode } from "react";
import Swal from "sweetalert2";

// ==================== Types ====================
interface DeliveryZone {
  id: number;
  name: string;
  minKm: number;
  maxKm: number;
  fee: number;
  color: string;
}

interface ShopData {
  shopName: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  deliveryBasePrice: number;
  deliveryPerKm: number;
  maxDeliveryRadius: number;
  freeDeliveryRadius: number;
  freeDeliveryMinOrder: number;
  zones: DeliveryZone[];
}

interface CalcResult {
  distance: number;
  fee: number;
  available: boolean;
  zone: DeliveryZone | undefined;
}

type TabType = "location" | "delivery" | "calculator";

// ==================== Constants ====================
const GOOGLE_MAPS_API_KEY = "YOUR_API_KEY_HERE";

const defaultShopData: ShopData = {
  shopName: "Sweet Crumbs Bakery",
  address: "123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110",
  phone: "02-123-4567",
  lat: 13.7234,
  lng: 100.5232,
  deliveryBasePrice: 30,
  deliveryPerKm: 10,
  maxDeliveryRadius: 15,
  freeDeliveryRadius: 3,
  freeDeliveryMinOrder: 500,
  zones: [
    {
      id: 1,
      name: "โซน A (0-3 กม.)",
      minKm: 0,
      maxKm: 3,
      fee: 0,
      color: "#22c55e",
    },
    {
      id: 2,
      name: "โซน B (3-7 กม.)",
      minKm: 3,
      maxKm: 7,
      fee: 30,
      color: "#eab308",
    },
    {
      id: 3,
      name: "โซน C (7-15 กม.)",
      minKm: 7,
      maxKm: 15,
      fee: 60,
      color: "#ef4444",
    },
  ],
};

// ==================== Icons ====================
const MapPinIcon = (): ReactNode => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const TruckIcon = (): ReactNode => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const StoreIcon = (): ReactNode => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const SaveIcon = (): ReactNode => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2 2h11l5 5v11z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const TargetIcon = (): ReactNode => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const TrashIcon = (): ReactNode => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const PlusIcon = (): ReactNode => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CalcIcon = (): ReactNode => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="8" y2="10.01" />
    <line x1="12" y1="10" x2="12" y2="10.01" />
    <line x1="16" y1="10" x2="16" y2="10.01" />
    <line x1="8" y1="14" x2="8" y2="14.01" />
    <line x1="12" y1="14" x2="12" y2="14.01" />
    <line x1="16" y1="14" x2="16" y2="14.01" />
    <line x1="8" y1="18" x2="16" y2="18" />
  </svg>
);

// ==================== Haversine Distance ====================
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ==================== Map Component (Static) ====================
interface StaticMapProps {
  lat: number;
  lng: number;
  zoom?: number;
}

function StaticMap({ lat, lng }: StaticMapProps): ReactNode {
  return (
    <div
      style={{
        width: "100%",
        height: "280px",
        borderRadius: "16px",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #e8d5b7 0%, #f5e6d0 50%, #d4b896 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        border: "2px solid #d4a574",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
          radial-gradient(circle at 30% 40%, rgba(212,165,116,0.3) 0%, transparent 50%),
          radial-gradient(circle at 70% 60%, rgba(139,90,43,0.15) 0%, transparent 40%),
          repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(212,165,116,0.1) 20px, rgba(212,165,116,0.1) 21px),
          repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(212,165,116,0.1) 20px, rgba(212,165,116,0.1) 21px)
        `,
        }}
      />
      <div style={{ textAlign: "center", zIndex: 1, padding: "20px" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #8B5A2B, #D2691E)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
            boxShadow: "0 4px 15px rgba(139,90,43,0.4)",
            animation: "bounce 2s infinite",
            color: "white",
          }}
        >
          <MapPinIcon />
        </div>
        <p
          style={{
            color: "#5a3825",
            fontWeight: 600,
            fontSize: "14px",
            margin: 0,
          }}
        >
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
        <p style={{ color: "#8B6914", fontSize: "12px", marginTop: "4px" }}>
          📍 ตำแหน่งร้านของคุณ
        </p>
      </div>
    </div>
  );
}

// ==================== Tab Button ====================
interface TabButtonProps {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: TabButtonProps): ReactNode {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 20px",
        border: "none",
        borderRadius: "12px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: active ? 700 : 500,
        fontFamily: "'Sarabun', sans-serif",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        background: active
          ? "linear-gradient(135deg, #8B5A2B, #A0522D)"
          : "transparent",
        color: active ? "#fff" : "#6b5545",
        boxShadow: active ? "0 4px 15px rgba(139,90,43,0.3)" : "none",
        transform: active ? "translateY(-1px)" : "none",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ==================== Main Component ====================
export default function BakerySettings(): ReactNode {
  const [activeTab, setActiveTab] = useState<TabType>("location");
  const [shop, setShop] = useState<ShopData>(defaultShopData);
  const [coordInput, setCoordInput] = useState<string>("");

  // Delivery calculator
  const [calcLat, setCalcLat] = useState<string>("");
  const [calcLng, setCalcLng] = useState<string>("");
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  // Zone editor
  const [newZone, setNewZone] = useState<Omit<DeliveryZone, "id">>({
    name: "",
    minKm: 0,
    maxKm: 0,
    fee: 0,
    color: "#3b82f6",
  });
  const [showAddZone, setShowAddZone] = useState<boolean>(false);

  // ==================== SweetAlert: บันทึกข้อมูล ====================
  const handleSave = async (): Promise<void> => {
    if (!shop.shopName.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "กรุณากรอกข้อมูล",
        text: "ชื่อร้านไม่สามารถเว้นว่างได้",
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#8B5A2B",
      });
      return;
    }

    if (shop.lat === 0 && shop.lng === 0) {
      await Swal.fire({
        icon: "warning",
        title: "ยังไม่ได้ตั้งพิกัด",
        text: "กรุณาใส่พิกัดร้านก่อนบันทึก",
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#8B5A2B",
      });
      return;
    }

    const result = await Swal.fire({
      icon: "question",
      title: "ยืนยันการบันทึก?",
      text: "คุณต้องการบันทึกข้อมูลการตั้งค่าร้านหรือไม่",
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#8B5A2B",
      cancelButtonColor: "#9ca3af",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: "กำลังบันทึก...",
        text: "กรุณารอสักครู่",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // TODO: เปลี่ยนเป็น API call จริง เช่น await fetch("/api/settings", { ... })
      await new Promise((resolve) => setTimeout(resolve, 1200));

      await Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ!",
        text: "ข้อมูลร้านถูกอัปเดตเรียบร้อยแล้ว",
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#16a34a",
        timer: 2500,
        timerProgressBar: true,
      });
    }
  };

  // ==================== SweetAlert: ดึงพิกัด ====================
  const parseCoords = async (): Promise<void> => {
    const input = coordInput.trim();

    if (!input) {
      await Swal.fire({
        icon: "info",
        title: "กรุณาวางพิกัด",
        text: 'วาง "lat, lng" หรือ URL จาก Google Maps ในช่องด้านบน',
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#8B5A2B",
      });
      return;
    }

    // Try lat,lng format
    const match = input.match(/([-\d.]+)[,\s]+([-\d.]+)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      setShop((s) => ({ ...s, lat, lng }));
      setCoordInput("");
      await Swal.fire({
        icon: "success",
        title: "ดึงพิกัดสำเร็จ!",
        html: `<p style="margin:0">ละติจูด: <strong>${lat}</strong></p><p style="margin:0">ลองจิจูด: <strong>${lng}</strong></p>`,
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#16a34a",
        timer: 2000,
        timerProgressBar: true,
      });
      return;
    }

    // Try Google Maps URL
    const urlMatch = input.match(/@([-\d.]+),([-\d.]+)/);
    if (urlMatch) {
      const lat = parseFloat(urlMatch[1]);
      const lng = parseFloat(urlMatch[2]);
      setShop((s) => ({ ...s, lat, lng }));
      setCoordInput("");
      await Swal.fire({
        icon: "success",
        title: "ดึงพิกัดจาก URL สำเร็จ!",
        html: `<p style="margin:0">ละติจูด: <strong>${lat}</strong></p><p style="margin:0">ลองจิจูด: <strong>${lng}</strong></p>`,
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#16a34a",
        timer: 2000,
        timerProgressBar: true,
      });
      return;
    }

    await Swal.fire({
      icon: "error",
      title: "รูปแบบไม่ถูกต้อง",
      html: `
        <p>ไม่สามารถอ่านพิกัดจากข้อมูลที่วางได้</p>
        <p style="font-size:13px; color:#666;">รูปแบบที่รองรับ:</p>
        <p style="font-size:13px; color:#888;">• <code>13.7234, 100.5232</code></p>
        <p style="font-size:13px; color:#888;">• URL จาก Google Maps</p>
      `,
      confirmButtonText: "ลองใหม่",
      confirmButtonColor: "#8B5A2B",
    });
  };

  // ==================== SweetAlert: คำนวณค่าจัดส่ง ====================
  const calculateDelivery = async (): Promise<void> => {
    if (!calcLat || !calcLng) {
      await Swal.fire({
        icon: "warning",
        title: "กรุณากรอกพิกัดลูกค้า",
        text: "ใส่ละติจูดและลองจิจูดของลูกค้าเพื่อคำนวณ",
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#8B5A2B",
      });
      return;
    }

    const dist = haversineDistance(
      shop.lat,
      shop.lng,
      parseFloat(calcLat),
      parseFloat(calcLng),
    );
    const zone = shop.zones.find((z) => dist >= z.minKm && dist < z.maxKm);

    let fee = 0;
    let available = true;

    if (dist > shop.maxDeliveryRadius) {
      available = false;
    } else if (zone) {
      fee = zone.fee;
    } else {
      fee = shop.deliveryBasePrice + Math.ceil(dist) * shop.deliveryPerKm;
    }

    setCalcResult({ distance: dist, fee, available, zone });

    if (available) {
      await Swal.fire({
        icon: "success",
        title: "จัดส่งได้!",
        html: `
          <div style="text-align:center;">
            <p style="font-size:14px; color:#666;">ระยะทาง</p>
            <p style="font-size:28px; font-weight:800; color:#166534; margin:4px 0;">${dist.toFixed(2)} กม.</p>
            <p style="font-size:14px; color:#666; margin-top:12px;">ค่าจัดส่ง</p>
            <p style="font-size:28px; font-weight:800; color:${fee === 0 ? "#16a34a" : "#8B5A2B"}; margin:4px 0;">
              ${fee === 0 ? "ฟรี!" : `฿${fee}`}
            </p>
            ${zone ? `<p style="font-size:13px; color:#888; margin-top:8px;">อยู่ใน${zone.name}</p>` : ""}
          </div>
        `,
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#16a34a",
      });
    } else {
      await Swal.fire({
        icon: "error",
        title: "อยู่นอกพื้นที่จัดส่ง",
        html: `
          <p>ระยะทาง <strong>${dist.toFixed(2)} กม.</strong></p>
          <p style="color:#991b1b;">เกินรัศมีจัดส่ง ${shop.maxDeliveryRadius} กม.</p>
        `,
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  // ==================== SweetAlert: เพิ่มโซน ====================
  const addZone = async (): Promise<void> => {
    if (!newZone.name.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "กรุณากรอกชื่อโซน",
        text: "ชื่อโซนไม่สามารถเว้นว่างได้",
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#8B5A2B",
      });
      return;
    }

    if (newZone.maxKm <= newZone.minKm) {
      await Swal.fire({
        icon: "warning",
        title: "ระยะทางไม่ถูกต้อง",
        text: 'ระยะทาง "ถึง" ต้องมากกว่า "จาก"',
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#8B5A2B",
      });
      return;
    }

    const zoneName = newZone.name;
    setShop((s) => ({
      ...s,
      zones: [...s.zones, { ...newZone, id: Date.now() }],
    }));
    setNewZone({ name: "", minKm: 0, maxKm: 0, fee: 0, color: "#3b82f6" });
    setShowAddZone(false);

    await Swal.fire({
      icon: "success",
      title: "เพิ่มโซนสำเร็จ!",
      text: `เพิ่ม "${zoneName}" เรียบร้อยแล้ว`,
      confirmButtonText: "ตกลง",
      confirmButtonColor: "#16a34a",
      timer: 1500,
      timerProgressBar: true,
    });
  };

  // ==================== SweetAlert: ลบโซน ====================
  const deleteZone = async (id: number): Promise<void> => {
    const zone = shop.zones.find((z) => z.id === id);
    if (!zone) return;

    const result = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการลบ?",
      html: `คุณต้องการลบ <strong>"${zone.name}"</strong> หรือไม่<br/><span style="color:#dc2626; font-size:13px;">การกระทำนี้ไม่สามารถย้อนกลับได้</span>`,
      showCancelButton: true,
      confirmButtonText: "ลบเลย",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#9ca3af",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      setShop((s) => ({ ...s, zones: s.zones.filter((z) => z.id !== id) }));
      await Swal.fire({
        icon: "success",
        title: "ลบสำเร็จ!",
        text: `"${zone.name}" ถูกลบออกเรียบร้อยแล้ว`,
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#16a34a",
        timer: 1500,
        timerProgressBar: true,
      });
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(160deg, #fdf6ee 0%, #f5e6d0 30%, #ede0d4 60%, #fdf6ee 100%)",
        fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif",
        padding: "0",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .setting-card { animation: fadeIn 0.4s ease-out; }

        .input-field {
          width: 100%; padding: 12px 16px; border: 2px solid #e0d0c0;
          border-radius: 12px; font-size: 14px; font-family: 'Sarabun', sans-serif;
          background: #fffbf5; color: #3d2b1f; transition: all 0.2s;
          outline: none; box-sizing: border-box;
        }
        .input-field:focus { border-color: #8B5A2B; box-shadow: 0 0 0 4px rgba(139,90,43,0.1); }
        .input-field::placeholder { color: #b8a090; }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 24px; background: linear-gradient(135deg, #8B5A2B, #A0522D);
          color: white; border: none; border-radius: 12px; font-size: 14px;
          font-weight: 600; font-family: 'Sarabun', sans-serif; cursor: pointer;
          transition: all 0.2s; box-shadow: 0 4px 15px rgba(139,90,43,0.25);
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139,90,43,0.35); }

        .btn-secondary {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; background: transparent; color: #8B5A2B;
          border: 2px solid #d4a574; border-radius: 10px; font-size: 13px;
          font-weight: 600; font-family: 'Sarabun', sans-serif; cursor: pointer; transition: all 0.2s;
        }
        .btn-secondary:hover { background: rgba(139,90,43,0.08); border-color: #8B5A2B; }

        .btn-danger {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 6px 12px; background: transparent; color: #dc2626;
          border: 1.5px solid #fca5a5; border-radius: 8px; font-size: 12px;
          font-weight: 600; font-family: 'Sarabun', sans-serif; cursor: pointer; transition: all 0.2s;
        }
        .btn-danger:hover { background: #fef2f2; border-color: #dc2626; }

        .zone-row {
          display: flex; align-items: center; gap: 12px; padding: 14px 16px;
          background: #fffbf5; border-radius: 12px; border: 1.5px solid #e8ddd0; transition: all 0.2s;
        }
        .zone-row:hover { border-color: #d4a574; box-shadow: 0 2px 8px rgba(139,90,43,0.08); }

        .result-card { padding: 20px; border-radius: 16px; animation: fadeIn 0.4s ease-out; }

        * { box-sizing: border-box; }
      `}</style>

      {/* ===== Header ===== */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #3d2b1f 0%, #5a3825 50%, #8B5A2B 100%)",
          padding: "32px 40px 28px",
          color: "white",
        }}
      >
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "6px",
            }}
          >
            <span style={{ fontSize: "28px" }}>⚙️</span>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: 800,
                fontFamily: "'Playfair Display', serif",
                letterSpacing: "-0.5px",
              }}
            >
              Settings
            </h1>
          </div>
          <p
            style={{
              margin: 0,
              opacity: 0.7,
              fontSize: "14px",
              marginLeft: "42px",
            }}
          >
            จัดการข้อมูลร้าน ที่ตั้ง และการจัดส่ง
          </p>
        </div>
      </div>

      {/* ===== Content ===== */}
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "28px 24px 60px",
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            background: "rgba(255,255,255,0.7)",
            borderRadius: "16px",
            padding: "6px",
            marginBottom: "28px",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(212,165,116,0.3)",
          }}
        >
          <TabButton
            active={activeTab === "location"}
            icon={<MapPinIcon />}
            label="ที่ตั้งร้าน"
            onClick={() => setActiveTab("location")}
          />
          <TabButton
            active={activeTab === "delivery"}
            icon={<TruckIcon />}
            label="โซนจัดส่ง"
            onClick={() => setActiveTab("delivery")}
          />
          <TabButton
            active={activeTab === "calculator"}
            icon={<CalcIcon />}
            label="คำนวณค่าจัดส่ง"
            onClick={() => setActiveTab("calculator")}
          />
        </div>

        {/* ===================== TAB: Location ===================== */}
        {activeTab === "location" && (
          <div
            className="setting-card"
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.85)",
                borderRadius: "20px",
                padding: "28px",
                border: "1px solid rgba(212,165,116,0.25)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 20px rgba(139,90,43,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #8B5A2B, #D2691E)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                  }}
                >
                  <StoreIcon />
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#3d2b1f",
                  }}
                >
                  ข้อมูลร้าน
                </h2>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#6b5545",
                      marginBottom: "6px",
                    }}
                  >
                    ชื่อร้าน
                  </label>
                  <input
                    className="input-field"
                    value={shop.shopName}
                    onChange={(e) =>
                      setShop((s) => ({ ...s, shopName: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#6b5545",
                      marginBottom: "6px",
                    }}
                  >
                    เบอร์โทร
                  </label>
                  <input
                    className="input-field"
                    value={shop.phone}
                    onChange={(e) =>
                      setShop((s) => ({ ...s, phone: e.target.value }))
                    }
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#6b5545",
                      marginBottom: "6px",
                    }}
                  >
                    ที่อยู่
                  </label>
                  <input
                    className="input-field"
                    value={shop.address}
                    onChange={(e) =>
                      setShop((s) => ({ ...s, address: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.85)",
                borderRadius: "20px",
                padding: "28px",
                border: "1px solid rgba(212,165,116,0.25)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 20px rgba(139,90,43,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #dc2626, #ef4444)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                  }}
                >
                  <MapPinIcon />
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#3d2b1f",
                  }}
                >
                  พิกัดร้าน
                </h2>
              </div>
              <div
                style={{ display: "flex", gap: "10px", marginBottom: "20px" }}
              >
                <input
                  className="input-field"
                  placeholder='วาง "lat, lng" หรือ URL Google Maps ที่นี่'
                  value={coordInput}
                  onChange={(e) => setCoordInput(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn-primary" onClick={parseCoords}>
                  <TargetIcon /> ดึงพิกัด
                </button>
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: "#8B6914",
                  margin: "0 0 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                💡 คลิกขวาบน Google Maps → คัดลอกพิกัด แล้ววางที่นี่
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#6b5545",
                      marginBottom: "6px",
                    }}
                  >
                    ละติจูด (Latitude)
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    step="any"
                    value={shop.lat}
                    onChange={(e) =>
                      setShop((s) => ({
                        ...s,
                        lat: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#6b5545",
                      marginBottom: "6px",
                    }}
                  >
                    ลองจิจูด (Longitude)
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    step="any"
                    value={shop.lng}
                    onChange={(e) =>
                      setShop((s) => ({
                        ...s,
                        lng: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
              <StaticMap lat={shop.lat} lng={shop.lng} />
            </div>

            <button
              className="btn-primary"
              onClick={handleSave}
              style={{
                alignSelf: "flex-end",
                padding: "14px 32px",
                fontSize: "15px",
              }}
            >
              <SaveIcon /> บันทึกข้อมูลร้าน
            </button>
          </div>
        )}

        {/* ===================== TAB: Delivery Zones ===================== */}
        {activeTab === "delivery" && (
          <div
            className="setting-card"
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.85)",
                borderRadius: "20px",
                padding: "28px",
                border: "1px solid rgba(212,165,116,0.25)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 20px rgba(139,90,43,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                  }}
                >
                  <TruckIcon />
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#3d2b1f",
                  }}
                >
                  ตั้งค่าการจัดส่ง
                </h2>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#6b5545",
                      marginBottom: "6px",
                    }}
                  >
                    ค่าจัดส่งเริ่มต้น (บาท)
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    value={shop.deliveryBasePrice}
                    onChange={(e) =>
                      setShop((s) => ({
                        ...s,
                        deliveryBasePrice: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#6b5545",
                      marginBottom: "6px",
                    }}
                  >
                    ค่าจัดส่งต่อ กม. (บาท)
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    value={shop.deliveryPerKm}
                    onChange={(e) =>
                      setShop((s) => ({
                        ...s,
                        deliveryPerKm: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#6b5545",
                      marginBottom: "6px",
                    }}
                  >
                    รัศมีจัดส่งสูงสุด (กม.)
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    value={shop.maxDeliveryRadius}
                    onChange={(e) =>
                      setShop((s) => ({
                        ...s,
                        maxDeliveryRadius: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#6b5545",
                      marginBottom: "6px",
                    }}
                  >
                    ส่งฟรีเมื่อสั่งขั้นต่ำ (บาท)
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    value={shop.freeDeliveryMinOrder}
                    onChange={(e) =>
                      setShop((s) => ({
                        ...s,
                        freeDeliveryMinOrder: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.85)",
                borderRadius: "20px",
                padding: "28px",
                border: "1px solid rgba(212,165,116,0.25)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 20px rgba(139,90,43,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#3d2b1f",
                  }}
                >
                  🗺️ โซนจัดส่ง
                </h2>
                <button
                  className="btn-secondary"
                  onClick={() => setShowAddZone(!showAddZone)}
                >
                  <PlusIcon /> เพิ่มโซน
                </button>
              </div>

              {showAddZone && (
                <div
                  style={{
                    padding: "20px",
                    background: "linear-gradient(135deg, #fef9f0, #fdf3e3)",
                    borderRadius: "14px",
                    marginBottom: "16px",
                    border: "1.5px dashed #d4a574",
                    animation: "fadeIn 0.3s ease-out",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 14px",
                      fontWeight: 600,
                      fontSize: "14px",
                      color: "#5a3825",
                    }}
                  >
                    เพิ่มโซนใหม่
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
                      gap: "10px",
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#6b5545",
                          marginBottom: "4px",
                        }}
                      >
                        ชื่อโซน
                      </label>
                      <input
                        className="input-field"
                        placeholder="เช่น โซน D"
                        value={newZone.name}
                        onChange={(e) =>
                          setNewZone((z) => ({ ...z, name: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#6b5545",
                          marginBottom: "4px",
                        }}
                      >
                        จาก (กม.)
                      </label>
                      <input
                        className="input-field"
                        type="number"
                        value={newZone.minKm}
                        onChange={(e) =>
                          setNewZone((z) => ({
                            ...z,
                            minKm: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#6b5545",
                          marginBottom: "4px",
                        }}
                      >
                        ถึง (กม.)
                      </label>
                      <input
                        className="input-field"
                        type="number"
                        value={newZone.maxKm}
                        onChange={(e) =>
                          setNewZone((z) => ({
                            ...z,
                            maxKm: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#6b5545",
                          marginBottom: "4px",
                        }}
                      >
                        ค่าส่ง (฿)
                      </label>
                      <input
                        className="input-field"
                        type="number"
                        value={newZone.fee}
                        onChange={(e) =>
                          setNewZone((z) => ({
                            ...z,
                            fee: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <button
                      className="btn-primary"
                      onClick={addZone}
                      style={{ padding: "12px 20px" }}
                    >
                      เพิ่ม
                    </button>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {shop.zones.map((zone) => (
                  <div key={zone.id} className="zone-row">
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        background: zone.color,
                        flexShrink: 0,
                        boxShadow: `0 0 8px ${zone.color}50`,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <span
                        style={{
                          fontWeight: 600,
                          color: "#3d2b1f",
                          fontSize: "14px",
                        }}
                      >
                        {zone.name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#6b5545",
                        minWidth: "80px",
                      }}
                    >
                      {zone.minKm}-{zone.maxKm} กม.
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: zone.fee === 0 ? "#16a34a" : "#8B5A2B",
                        minWidth: "80px",
                        textAlign: "right",
                      }}
                    >
                      {zone.fee === 0 ? "ฟรี!" : `฿${zone.fee}`}
                    </span>
                    <button
                      className="btn-danger"
                      onClick={() => deleteZone(zone.id)}
                    >
                      <TrashIcon /> ลบ
                    </button>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: "24px",
                  padding: "24px",
                  background: "linear-gradient(135deg, #fef9f0, #fff)",
                  borderRadius: "16px",
                  border: "1px solid #e8ddd0",
                }}
              >
                <p
                  style={{
                    margin: "0 0 16px",
                    fontWeight: 600,
                    fontSize: "14px",
                    color: "#5a3825",
                    textAlign: "center",
                  }}
                >
                  แผนภาพรัศมีจัดส่ง
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "260px",
                      height: "260px",
                    }}
                  >
                    {[...shop.zones].reverse().map((zone) => {
                      const size = (zone.maxKm / shop.maxDeliveryRadius) * 240;
                      return (
                        <div
                          key={zone.id}
                          style={{
                            position: "absolute",
                            width: `${size}px`,
                            height: `${size}px`,
                            borderRadius: "50%",
                            border: `3px solid ${zone.color}`,
                            background: `${zone.color}15`,
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                          }}
                        />
                      );
                    })}
                    <div
                      style={{
                        position: "absolute",
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #8B5A2B, #D2691E)",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        boxShadow: "0 0 12px rgba(139,90,43,0.5)",
                        zIndex: 5,
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "20px",
                    marginTop: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  {shop.zones.map((zone) => (
                    <div
                      key={zone.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        color: "#5a3825",
                      }}
                    >
                      <div
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: zone.color,
                        }}
                      />
                      <span>{zone.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleSave}
              style={{
                alignSelf: "flex-end",
                padding: "14px 32px",
                fontSize: "15px",
              }}
            >
              <SaveIcon /> บันทึกการตั้งค่า
            </button>
          </div>
        )}

        {/* ===================== TAB: Calculator ===================== */}
        {activeTab === "calculator" && (
          <div
            className="setting-card"
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.85)",
                borderRadius: "20px",
                padding: "28px",
                border: "1px solid rgba(212,165,116,0.25)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 20px rgba(139,90,43,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                  }}
                >
                  <CalcIcon />
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#3d2b1f",
                  }}
                >
                  คำนวณค่าจัดส่ง
                </h2>
              </div>
              <p
                style={{
                  margin: "0 0 24px",
                  fontSize: "13px",
                  color: "#8a7668",
                  marginLeft: "48px",
                }}
              >
                ใส่พิกัดลูกค้าเพื่อคำนวณระยะทางและค่าจัดส่ง
              </p>

              <div
                style={{
                  padding: "14px 18px",
                  background: "linear-gradient(135deg, #fef9f0, #fdf3e3)",
                  borderRadius: "12px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  border: "1px solid #e8ddd0",
                }}
              >
                <span style={{ fontSize: "18px" }}>🏪</span>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#5a3825",
                    }}
                  >
                    {shop.shopName}
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#8a7668" }}>
                    พิกัด: {shop.lat}, {shop.lng}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr auto",
                  gap: "12px",
                  alignItems: "end",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#6b5545",
                      marginBottom: "6px",
                    }}
                  >
                    ละติจูดลูกค้า
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    step="any"
                    placeholder="เช่น 13.7563"
                    value={calcLat}
                    onChange={(e) => setCalcLat(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#6b5545",
                      marginBottom: "6px",
                    }}
                  >
                    ลองจิจูดลูกค้า
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    step="any"
                    placeholder="เช่น 100.5018"
                    value={calcLng}
                    onChange={(e) => setCalcLng(e.target.value)}
                  />
                </div>
                <button
                  className="btn-primary"
                  onClick={calculateDelivery}
                  style={{ padding: "12px 24px" }}
                >
                  <TargetIcon /> คำนวณ
                </button>
              </div>

              {calcResult && (
                <div
                  className="result-card"
                  style={{
                    marginTop: "24px",
                    background: calcResult.available
                      ? "linear-gradient(135deg, #f0fdf4, #dcfce7)"
                      : "linear-gradient(135deg, #fef2f2, #fecaca)",
                    border: `2px solid ${calcResult.available ? "#86efac" : "#fca5a5"}`,
                  }}
                >
                  {calcResult.available ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "16px",
                        }}
                      >
                        <span style={{ fontSize: "28px" }}>✅</span>
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "16px",
                              fontWeight: 700,
                              color: "#166534",
                            }}
                          >
                            จัดส่งได้!
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "13px",
                              color: "#15803d",
                            }}
                          >
                            อยู่ในพื้นที่บริการ
                            {calcResult.zone && ` — ${calcResult.zone.name}`}
                          </p>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            padding: "16px",
                            background: "rgba(255,255,255,0.8)",
                            borderRadius: "12px",
                            textAlign: "center",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontSize: "12px",
                              color: "#6b7280",
                              fontWeight: 500,
                            }}
                          >
                            ระยะทาง
                          </p>
                          <p
                            style={{
                              margin: "4px 0 0",
                              fontSize: "24px",
                              fontWeight: 800,
                              color: "#166534",
                            }}
                          >
                            {calcResult.distance.toFixed(2)}
                            <span style={{ fontSize: "14px", fontWeight: 500 }}>
                              {" "}
                              กม.
                            </span>
                          </p>
                        </div>
                        <div
                          style={{
                            padding: "16px",
                            background: "rgba(255,255,255,0.8)",
                            borderRadius: "12px",
                            textAlign: "center",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontSize: "12px",
                              color: "#6b7280",
                              fontWeight: 500,
                            }}
                          >
                            ค่าจัดส่ง
                          </p>
                          <p
                            style={{
                              margin: "4px 0 0",
                              fontSize: "24px",
                              fontWeight: 800,
                              color:
                                calcResult.fee === 0 ? "#16a34a" : "#8B5A2B",
                            }}
                          >
                            {calcResult.fee === 0
                              ? "ฟรี!"
                              : `฿${calcResult.fee}`}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span style={{ fontSize: "28px" }}>❌</span>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "16px",
                            fontWeight: 700,
                            color: "#dc2626",
                          }}
                        >
                          อยู่นอกพื้นที่จัดส่ง
                        </p>
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: "13px",
                            color: "#991b1b",
                          }}
                        >
                          ระยะทาง {calcResult.distance.toFixed(2)} กม.
                          (เกินรัศมี {shop.maxDeliveryRadius} กม.)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
