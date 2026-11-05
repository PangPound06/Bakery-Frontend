export default function PageLoader() {
  return (
    <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-full animate-spin"
          style={{
            borderWidth: 3,
            borderStyle: "solid",
            borderColor: "#f59e0b transparent transparent transparent",
          }}
        />
        <p className="text-amber-700 text-sm font-medium">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );
}
