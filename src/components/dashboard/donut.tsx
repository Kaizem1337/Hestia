"use client";

import * as React from "react";
import { formatCurrency } from "@/lib/utils";

export interface DonutDatum {
  color: string;
  value: number;
  label?: string;
}

export function Donut({
  data,
  size = 190,
  thickness = 26,
  gap = 3,
  track = "hsl(var(--card-foreground) / 0.06)",
  glow = true,
  currency,
  children,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  gap?: number;
  track?: string;
  glow?: boolean;
  currency?: string;
  children?: React.ReactNode;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const [hover, setHover] = React.useState<number | null>(null);
  const [pos, setPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  let offset = 0;
  const visible = data.filter((d) => d.value > 0);
  const segs = visible.map((d, i) => {
    const len = (d.value / total) * circ;
    const dash = `${Math.max(len - gap, 0)} ${circ - Math.max(len - gap, 0)}`;
    const el = (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={d.color}
        strokeWidth={hover === i ? thickness + 4 : thickness}
        strokeDasharray={dash}
        strokeDashoffset={-offset}
        strokeLinecap="butt"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ cursor: "pointer", transition: "stroke-width 0.12s ease" }}
        onMouseEnter={() => setHover(i)}
      />
    );
    offset += len;
    return el;
  });

  const hd = hover !== null ? visible[hover] : null;

  return (
    <div
      style={{ position: "relative", width: size, height: size }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseLeave={() => setHover(null)}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          overflow: "visible",
          filter: glow
            ? "drop-shadow(0 0 5px rgba(167,139,250,0.5)) drop-shadow(0 0 13px rgba(167,139,250,0.32))"
            : undefined,
        }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={thickness}
        />
        {segs}
      </svg>
      {children && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
      {hd && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-center shadow-lg"
          style={{ left: pos.x, top: pos.y - 8 }}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: hd.color }}
            />
            {hd.label ?? "—"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {((hd.value / total) * 100).toFixed(1)}%
            {currency ? ` · ${formatCurrency(hd.value, currency, { compact: true })}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}
