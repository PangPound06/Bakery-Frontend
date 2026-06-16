"use client";

import { useRef, useState } from "react";

/**
 * ครอบการ์ดให้เอียงตามเมาส์ + มีแสงวิ่ง (subtle/มินิมอล)
 *  - max = องศาเอียงสูงสุด (ค่าน้อย = เนียน)
 */
export default function TiltCard({
  children,
  className = "",
  max = 6,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(
    "perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)",
  );
  const [glare, setGlare] = useState({ x: 50, y: 50, o: 0 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (py - 0.5) * -2 * max;
    const ry = (px - 0.5) * 2 * max;
    setTransform(
      `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(1.02)`,
    );
    setGlare({ x: px * 100, y: py * 100, o: 0.12 });
  };

  const reset = () => {
    setTransform("perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)");
    setGlare((g) => ({ ...g, o: 0 }));
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={`relative h-full transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{ transform }}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-200"
        style={{
          opacity: glare.o,
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.85), transparent 45%)`,
        }}
      />
    </div>
  );
}