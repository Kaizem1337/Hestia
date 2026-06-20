"use client";

import * as React from "react";

export interface DonutDatum {
  color: string;
  value: number;
}

export function Donut({
  data,
  size = 190,
  thickness = 26,
  gap = 3,
  track = "hsl(var(--card-foreground) / 0.06)",
  glow = true,
  children,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  gap?: number;
  track?: string;
  glow?: boolean;
  children?: React.ReactNode;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;

  const segs = data
    .filter((d) => d.value > 0)
    .map((d, i) => {
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
          strokeWidth={thickness}
          strokeDasharray={dash}
          strokeDashoffset={-offset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      );
      offset += len;
      return el;
    });

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/*
        Glow is applied as a CSS filter on the <svg> root (not an SVG filter on
        a child) so the blur is NOT clipped to the SVG filter region — that
        clipping is what produced the rectangular "overcast" box.
      */}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}
