"use client";

import * as React from "react";

const VW = 1000; // virtual width for the viewBox

/** Catmull-Rom smoothed path (matches the design's chart smoothing). */
function buildPath(data: number[], h: number, pad: number) {
  const pts = data.map((v, i) => ({ v, i }));
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const iw = VW - pad * 2;
  const ih = h - pad * 2;
  const P = pts.map((p) => ({
    x: pad + (p.i / Math.max(data.length - 1, 1)) * iw,
    y: pad + (1 - (p.v - min) / range) * ih,
  }));
  let d = `M ${P[0].x.toFixed(2)} ${P[0].y.toFixed(2)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  const last = P[P.length - 1];
  return { line: d, last, baseY: h - pad, firstX: P[0].x };
}

/**
 * Responsive area line chart. Fills its container width; the stroke stays crisp
 * via vector-effect, and the end dot is positioned with CSS percentages.
 */
export function AreaChart({
  data,
  height = 210,
  color = "hsl(var(--violet))",
  fillOpacity = 0.22,
  strokeWidth = 2.5,
  showDot = true,
}: {
  data: number[];
  height?: number;
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  showDot?: boolean;
}) {
  const gid = React.useId().replace(/:/g, "");
  const series = data.length >= 2 ? data : data.length === 1 ? [data[0], data[0]] : [];
  if (series.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground"
        style={{ height }}
      >
        Performance history will appear here as it’s tracked.
      </div>
    );
  }

  const pad = 10;
  const { line, last, baseY, firstX } = buildPath(series, height, pad);
  const area = `${line} L ${last.x.toFixed(2)} ${baseY} L ${firstX.toFixed(2)} ${baseY} Z`;
  const dotTopPct = (last.y / height) * 100;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VW} ${height}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {showDot && (
        <span
          className="absolute"
          style={{
            right: 0,
            top: `${dotTopPct}%`,
            transform: "translate(-2px, -50%)",
          }}
        >
          <span
            className="block rounded-full"
            style={{ width: 9, height: 9, background: color }}
          />
          <span
            className="absolute rounded-full"
            style={{
              width: 18,
              height: 18,
              background: color,
              opacity: 0.18,
              top: -4.5,
              left: -4.5,
            }}
          />
        </span>
      )}
    </div>
  );
}
