import type { ComponentProps } from "react";
import Pagination from "@/components/ui/Pagination";
import { paymentStatusBadge } from "@/lib/payment";
import { receiveSummary } from "@/lib/receive";
import ActionButtons from "./ActionButtons";
import {
  channelBadge,
  customerNameOf,
  formatDateTime,
  formatPrice,
  nextActionsFor,
  orderCodeOf,
  orderStatusBadge,
  slipUrlOf,
} from "./orderUtils";
import type { Order, OrderAction } from "./types";

const COLUMNS = ["#ID", "ลูกค้า", "ยอดรวม", "ชำระเงิน", "สถานะ", "วันที่"];

interface Props {
  orders: Order[];
  updating: boolean;
  onOpen: (orderId: number) => void;
  onAction: (order: Order, action: OrderAction) => void;
  onViewSlip: (url: string) => void;
  pagination: ComponentProps<typeof Pagination>;
}

export default function OrderTable({ orders, updating, onOpen, onAction, onViewSlip, pagination }: Props) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-brick">
              {COLUMNS.map((title) => (
                <th key={title} className="px-4 py-4 text-left text-sm font-semibold text-white">
                  {title}
                </th>
              ))}
              <th className="px-4 py-4 text-center text-sm font-semibold text-white">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <OrderRow
                key={order.id}
                order={order}
                striped={index % 2 === 1}
                updating={updating}
                onOpen={onOpen}
                onAction={onAction}
                onViewSlip={onViewSlip}
              />
            ))}
          </tbody>
        </table>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-muted">ไม่พบคำสั่งซื้อ</p>
        </div>
      )}

      {/* แถบเปลี่ยนหน้า — อยู่ในการ์ดแถวล่างสุด ไม่ใช่ลอยข้างนอก */}
      <Pagination {...pagination} />
    </div>
  );
}

interface RowProps extends Omit<Props, "orders" | "pagination"> {
  order: Order;
  striped: boolean;
}

function OrderRow({ order, striped, updating, onOpen, onAction, onViewSlip }: RowProps) {
  const status = orderStatusBadge(order.orderStatus, order.orderType);
  const payment = paymentStatusBadge(order.paymentStatus);
  const channel = channelBadge(order.orderType);

  return (
    <tr className={`border-b border-line hover:bg-warn-bg ${striped ? "bg-warn-bg/50" : "bg-white"}`}>
      <td className="px-4 py-4 font-bold text-ink">#{orderCodeOf(order)}</td>

      <td className="px-4 py-4">
        <p className="font-medium text-body text-sm">{customerNameOf(order)}</p>
        <p className="text-xs text-muted">{order.email}</p>
        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${channel.className}`}>
          {channel.text}
        </span>
        {order.orderType !== "dine-in" && <p className="mt-1 text-xs text-subtle">{receiveSummary(order)}</p>}
      </td>

      <td className="px-4 py-4 font-semibold text-brick">฿{formatPrice(order.total)}</td>

      <td className="px-4 py-4">
        <div className="space-y-1">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${payment.className}`}>{payment.text}</span>
          {order.slipImage && (
            <button
              onClick={() => onViewSlip(slipUrlOf(order.slipImage))}
              className="block text-xs text-new-ink hover:underline"
            >
              🧾 ดูสลิป
            </button>
          )}
        </div>
      </td>

      <td className="px-4 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.className}`}>
          {status.icon} {status.text}
        </span>
      </td>

      <td className="px-4 py-4 text-xs text-muted">{formatDateTime(order.createdAt)}</td>

      <td className="px-4 py-4">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onOpen(order.id)}
            className="px-3 py-1.5 bg-warn-soft text-body rounded-lg hover:bg-warn-line text-xs font-medium"
          >
            🔍 รายละเอียด
          </button>
          <ActionButtons
            actions={nextActionsFor(order)}
            disabled={updating}
            onRun={(action) => onAction(order, action)}
            variant="compact"
          />
        </div>
      </td>
    </tr>
  );
}
