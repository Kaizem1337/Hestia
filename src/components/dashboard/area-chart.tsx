"use client";

import * as React from "react";
import { formatCurrency } from "@/lib/utils";

const VW = 1000; // virtual width for the viewBox

export interface ChartPoint {
  t: string; // ISO timestamp
  value: number;
}

function smoothPath(ys: number[], h: number, pad: number) {
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const range = max - min || 1;
  const iw = VW - pad * 2;
  const ih = h - pad * 2;
  const P = ys.map((v, i) => ({
    x: pad + (i / Math.max(ys.length - 1, 1)) * iw,
    y: pad + (1 - (v - min) / range) * ih,
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
  return { line: d, P, baseY: h - pad };
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

/**
 * Responsive area line chart with a hover tooltip (date + value). Fills its
 * container width; stroke stays crisp via vector-effect.
 */
export function AreaChart({
  points,
  height = 210,
  currency = "USD",
  color = "hsl(var(--violet))",
  fillOpacity = 0.22,
  strokeWidth = 2.5,
}: {
  points: ChartPoint[];
  height?: number;
  currency?: string;
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
}) {
  const gid = React.useId().replace(/:/g, "");
  const ref = React.useRef<HTMLDivElement>(null);
  const [hover, setHover] = React.useState<{ idx: number; xPct: number } | null>(
    null
  );

  const series = points.length >= 2 ? points : points.length === 1 ? [points[0], points[0]] : [];
  const ys = series.map((p) => p.value);

  if (series.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground"
        style={{ height }}
      >
        No price history available for this view yet.
      </div>
    );
  }

  const pad = 10;
  const { line, P, baseY } = smoothPath(ys, height, pad);
  const last = P[P.length - 1];
  const area = `${line} L ${last.x.toFixed(2)} ${baseY} L ${P[0].x.toFixed(2)} ${baseY} Z`;

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const idx = Math.round(ratio * (series.length - 1));
    setHover({ idx, xPct: (idx / (series.length - 1)) * 100 });
  }

  const hp = hover ? series[hover.idx] : null;
  const hy = hover ? (P[hover.idx].y / height) * 100 : 0;

  return (
    <div
      ref={ref}
      className="relative w-full"
      style={{ height }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
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

      {/* end dot (only when not hovering) */}
      {!hover && (
        <span
          className="absolute"
          style={{ right: 0, top: `${(last.y / height) * 100}%`, transform: "translate(-2px, -50%)" }}
        >
          <span className="block rounded-full" style={{ width: 9, height: 9, background: color }} />
        </span>
      )}

      {/* hover guide + dot + tooltip */}
      {hover && hp && (
        <>
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-border"
            style={{ left: `${hover.xPct}%` }}
          />
          <span
            className="pointer-events-none absolute rounded-full ring-2 ring-background"
            style={{
              left: `${hover.xPct}%`,
              top: `${hy}%`,
              width: 10,
              height: 10,
              background: color,
              transform: "translate(-50%, -50%)",
            }}
          />
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-center shadow-lg"
            style={{
              left: `${Math.min(Math.max(hover.xPct, 10), 90)}%`,
              top: 0,
            }}
          >
            <div className="font-serif text-sm">
              {formatCurrency(hp.value, currency)}
            </div>
            <div className="text-[10px] text-muted-foreground">{fmtDate(hp.t)}</div>
          </div>
        </>
      )}
    </div>
  );
}
