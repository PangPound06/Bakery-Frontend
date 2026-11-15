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
  { key: "all", label: "ทั้งหมด", icon: "📋", color: "bg-sand" },
  { key: "pending", label: "รอดำเนินการ", icon: "⏳", color: "bg-warn-soft" },
  { key: "confirmed", label: "ยืนยันแล้ว", icon: "✅", color: "bg-new-soft" },
  { key: "preparing", label: "กำลังเตรียม", icon: "👨‍🍳", color: "bg-new-soft" },
  { key: "shipping", label: "กำลังจัดส่ง", icon: "🚚", color: "bg-new-soft" },
  { key: "delivered", label: "สั่งซื้อสำเร็จ", icon: "🎉", color: "bg-success-soft" },
  { key: "cancel_requested", label: "รอยกเลิก", icon: "⏸️", color: "bg-warn-soft" },
  { key: "cancelled", label: "ยกเลิก", icon: "❌", color: "bg-danger-soft" },
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
  "border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brick";

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
            className="w-full px-4 py-3 pl-12 bg-warn-bg border border-line rounded-xl text-ink placeholder-faint focus:outline-none focus:ring-2 focus:ring-brick"
          />
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-apricot" />
        </div>
      </div>
    </>
  );
}

function DateRangeBar({ dateRange, onDateRange, customFrom, onCustomFrom, customTo, onCustomTo }: Props) {
  return (
    <div className="bg-white rounded-2xl p-4 mb-6 shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink flex items-center gap-1 mr-1">📅 ช่วงเวลา:</span>
        {DATE_RANGES.map((range) => (
          <button
            key={range.key}
            onClick={() => onDateRange(range.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              dateRange === range.key
                ? "bg-brick text-white shadow-md"
                : "bg-sand text-subtle hover:bg-warn-bg hover:text-body"
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {dateRange === "custom" && (
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-line">
          <label className="text-sm text-subtle flex items-center gap-2">
            จาก
            <input type="date" value={customFrom} onChange={(e) => onCustomFrom(e.target.value)} className={DATE_INPUT} />
          </label>
          <label className="text-sm text-subtle flex items-center gap-2">
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
            status === card.key ? "ring-2 ring-brick shadow-md" : "hover:shadow-md"
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
              active
                ? "bg-brick text-white"
                : "bg-white text-body border border-line hover:bg-warn-bg"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                active ? "bg-brick text-cream" : "bg-warn-soft text-body"
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
