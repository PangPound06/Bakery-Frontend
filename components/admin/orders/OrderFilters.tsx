import { SearchIcon } from "./icons";
import type { ChannelKey, DateRangeKey } from "./types";

const DATE_RANGES: { key: DateRangeKey; label: string }[] = [
  { key: "today", label: "วันนี้" },
  { key: "7d", label: "7 วัน" },
  { key: "30d", label: "30 วัน" },
  { key: "month", label: "เดือนนี้" },
  { key: "year", label: "ปีนี้" },
  { key: "all", label: "ทั้งหมด" },
  { key: "custom", label: "กำหนดเอง" },
];

const STATUS_CARDS = [
  { key: "all", label: "ทั้งหมด", icon: "📋", color: "bg-gray-100" },
  { key: "pending", label: "รอดำเนินการ", icon: "⏳", color: "bg-yellow-100" },
  { key: "confirmed", label: "ยืนยันแล้ว", icon: "✅", color: "bg-blue-100" },
  { key: "preparing", label: "กำลังเตรียม", icon: "👨‍🍳", color: "bg-indigo-100" },
  { key: "shipping", label: "กำลังจัดส่ง", icon: "🚚", color: "bg-purple-100" },
  { key: "delivered", label: "สั่งซื้อสำเร็จ", icon: "🎉", color: "bg-green-100" },
  { key: "cancel_requested", label: "รอยกเลิก", icon: "⏸️", color: "bg-orange-100" },
  { key: "cancelled", label: "ยกเลิก", icon: "❌", color: "bg-red-100" },
];

const CHANNELS: { key: ChannelKey; label: string; icon: string }[] = [
  { key: "all", label: "ทั้งหมด", icon: "📋" },
  { key: "online", label: "ออนไลน์", icon: "🌐" },
  { key: "pos", label: "หน้าร้าน", icon: "🏪" },
  { key: "dine-in", label: "ในร้าน", icon: "🪑" },
  { key: "dine-in-alacarte", label: "A la carte", icon: "🍜" },
  { key: "dine-in-buffet", label: "Buffet", icon: "🍱" },
];

const DATE_INPUT =
  "border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400";

interface Props {
  dateRange: DateRangeKey;
  onDateRange: (range: DateRangeKey) => void;
  customFrom: string;
  onCustomFrom: (value: string) => void;
  customTo: string;
  onCustomTo: (value: string) => void;
  status: string;
  onStatus: (status: string) => void;
  statusCount: (status: string) => number;
  channel: ChannelKey;
  onChannel: (channel: ChannelKey) => void;
  channelCount: (channel: ChannelKey) => number;
  search: string;
  onSearch: (value: string) => void;
}

/** ช่วงเวลา + การ์ดสถานะ + แท็บช่องทาง + ช่องค้นหา */
export default function OrderFilters(props: Props) {
  return (
    <>
      <DateRangeBar {...props} />
      <StatusCards {...props} />
      <ChannelTabs {...props} />

      <div className="bg-white rounded-2xl p-4 mb-6 shadow-md">
        <div className="relative">
          <input
            type="text"
            placeholder="ค้นหา Order ID, อีเมล, ชื่อผู้รับ..."
            value={props.search}
            onChange={(e) => props.onSearch(e.target.value)}
            className="w-full px-4 py-3 pl-12 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-400" />
        </div>
      </div>
    </>
  );
}

function DateRangeBar({ dateRange, onDateRange, customFrom, onCustomFrom, customTo, onCustomTo }: Props) {
  return (
    <div className="bg-white rounded-2xl p-4 mb-6 shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-amber-800 flex items-center gap-1 mr-1">📅 ช่วงเวลา:</span>
        {DATE_RANGES.map((range) => (
          <button
            key={range.key}
            onClick={() => onDateRange(range.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              dateRange === range.key
                ? "bg-amber-500 text-white shadow-md"
                : "bg-gray-50 text-gray-600 hover:bg-amber-50 hover:text-amber-700"
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {dateRange === "custom" && (
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100">
          <label className="text-sm text-gray-600 flex items-center gap-2">
            จาก
            <input type="date" value={customFrom} onChange={(e) => onCustomFrom(e.target.value)} className={DATE_INPUT} />
          </label>
          <label className="text-sm text-gray-600 flex items-center gap-2">
            ถึง
            <input type="date" value={customTo} onChange={(e) => onCustomTo(e.target.value)} className={DATE_INPUT} />
          </label>
        </div>
      )}
    </div>
  );
}

function StatusCards({ status, onStatus, statusCount }: Props) {
  return (
    <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3 mb-6">
      {STATUS_CARDS.map((card) => (
        <button
          key={card.key}
          onClick={() => onStatus(card.key)}
          className={`p-2 md:p-3 rounded-xl text-center transition-all ${
            status === card.key ? "ring-2 ring-amber-500 shadow-md" : "hover:shadow-md"
          } ${card.color}`}
        >
          <div className="text-xl md:text-2xl">{card.icon}</div>
          <div className="text-[10px] md:text-xs font-medium mt-1 leading-tight">{card.label}</div>
          <div className="text-base md:text-lg font-bold">{statusCount(card.key)}</div>
        </button>
      ))}
    </div>
  );
}

function ChannelTabs({ channel, onChannel, channelCount }: Props) {
  return (
    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
      {CHANNELS.map((item) => {
        const active = channel === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onChannel(item.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              active
                ? "bg-amber-500 text-white shadow-md"
                : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                active ? "bg-amber-600 text-amber-100" : "bg-amber-100 text-amber-700"
              }`}
            >
              {channelCount(item.key)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
