import type { OrderAction } from "./types";

interface Props {
  actions: OrderAction[];
  disabled: boolean;
  onRun: (action: OrderAction) => void;
  /** compact = ปุ่มเล็กเรียงลงในตาราง / wide = ปุ่มเต็มแถวในโมดัล */
  variant: "compact" | "wide";
}

export default function ActionButtons({ actions, disabled, onRun, variant }: Props) {
  const size = variant === "compact" ? "px-3 py-1.5 text-xs" : "flex-1 px-4 py-2 text-sm";
  return (
    <>
      {actions.map((action) => (
        <button
          key={action.kind + action.label}
          disabled={disabled}
          onClick={() => onRun(action)}
          className={`${size} rounded-lg font-medium transition-all disabled:opacity-50 ${action.color}`}
        >
          {action.label}
        </button>
      ))}
    </>
  );
}
