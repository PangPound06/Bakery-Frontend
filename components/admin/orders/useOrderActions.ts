"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { isPaid } from "@/lib/payment";
import type { CancelRefundValues } from "@/components/admin/CancelRefundModal";
import * as api from "./orderApi";
import { formatPrice, orderCodeOf } from "./orderUtils";
import type { Order, OrderAction, OrderItem, Product, ProductOption } from "./types";
import type { useOrderDetail } from "./useOrderDetail";

const ORANGE = "#f97316";
const GREEN = "#22c55e";
const RED = "#ef4444";
const GRAY = "#6b7280";

const showError = (title: string, text: string) =>
  Swal.fire({ icon: "error", title, text, confirmButtonColor: ORANGE });

const confirmDialog = async (options: {
  title: string;
  text?: string;
  html?: string;
  confirmText: string;
  confirmColor: string;
  cancelText?: string;
  icon?: "warning" | "question";
}) => {
  const result = await Swal.fire({
    icon: options.icon ?? "warning",
    title: options.title,
    text: options.text,
    html: options.html,
    showCancelButton: true,
    confirmButtonColor: options.confirmColor,
    cancelButtonColor: GRAY,
    confirmButtonText: options.confirmText,
    cancelButtonText: options.cancelText ?? "ปิด",
  });
  return result.isConfirmed;
};

/** หน้าอื่นที่โชว์ stock (เช่น POS) ฟัง event นี้แล้วโหลดสินค้าใหม่ */
const notifyStockChanged = () => {
  localStorage.setItem("stockUpdated", Date.now().toString());
  window.dispatchEvent(new Event("storage"));
};

type Detail = ReturnType<typeof useOrderDetail>;

/**
 * ทุกปุ่มที่เปลี่ยนข้อมูล order — ถามยืนยัน → เรียก API → แจ้งผล → โหลดข้อมูลใหม่
 *
 * @param refreshList โหลดตารางใหม่หลังทำรายการสำเร็จ
 * @param detail      โมดัลรายละเอียด (อัปเดตยอด/รายการทันทีโดยไม่ต้องรอ poll)
 */
export function useOrderActions(refreshList: () => void, detail: Detail) {
  const [updating, setUpdating] = useState(false);
  const [refundTarget, setRefundTarget] = useState<Order | null>(null);
  /** กดถังขยะที่รายการไหน ให้โมดัลคืนเงินติ๊กรายการนั้นมาให้เลย */
  const [refundPreselect, setRefundPreselect] = useState<number | null>(null);

  const afterChange = (orderId: number) => {
    refreshList();
    detail.reloadIfOpen(orderId);
  };

  /** กันกดซ้ำระหว่างรอ backend + จับ error เชื่อมต่อไม่ได้ที่เดียว */
  const withUpdating = async (task: () => Promise<void>, networkError: string) => {
    setUpdating(true);
    try {
      await task();
    } catch {
      showError("เกิดข้อผิดพลาด", networkError);
    } finally {
      setUpdating(false);
    }
  };

  // ─── สถานะ ───────────────────────────────────────────────

  const updateStatus = async (order: Order, orderStatus: string, paymentStatus?: string) => {
    if (orderStatus === "confirmed") {
      const ok = await confirmDialog({
        title: "ยืนยันคำสั่งซื้อ?",
        text: "ต้องการยืนยันคำสั่งซื้อนี้หรือไม่?",
        confirmText: "✅ ยืนยัน",
        confirmColor: ORANGE,
      });
      if (!ok) return;
    }
    if (orderStatus === "delivered") {
      const ok = await confirmDialog({
        title: "ยืนยันการชำระเงิน?",
        text: "ยืนยันว่าลูกค้าชำระเงินเรียบร้อยแล้ว?",
        confirmText: "✅ ยืนยัน",
        confirmColor: GREEN,
      });
      if (!ok) return;
    }

    await withUpdating(async () => {
      const result = await api.updateOrderStatus(order.id, orderStatus, paymentStatus);
      if (!result.ok) {
        showError("เกิดข้อผิดพลาด", api.errorText(result, "ไม่สามารถอัพเดทสถานะได้"));
        return;
      }
      notifyStockChanged();
      if (orderStatus === "confirmed") {
        await Swal.fire({
          icon: "success",
          title: "✅ ยืนยันคำสั่งซื้อสำเร็จ!",
          text: "ขั้นตอนถัดไป: เริ่มเตรียมสินค้า 👨‍🍳",
          confirmButtonColor: ORANGE,
          confirmButtonText: "รับทราบ",
        });
      }
      if (orderStatus === "delivered") {
        await Swal.fire({
          icon: "success",
          title: "✅ ยืนยันการชำระเงินสำเร็จ!",
          text: "ขอบคุณที่ใช้บริการ Pound Bakery 🧁",
          confirmButtonColor: GREEN,
          confirmButtonText: "รับทราบ",
        });
      }
      afterChange(order.id);
    }, "ไม่สามารถอัพเดทสถานะได้");
  };

  /**
   * ยกเลิกโดยแอดมิน — แยกสองทางตามว่าเก็บเงินไปแล้วหรือยัง
   *
   * ยังไม่จ่าย → PUT /cancel (backend คืน stock) ไม่มีเงินให้คืน
   * จ่ายแล้ว → เปิดโมดัลเลือกยกเลิกทั้งใบหรือบางรายการ แล้วคืนเงินตามนั้น
   */
  const cancel = async (order: Order) => {
    if (isPaid(order.paymentStatus)) {
      openRefund(order, null);
      return;
    }
    const ok = await confirmDialog({
      title: "ยกเลิกคำสั่งซื้อ?",
      text: "Stock จะถูกคืนอัตโนมัติ ต้องการยกเลิกหรือไม่?",
      confirmText: "ยกเลิกคำสั่งซื้อ",
      confirmColor: RED,
      cancelText: "ไม่ยกเลิก",
    });
    if (!ok) return;

    await withUpdating(async () => {
      const result = await api.cancelOrder(order.id);
      if (!result.ok) {
        showError("เกิดข้อผิดพลาด", api.errorText(result, "ไม่สามารถยกเลิกได้"));
        return;
      }
      notifyStockChanged();
      await Swal.fire({
        icon: "success",
        title: "ยกเลิกสำเร็จ",
        text: "ยกเลิกคำสั่งซื้อสำเร็จ (Stock คืนแล้ว)",
        timer: 1000,
        showConfirmButton: false,
      });
      afterChange(order.id);
    }, "ไม่สามารถยกเลิกได้");
  };

  /**
   * ยืนยัน / ปฏิเสธยอดโอนพร้อมเพย์ — แอดมินต้องเช็กยอดในแอปธนาคารของร้านก่อนกด
   * ปฏิเสธแล้ว backend คืน stock และปิด order ให้เอง
   */
  const decideTransfer = async (order: Order, decision: "confirm" | "reject") => {
    const code = orderCodeOf(order);
    const result =
      decision === "confirm"
        ? await Swal.fire({
            icon: "question",
            title: "ยืนยันรับเงิน?",
            html: `ตรวจแล้วว่ามียอดโอน <b>฿${formatPrice(order.total)}</b> ของ ${code} เข้าบัญชีร้าน`,
            showCancelButton: true,
            confirmButtonColor: GREEN,
            cancelButtonColor: GRAY,
            confirmButtonText: "✅ ได้รับเงินแล้ว",
            cancelButtonText: "ปิด",
          })
        : await Swal.fire({
            icon: "warning",
            title: "ไม่พบยอดโอน?",
            text: `คำสั่งซื้อ ${code} จะถูกยกเลิกและคืน stock`,
            input: "text",
            inputPlaceholder: "เหตุผล (เช่น ยอดไม่ตรง / ไม่พบยอด)",
            showCancelButton: true,
            confirmButtonColor: RED,
            cancelButtonColor: GRAY,
            confirmButtonText: "ยกเลิกคำสั่งซื้อ",
            cancelButtonText: "ปิด",
          });
    if (!result.isConfirmed) return;

    await withUpdating(async () => {
      const response = await api.decideTransfer(order.id, decision, result.value || "");
      if (!response.ok) {
        showError("ดำเนินการไม่สำเร็จ", api.errorText(response, "ลองใหม่อีกครั้ง"));
        return;
      }
      await Swal.fire({
        icon: "success",
        title: decision === "confirm" ? "ยืนยันรับเงินแล้ว" : "ยกเลิกคำสั่งซื้อแล้ว",
        timer: 1500,
        showConfirmButton: false,
      });
      afterChange(order.id);
    }, "เชื่อมต่อ server ไม่ได้");
  };

  const runAction = (order: Order, action: OrderAction) => {
    switch (action.kind) {
      case "status":
        return updateStatus(order, action.orderStatus, action.paymentStatus);
      case "cancel":
        return cancel(order);
      case "confirm-transfer":
        return decideTransfer(order, "confirm");
      case "reject-transfer":
        return decideTransfer(order, "reject");
    }
  };

  // ─── คืนเงิน ──────────────────────────────────────────────

  /** โมดัลคืนเงินใช้รายการของ order จากโมดัลรายละเอียด — กดจากตารางต้องเปิดรายละเอียดให้ด้วย */
  const openRefund = (order: Order, itemId: number | null) => {
    if (detail.order?.id !== order.id) detail.open(order.id);
    setRefundPreselect(itemId);
    setRefundTarget(order);
  };

  const closeRefund = () => {
    setRefundTarget(null);
    setRefundPreselect(null);
  };

  /**
   * ยกเลิก+คืนเงิน — backend บันทึกลง tb_cancel_requests + tb_refunds เหมือนเคสที่ลูกค้าขอเอง
   * ประวัติจึงไล่ดูย้อนหลังได้ที่เดียว ไม่มีเงินออกทางลับ
   */
  const submitRefund = async (orderId: number, values: CancelRefundValues): Promise<boolean> => {
    try {
      const result = await api.cancelAndRefund(orderId, values);
      if (!result.ok) {
        await showError("คืนเงินไม่สำเร็จ", api.errorText(result, "ลองใหม่อีกครั้ง"));
        return false;
      }
      notifyStockChanged();
      await Swal.fire({
        icon: "success",
        title: "ยกเลิกและคืนเงินแล้ว",
        text: result.data.message,
        confirmButtonColor: ORANGE,
      });
      afterChange(orderId);
      return true;
    } catch {
      await showError("เชื่อมต่อ server ไม่ได้", "ตรวจสอบใน Stripe Dashboard ก่อนกดซ้ำ");
      return false;
    }
  };

  // ─── แก้รายการ (order ที่ยังไม่จ่าย) ───────────────────────

  const saveItemQuantity = async (order: Order, item: OrderItem, quantity: number) => {
    try {
      const result = await api.updateItemQuantity(order.id, item.id, quantity);
      if (!result.ok) {
        showError("แก้ไขไม่สำเร็จ", api.errorText(result, "ลองใหม่อีกครั้ง"));
        return;
      }
      detail.setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity } : i)));
      detail.applyTotals(result.data.newSubtotal, result.data.newTotal);
      refreshList();
    } catch {
      showError("แก้ไขไม่สำเร็จ", "เชื่อมต่อ server ไม่ได้");
    }
  };

  const removeItem = async (order: Order, item: OrderItem) => {
    const ok = await confirmDialog({
      title: "ลบสินค้า?",
      text: `ต้องการลบ "${item.productName}" ออกจากคำสั่งซื้อ? Stock จะถูกคืนอัตโนมัติ`,
      confirmText: "ลบสินค้า",
      confirmColor: RED,
      cancelText: "ยกเลิก",
    });
    if (!ok) return;

    try {
      const result = await api.removeItem(order.id, item.id);
      if (!result.ok) {
        showError("เกิดข้อผิดพลาด", api.errorText(result, "ไม่สามารถลบสินค้าได้"));
        return;
      }
      notifyStockChanged();
      if (result.data.cancelled) {
        await Swal.fire({
          icon: "info",
          title: "ยกเลิกอัตโนมัติ",
          text: "ไม่มีสินค้าเหลือ คำสั่งซื้อถูกยกเลิกอัตโนมัติ",
          confirmButtonColor: ORANGE,
        });
        detail.close();
      } else {
        detail.setItems((prev) => prev.filter((i) => i.id !== item.id));
        detail.applyTotals(result.data.newSubtotal, result.data.newTotal);
      }
      refreshList();
    } catch {
      showError("เกิดข้อผิดพลาด", "ไม่สามารถลบสินค้าได้");
    }
  };

  /** @returns true ถ้าเพิ่มสำเร็จ (ให้โมดัลเลือกสินค้าปิดตัวเอง) */
  const addProduct = async (order: Order, product: Product, option: ProductOption | null) => {
    try {
      const result = await api.addItem(order.id, {
        productId: product.id,
        productName: product.name,
        price: product.price + (option?.extraPrice ?? 0),
        quantity: 1,
        selectedOption: option?.name ?? null,
        image: product.image,
      });
      if (!result.ok) {
        showError("เพิ่มไม่สำเร็จ", api.errorText(result, "ลองใหม่อีกครั้ง"));
        return false;
      }
      detail.setItems((prev) => [...prev, result.data.newItem]);
      detail.applyTotals(result.data.newSubtotal, result.data.newTotal);
      refreshList();
      return true;
    } catch {
      showError("เพิ่มไม่สำเร็จ", "เชื่อมต่อ server ไม่ได้");
      return false;
    }
  };

  return {
    updating,
    runAction,
    refund: { target: refundTarget, preselectItemId: refundPreselect, open: openRefund, close: closeRefund, submit: submitRefund },
    items: { saveQuantity: saveItemQuantity, remove: removeItem, add: addProduct },
  };
}
