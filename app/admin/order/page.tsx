"use client";

import { useState } from "react";
import CancelRefundModal from "@/components/admin/CancelRefundModal";
import AddProductModal from "@/components/admin/orders/AddProductModal";
import OrderDetailModal from "@/components/admin/orders/OrderDetailModal";
import OrderFilters from "@/components/admin/orders/OrderFilters";
import OrderTable from "@/components/admin/orders/OrderTable";
import PageLoader from "@/components/admin/orders/PageLoader";
import SlipModal from "@/components/admin/orders/SlipModal";
import { printReceipt } from "@/components/admin/orders/printReceipt";
import { useAdminOrders } from "@/components/admin/orders/useAdminOrders";
import { useOrderActions } from "@/components/admin/orders/useOrderActions";
import { useOrderDetail } from "@/components/admin/orders/useOrderDetail";
import { useRequireAdmin } from "@/lib/useRequireAdmin";

/**
 * หน้าจัดการคำสั่งซื้อ (แอดมิน)
 *
 * หน้านี้แค่ประกอบชิ้นส่วน — ตรรกะอยู่ใน components/admin/orders/
 *  - useAdminOrders   รายการ + ตัวกรอง + แบ่งหน้า + poll
 *  - useOrderDetail   order ที่เปิดดูอยู่ + poll
 *  - useOrderActions  ทุกปุ่มที่เปลี่ยนข้อมูล (ถามยืนยัน → API → แจ้งผล)
 *  - orderUtils       ฟังก์ชันล้วน: ป้ายสถานะ ปุ่มที่กดได้ สิทธิ์แก้รายการ ช่วงเวลา
 */
export default function AdminOrdersPage() {
  useRequireAdmin();

  const list = useAdminOrders();
  const detail = useOrderDetail();
  const actions = useOrderActions(list.refresh, detail);
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [addingProduct, setAddingProduct] = useState(false);

  if (list.loading) return <PageLoader />;

  const { filters, summary } = list;
  const order = detail.order;
  const refundTarget = actions.refund.target;

  return (
    <div className="min-h-screen bg-amber-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-800 flex items-center gap-3">
            <span className="text-4xl">📦</span>Manage Orders
          </h1>
          <p className="text-amber-600 mt-1">คำสั่งซื้อทั้งหมด {summary.total} รายการ</p>
        </div>

        <OrderFilters
          dateRange={filters.dateRange}
          onDateRange={filters.setDateRange}
          customFrom={filters.customFrom}
          onCustomFrom={filters.setCustomFrom}
          customTo={filters.customTo}
          onCustomTo={filters.setCustomTo}
          status={filters.status}
          onStatus={filters.setStatus}
          statusCount={summary.statusCount}
          channel={filters.channel}
          onChannel={filters.setChannel}
          channelCount={summary.channelCount}
          search={filters.search}
          onSearch={filters.setSearch}
        />

        <OrderTable
          orders={list.orders}
          updating={actions.updating}
          onOpen={detail.open}
          onAction={actions.runAction}
          onViewSlip={setSlipUrl}
          pagination={list.pagination}
        />
      </div>

      {order && (
        <OrderDetailModal
          order={order}
          items={detail.items}
          loading={detail.loading}
          updating={actions.updating}
          onClose={() => {
            setAddingProduct(false);
            detail.close();
          }}
          onAction={(action) => actions.runAction(order, action)}
          onViewSlip={setSlipUrl}
          onPrint={() => printReceipt(order, detail.items)}
          onSaveItemQuantity={(item, quantity) => actions.items.saveQuantity(order, item, quantity)}
          onRemoveItem={(item) => actions.items.remove(order, item)}
          onRefundItem={(item) => actions.refund.open(order, item.id)}
          onAddProduct={() => setAddingProduct(true)}
        />
      )}

      {order && addingProduct && (
        <AddProductModal
          onClose={() => setAddingProduct(false)}
          onAdd={(product, option) => actions.items.add(order, product, option)}
        />
      )}

      {slipUrl && <SlipModal url={slipUrl} onClose={() => setSlipUrl(null)} />}

      {refundTarget && (
        <CancelRefundModal
          ordCode={refundTarget.ordCode}
          total={refundTarget.total}
          items={detail.items}
          preselectItemId={actions.refund.preselectItemId}
          onClose={actions.refund.close}
          onConfirm={(values) => actions.refund.submit(refundTarget.id, values)}
        />
      )}
    </div>
  );
}
