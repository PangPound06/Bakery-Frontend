"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink, Dialog, Spinner } from "@/components/ds";
import CartItemCard from "@/components/cart/CartItemCard";
import { shippingFeeFor } from "@/components/cart/cartUtils";
import { useCart } from "@/components/cart/useCart";
import { CART_PAGE, currentCartMode } from "@/lib/cart";
import { formatBaht } from "@/lib/dineIn";
import { useOrderMode } from "@/lib/useOrderMode";
import type { CartItem } from "@/types/cart";

/** ลบทีละรายการ หรือทั้งตะกร้า — ต้องยืนยันก่อน (ย้อนไม่ได้) */
type PendingRemoval = { kind: "item"; item: CartItem } | { kind: "all" };

/**
 * ตะกร้าสั่งออนไลน์ → ไปชำระเงินที่ /checkout (เลือกจัดส่ง / มารับที่ร้านในขั้นนั้น)
 *
 * ทานในร้านสั่งที่หน้า /dine-in — ลูกค้าที่อยู่โหมดทานในร้านถูกพาไปหน้านั้น
 * ยอดที่นี่เป็นแค่การแสดงผล ยอดจริง server คิดใหม่ตอนชำระเงิน
 */
export default function OnlineCartPage() {
  const router = useRouter();
  const mode = useOrderMode();
  const { cart, loading, busyId, error, updateQuantity, removeItem, clearAll } = useCart("online");
  const [pending, setPending] = useState<PendingRemoval | null>(null);

  // อยู่โหมดทานในร้าน → หน้าสั่งที่โต๊ะ (อ่าน localStorage ตรงๆ — รอบ hydrate hook ยังได้ค่าของ server)
  useEffect(() => {
    const current = currentCartMode();
    if (current !== "online") router.replace(CART_PAGE[current]);
  }, [mode, router]);

  const closeDialog = useCallback(() => setPending(null), []);

  const confirmRemoval = () => {
    if (!pending) return;
    if (pending.kind === "all") void clearAll();
    else void removeItem(pending.item.id);
    setPending(null);
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-brick">
        <Spinner className="size-10" />
      </div>
    );

  const items = cart?.items ?? [];
  const count = cart?.totalItems ?? 0;
  const subtotal = cart?.totalAmount ?? 0;
  const deliveryFee = shippingFeeFor(subtotal);

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <main className="mx-auto max-w-[1240px] px-4 pt-10 pb-28 sm:px-6 lg:pt-14 lg:pb-24">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3 lg:mb-10">
          <div>
            <h1 className="m-0 font-display text-[40px] font-bold sm:text-[56px]">ตะกร้า</h1>
            <p className="m-0 mt-1 text-muted">{count} ชิ้น · เลือกจัดส่งหรือมารับที่ร้านได้ตอนชำระเงิน</p>
          </div>
          {items.length > 0 && (
            <Button variant="danger" size="sm" disabled={busyId !== null} onClick={() => setPending({ kind: "all" })}>
              ล้างตะกร้า
            </Button>
          )}
        </div>

        {error && (
          <p role="alert" className="m-0 mb-5 rounded-2xl border border-danger-line bg-danger-soft px-4 py-3 text-danger">
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <div className="rounded-[28px] border-[1.5px] border-dashed border-line-strong px-6 py-16 text-center">
            <p className="m-0 mb-4 font-display text-[28px] font-bold">ตะกร้ายังว่างอยู่</p>
            <ButtonLink href="/menu" size="lg">
              ไปเลือกขนม
            </ButtonLink>
          </div>
        ) : (
          <div className="flex flex-wrap items-start gap-8 lg:gap-10">
            <ul className="m-0 flex min-w-0 flex-[999_1_560px] list-none flex-col gap-3.5 p-0">
              {items.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  allItems={items}
                  busy={busyId === item.id || busyId === "all"}
                  onQuantity={(q) => void updateQuantity(item.id, q)}
                  onRemove={() => setPending({ kind: "item", item })}
                />
              ))}
            </ul>

            <aside
              className="flex w-full min-w-0 flex-col gap-5 rounded-[32px] bg-ink p-7 text-cream sm:p-8 lg:sticky lg:top-24 lg:w-auto lg:flex-[1_1_340px]"
              aria-label="สรุปคำสั่งซื้อ"
            >
              <h2 className="m-0 font-display text-[26px] font-bold">สรุปคำสั่งซื้อ</h2>
              <dl className="m-0 flex flex-col gap-3 border-t border-ink-line pt-5 text-[15px]">
                <div className="flex justify-between">
                  <dt className="text-mist">ยอดสินค้า ({count} ชิ้น)</dt>
                  <dd className="m-0">{formatBaht(subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mist">ค่าจัดส่ง</dt>
                  <dd className="m-0 text-right">{deliveryFee === 0 ? "ส่งฟรี" : `${deliveryFee} ฿`}</dd>
                </div>
                <p className="m-0 text-[13px] text-faint">มารับที่ร้านไม่มีค่าส่ง · {shippingHint(subtotal)}</p>
              </dl>
              <div className="flex items-baseline justify-between border-t border-ink-line pt-5">
                <span>รวมถ้าจัดส่ง</span>
                <span className="text-[32px] font-bold">{formatBaht(subtotal + deliveryFee)}</span>
              </div>
              <ButtonLink href="/checkout" variant="primaryOnDark" size="lg" block>
                ไปชำระเงิน
              </ButtonLink>
              <ButtonLink href="/menu" variant="ghostOnDark" block>
                เลือกซื้อต่อ
              </ButtonLink>
            </aside>
          </div>
        )}
      </main>

      <Dialog
        open={pending !== null}
        onClose={closeDialog}
        title={pending?.kind === "all" ? "ล้างตะกร้า?" : "เอาออกจากตะกร้า?"}
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog}>
              ยังก่อน
            </Button>
            <Button onClick={confirmRemoval}>{pending?.kind === "all" ? "ล้างทั้งหมด" : "เอาออก"}</Button>
          </>
        }
      >
        <p className="m-0 text-[15px] text-subtle">
          {pending?.kind === "item"
            ? `${pending.item.productName}${pending.item.selectedOption ? ` (${pending.item.selectedOption})` : ""} จะถูกเอาออกจากตะกร้า`
            : "สินค้าทุกรายการจะถูกเอาออกจากตะกร้า"}
        </p>
      </Dialog>
    </div>
  );
}

/** สั่งเพิ่มอีกเท่าไรค่าส่งจะลดลง — ขั้นเดียวกับ shippingFeeFor */
const shippingHint = (subtotal: number) => {
  if (subtotal < 100) return `ซื้อเพิ่ม ${formatBaht(100 - subtotal)} ค่าส่งเหลือ 20 ฿`;
  if (subtotal <= 500) return `ซื้อเพิ่มอีกเกิน ${formatBaht(500 - subtotal)} ส่งฟรี`;
  return "ได้ส่งฟรีแล้ว";
};
