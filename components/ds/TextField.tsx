"use client";

import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

export type FieldTone = "neutral" | "error" | "ok";

const BORDER: Record<FieldTone, string> = {
  neutral: "border-line-strong focus:border-ink",
  error: "border-error focus:border-error",
  ok: "border-ok focus:border-ok",
};

const HELP: Record<FieldTone, string> = {
  neutral: "text-muted",
  error: "text-error",
  ok: "text-ok",
};

interface Common {
  label: string;
  /** ข้อความใต้ช่อง — บอกสิ่งที่ต้องกรอกหรือผลการตรวจ (หลักการออกแบบ ข้อ 4) */
  help?: string;
  tone?: FieldTone;
}

type InputProps = Common & { multiline?: false } & Omit<InputHTMLAttributes<HTMLInputElement>, "className">;
type AreaProps = Common & { multiline: true } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

const BASE =
  "w-full rounded-[14px] border-[1.5px] bg-cream px-4 text-base text-ink outline-none transition-colors placeholder:text-faint disabled:opacity-60";

/** ช่องกรอกพร้อมป้ายชื่อและข้อความช่วย — ข้อความช่วยผูกกับช่องด้วย aria-describedby */
export default function TextField(props: InputProps | AreaProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const { label, help, tone = "neutral" } = props;
  const described = help ? helpId : undefined;
  const invalid = tone === "error" || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      {props.multiline ? (
        <TextArea id={id} described={described} invalid={invalid} tone={tone} props={props} />
      ) : (
        <Input id={id} described={described} invalid={invalid} tone={tone} props={props} />
      )}
      {help && (
        <span id={helpId} className={cx("text-[13px]", HELP[tone])}>
          {help}
        </span>
      )}
    </div>
  );
}

interface Inner<P> {
  id: string;
  described?: string;
  invalid?: true;
  tone: FieldTone;
  props: P;
}

function Input({ id, described, invalid, tone, props }: Inner<InputProps>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { label, help, tone: _tone, multiline, ...rest } = props;
  return (
    <input
      id={id}
      aria-describedby={described}
      aria-invalid={invalid}
      className={cx(BASE, "h-[50px]", BORDER[tone])}
      {...rest}
    />
  );
}

function TextArea({ id, described, invalid, tone, props }: Inner<AreaProps>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { label, help, tone: _tone, multiline, ...rest } = props;
  return (
    <textarea
      id={id}
      aria-describedby={described}
      aria-invalid={invalid}
      className={cx(BASE, "min-h-[96px] py-3 leading-relaxed", BORDER[tone])}
      {...rest}
    />
  );
}
