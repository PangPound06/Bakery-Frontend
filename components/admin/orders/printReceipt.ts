import { paymentMethodLabel } from "@/lib/payment";
import { formatPrice, orderCodeOf, splitQty } from "./orderUtils";
import type { Order, OrderItem } from "./types";

/** กันชื่อสินค้า/ชื่อลูกค้าที่มี < > & ทำ HTML ของใบเสร็จพัง (หรือแทรกสคริปต์) */
const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** พิมพ์ใบเสร็จขนาดเครื่องพิมพ์สลิป (กว้าง 80mm) ในหน้าต่างใหม่ */
export function printReceipt(order: Order, items: OrderItem[]) {
  const win = window.open("", "_blank");
  if (!win) return;

  // รายการที่ยกเลิกและคืนเงินไปแล้วต้องไม่อยู่บนใบเสร็จ — ไม่งั้นยอดจะไม่ตรงกับรายการ
  const itemsHtml = items
    .map((item) => {
      const { active } = splitQty(item);
      if (active === 0) return "";
      const name = escapeHtml(item.productName + (item.selectedOption ? ` (${item.selectedOption})` : ""));
      return `<div class="row"><span>${name}</span><span>x${active}</span><span>฿${(item.price * active).toLocaleString()}</span></div>`;
    })
    .join("");

  // ตัด emoji ออก เครื่องพิมพ์สลิปส่วนใหญ่พิมพ์ emoji ไม่ออก
  const paymentText = paymentMethodLabel(order.paymentMethod)
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .trim();
  const orderCode = orderCodeOf(order);
  const date = new Date(order.createdAt).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });

  win.document.write(`<html><head><title>ใบเสร็จ ${orderCode}</title>
    <style>
      body{font-family:'Courier New',monospace;font-size:12px;width:280px;margin:0 auto;padding:15px;}
      .center{text-align:center;}
      .bold{font-weight:bold;}
      .line{border-top:1px dashed #000;margin:8px 0;}
      .row{display:flex;justify-content:space-between;margin:3px 0;gap:8px;}
      .row span:first-child{flex:1;}
      .total-row{display:flex;justify-content:space-between;font-weight:bold;font-size:14px;margin:4px 0;}
      @media print{body{margin:0;}}
    </style></head><body>
    <div class="center bold" style="font-size:16px;">Pound Bakery</div>
    <div class="center" style="font-size:10px;color:#666;">ใบเสร็จรับเงิน</div>
    <div class="line"></div>
    <div class="row"><span>เลขที่: ${orderCode}</span></div>
    <div class="row"><span>วันที่: ${date}</span></div>
    <div class="row"><span>ลูกค้า: ${escapeHtml(order.receiverName || "-")}</span></div>
    <div class="row"><span>ช่องทาง: ${order.orderType === "pos" ? "หน้าร้าน" : "ออนไลน์"}</span></div>
    <div class="line"></div>
    ${itemsHtml}
    <div class="line"></div>
    <div class="total-row"><span>ยอดรวมสินค้า</span><span>฿${formatPrice(order.subtotal)}</span></div>
    ${order.shipping > 0 ? `<div class="row"><span>ค่าจัดส่ง</span><span>฿${formatPrice(order.shipping)}</span></div>` : ""}
    <div class="line"></div>
    <div class="total-row" style="font-size:16px;"><span>รวมทั้งหมด</span><span>฿${formatPrice(order.total)}</span></div>
    <div class="line"></div>
    <div class="row"><span>ชำระโดย: ${paymentText}</span></div>
    <div class="center" style="margin-top:15px;color:#666;font-size:10px;">ขอบคุณที่ใช้บริการ 🙏</div>
  </body></html>`);
  win.document.close();
  win.print();
}
