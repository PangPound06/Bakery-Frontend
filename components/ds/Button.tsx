import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import Spinner from "./Spinner";

/**
 * ปุ่มตามลำดับความสำคัญของดีไซน์ (หลักการออกแบบ ข้อ 3)
 *
 * primary         ส้มอิฐทึบ — 1 ปุ่มต่อหน้าจอเท่านั้น
 * primaryOnDark   ปุ่มหลักในกล่องพื้นมืด (ส้มอ่อน)
 * secondary       เส้นขอบ — ทางเลือกอื่นของหน้า
 * secondaryOnDark เส้นขอบบนพื้นมืด
 * danger          เส้นแดง — การกระทำที่ย้อนไม่ได้ (ต้องถามยืนยันก่อนเสมอ)
 * ghost           ปุ่มข้อความ
 * ghostOnDark     ปุ่มข้อความบนพื้นมืด
 */
export type ButtonVariant =
  | "primary"
  | "primaryOnDark"
  | "secondary"
  | "secondaryOnDark"
  | "danger"
  | "ghost"
  | "ghostOnDark";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brick text-white hover:bg-brick-hover focus-visible:outline-brick disabled:bg-line disabled:text-muted",
  primaryOnDark:
    "bg-apricot text-ink hover:bg-apricot-hover focus-visible:outline-apricot disabled:bg-ink-line disabled:text-faint",
  secondary:
    "border-[1.5px] border-ink text-ink hover:bg-ink/5 focus-visible:outline-ink disabled:border-line-strong disabled:text-muted",
  secondaryOnDark:
    "border-[1.5px] border-ink-edge text-cream hover:bg-white/5 focus-visible:outline-apricot disabled:text-faint",
  danger:
    "border-[1.5px] border-danger-line text-danger hover:bg-danger-soft focus-visible:outline-danger disabled:opacity-50",
  ghost: "text-muted hover:text-ink focus-visible:outline-ink disabled:opacity-50",
  ghostOnDark: "text-mist hover:text-cream focus-visible:outline-apricot disabled:opacity-50",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-12 px-6 text-[15px]",
  lg: "min-h-14 px-8 text-[17px]",
};

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** เต็มความกว้าง (ปุ่มติดขอบล่างบนมือถือ / ปุ่มในกล่องสรุป) */
  block?: boolean;
  className?: string;
}

export const buttonClass = ({ variant = "primary", size = "md", block, className }: StyleProps) =>
  cx(BASE, VARIANTS[variant], SIZES[size], block && "w-full", className);

interface ButtonProps extends StyleProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  /** กำลังทำงาน — ปุ่มกดไม่ได้และขึ้นวงหมุนหน้าข้อความ */
  loading?: boolean;
}

export function Button({ variant, size, block, className, loading, disabled, children, type, ...rest }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, block, className })}
      {...rest}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends StyleProps {
  href: string;
  children: ReactNode;
}

/** ลิงก์ที่หน้าตาเป็นปุ่ม — ใช้เมื่อปุ่มพาไปหน้าอื่น */
export function ButtonLink({ href, children, ...style }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClass(style)}>
      {children}
    </Link>
  );
}
