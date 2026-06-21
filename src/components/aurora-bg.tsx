"use client";

import { useEffect, useRef } from "react";

/**
 * Subtle "aurora" particle constellation rendered on a fixed, full-viewport
 * canvas behind all content.
 *
 * Deliberately unobtrusive and safe:
 *  - `pointer-events: none` + low opacity, so it never blocks clicks or hurts
 *    readability (content sits on opaque cards above it).
 *  - Desktop: gentle drifting dots linked into a web; the web also reaches
 *    toward the cursor (no physics that could run away).
 *  - Mobile / reduced-motion: a single static frame, no animation loop, no
 *    pointer listeners — no battery drain or scroll jank.
 *  - Caps device pixel ratio and particle count; pauses when the tab is hidden.
 */
export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const context = el.getContext("2d");
    if (!context) return;
    // Non-null typed locals so the nested draw closures don't trip strict null checks.
    const cv: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = context;

    const COLORS = ["167,139,250", "110,231,208"]; // violet, teal (rgb)
    const LINK_DIST = 130;
    const MOUSE_DIST = 170;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;
    const animate = !reduced && !isMobile;

    let width = 0;
    let height = 0;
    let raf = 0;
    let particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      c: number;
    }[] = [];
    const mouse = { x: -9999, y: -9999, active: false };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      cv.width = Math.floor(width * dpr);
      cv.height = Math.floor(height * dpr);
      cv.style.width = `${width}px`;
      cv.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const base = isMobile ? 24 : 64;
      const count = Math.max(
        10,
        Math.min(base, Math.round((width * height) / 26000))
      );
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.4 + 0.8,
        c: Math.random() < 0.5 ? 0 : 1,
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const n = particles.length;

      for (let i = 0; i < n; i++) {
        const p = particles[i];
        if (animate) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -10) p.x = width + 10;
          else if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          else if (p.y > height + 10) p.y = -10;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${COLORS[p.c]},0.5)`;
        ctx.fill();
      }

      for (let i = 0; i < n; i++) {
        const a = particles[i];
        for (let j = i + 1; j < n; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST * LINK_DIST) {
            const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.16;
            ctx.strokeStyle = `rgba(${COLORS[a.c]},${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      if (mouse.active) {
        for (let i = 0; i < n; i++) {
          const p = particles[i];
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MOUSE_DIST * MOUSE_DIST) {
            const alpha = (1 - Math.sqrt(d2) / MOUSE_DIST) * 0.3;
            ctx.strokeStyle = `rgba(${COLORS[p.c]},${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }
    }

    function loop() {
      draw();
      raf = requestAnimationFrame(loop);
    }
    function onMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }
    function onLeave() {
      mouse.active = false;
    }
    function onVisibility() {
      cancelAnimationFrame(raf);
      if (!document.hidden && animate) raf = requestAnimationFrame(loop);
    }

    resize();

    if (!animate) {
      draw(); // single static frame
      return () => {};
    }

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.45 }}
    />
  );
}
