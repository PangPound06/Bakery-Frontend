import type { ReactNode } from "react";
import { isPaid, isPaymentLocked, paymentMethodLabel, paymentStatusBadge } from "@/lib/payment";
import ActionButtons from "./ActionButtons";
import OrderItemRow from "./OrderItemRow";
import { CloseIcon, PrinterIcon } from "./icons";
import {
  canEditItems,
  canRefundItems,
  customerNameOf,
  formatPrice,
  nextActionsFor,
  orderCodeOf,
  orderStatusBadge,
  showsAddItemSection,
  slipUrlOf,
} from "./orderUtils";
import type { Order, OrderAction, OrderItem } from "./types";

interface Props {
  order: Order;
  items: OrderItem[];
  loading: boolean;
  updating: boolean;
  onClose: () => void;
  onAction: (action: OrderAction) => void;
  onViewSlip: (url: string) => void;
  onPrint: () => void;
  onSaveItemQuantity: (item: OrderItem, quantity: number) => Promise<void>;
  onRemoveItem: (item: OrderItem) => void;
  onRefundItem: (item: OrderItem) => void;
  onAddProduct: () => void;
}

export default function OrderDetailModal(props: Props) {
  const { order, loading, onClose } = props;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 bg-amber-500 rounded-t-2xl">
          <h2 className="text-xl font-bold text-white">📋 คำสั่งซื้อ #{orderCodeOf(order)}</h2>
          <button onClick={onClose} className="p-2 hover:bg-amber-600 rounded-lg text-white" aria-label="ปิด">
            <CloseIcon />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <StatusSection {...props} />
            <ItemsSection {...props} />
            <TotalsSection order={order} />
            <PaymentSection order={order} onViewSlip={props.onViewSlip} />
            <DeliverySection order={order} />
            <Footer onClose={onClose} onPrint={props.onPrint} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatusSection({ order, updating, onAction }: Props) {
  const status = orderStatusBadge(order.orderStatus, order.orderType);
  const actions = nextActionsFor(order);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">สถานะปัจจุบัน</span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.className}`}>
          {status.icon} {status.text}
        </span>
      </div>
      {actions.length > 0 && (
        <div className="flex gap-2">
          <ActionButtons actions={actions} disabled={updating} onRun={onAction} variant="wide" />
        </div>
      )}
    </div>
  );
}

function ItemsSection({ order, items, onSaveItemQuantity, onRemoveItem, onRefundItem, onAddProduct }: Props) {
  const editable = canEditItems(order);
  const refundable = canRefundItems(order);
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-3">🛒 รายการสินค้า</p>
      <div className="space-y-2">
        {items.map((item) => (
          <OrderItemRow
            key={item.id}
            item={item}
            editable={editable}
            refundable={refundable}
            onSaveQuantity={onSaveItemQuantity}
            onRemove={onRemoveItem}
            onRefund={onRefundItem}
          />
        ))}
      </div>
      {showsAddItemSection(order) && <AddItemArea order={order} onAddProduct={onAddProduct} />}
    </div>
  );
}

/** เพิ่มสินค้าได้เฉพาะ order ที่ยังไม่มีเงินเกี่ยวข้อง — กรณีอื่นบอกเหตุผลแทนการซ่อนเฉยๆ */
function AddItemArea({ order, onAddProduct }: { order: Order; onAddProduct: () => void }) {
  if (isPaid(order.paymentStatus)) {
    return (
      <Notice>
        คำสั่งซื้อนี้ชำระเงินแล้ว เพิ่มของไม่ได้ เพราะเก็บเงินเพิ่มทีหลังไม่ได้
        <br />
        ถ้าของหมดหรือทำไม่ทัน กด 🗑 ที่รายการนั้นเพื่อตัดออกและคืนเงินเฉพาะส่วนนั้น
      </Notice>
    );
  }
  if (isPaymentLocked(order.paymentStatus)) {
    return <Notice>ลูกค้ากำลังชำระเงินหรือรอตรวจยอดโอน แก้ไขรายการไม่ได้</Notice>;
  }
  return (
    <button
      onClick={onAddProduct}
      className="w-full mt-2 py-2 border-2 border-dashed border-amber-300 text-amber-600 rounded-xl hover:bg-amber-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
    >
      ➕ เพิ่มสินค้าใน order นี้
    </button>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 text-center">
      {children}
    </div>
  );
}

function TotalsSection({ order }: { order: Order }) {
  const refunded = order.refundedAmount ?? 0;
  return (
    <div className="border-t pt-4 space-y-2">
      <div className="flex justify-between text-sm text-amber-800">
        <span>ยอดรวมสินค้า</span>
        <span>฿{formatPrice(order.subtotal)}</span>
      </div>
      <div className="flex justify-between text-sm text-amber-800">
        <span>ค่าจัดส่ง</span>
        <span className={order.shipping > 0 ? "text-red-500" : "text-green-600"}>
          {order.shipping > 0 ? `฿${formatPrice(order.shipping)}` : "ฟรี"}
        </span>
      </div>
      <div className="flex justify-between text-lg font-bold border-t pt-2">
        <span>ยอดรวม</span>
        <span className="text-amber-600">฿{formatPrice(order.total)}</span>
      </div>
      {refunded > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-1">
          <div className="flex justify-between text-sm text-red-600 font-medium">
            <span>คืนเงินไปแล้ว</span>
            <span>฿{formatPrice(refunded)}</span>
          </div>
          <p className="text-xs text-red-400 mt-0.5">
            ยอดรวมด้านบนปรับตามรายการที่เหลือแล้ว — ส่วนต่างคือค่าธรรมเนียมที่ไม่ได้คืน
          </p>
        </div>
      )}
    </div>
  );
}

function PaymentSection({ order, onViewSlip }: { order: Order; onViewSlip: (url: string) => void }) {
  const badge = paymentStatusBadge(order.paymentStatus);
  return (
    <div className="border-t pt-4">
      <p className="text-sm font-semibold text-gray-700 mb-2">💰 การชำระเงิน</p>
      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">วิธีชำระเงิน</span>
          <span>{paymentMethodLabel(order.paymentMethod)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">สถานะ</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>{badge.text}</span>
        </div>
      </div>
      {order.slipImage && (
        <button
          onClick={() => onViewSlip(slipUrlOf(order.slipImage))}
          className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium w-full"
        >
          🧾 ดูสลิปการโอนเงิน
        </button>
      )}
    </div>
  );
}

function DeliverySection({ order }: { order: Order }) {
  const rows: [string, string][] = [
    ["ชื่อผู้รับ", customerNameOf(order)],
    ["เบอร์โทร", order.receiverPhone || "-"],
    ["ที่อยู่", order.receiverAddress || "-"],
  ];
  if (order.note) rows.push(["หมายเหตุ", order.note]);
  return (
    <div className="border-t pt-4">
      <p className="text-sm font-semibold text-gray-700 mb-2">📦 ข้อมูลการสั่งซื้อ</p>
      <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
        {rows.map(([label, value]) => (
          <p key={label}>
            <span className="text-gray-500">{label}:</span> <span className="font-medium">{value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function Footer({ onClose, onPrint }: { onClose: () => void; onPrint: () => void }) {
  return (
    <div className="flex gap-3">
      <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-amber-800 rounded-xl hover:bg-gray-200 font-medium">
        ปิด
      </button>
      <button
        onClick={onPrint}
        className="flex-1 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-medium flex items-center justify-center gap-2"
      >
        <PrinterIcon />
        พิมพ์ใบเสร็จ
      </button>
    </div>
  );
}
