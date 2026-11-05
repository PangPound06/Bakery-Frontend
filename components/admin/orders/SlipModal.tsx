interface Props {
  url: string;
  onClose: () => void;
}

export default function SlipModal({ url, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl p-4 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-amber-700">🧾 สลิปการโอนเงิน</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="ปิด">
            ✕
          </button>
        </div>
        <img
          src={url}
          alt="Payment Slip"
          className="w-full rounded-lg"
          onError={(e) => {
            e.currentTarget.removeAttribute("src");
            e.currentTarget.alt = "ไม่สามารถโหลดรูปสลิปได้";
          }}
        />
      </div>
    </div>
  );
}
