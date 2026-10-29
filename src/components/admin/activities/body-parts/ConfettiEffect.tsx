"use client";

import { useEffect, useRef } from "react";

type ConfettiPiece = {
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  shape: "circle" | "square" | "strip";
};

const COLORS = [
  "#f59e0b", // Gold
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#f97316", // Orange
  "#06b6d4", // Cyan
];

export function ConfettiEffect({ count = 80 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      pieces.push({
        x: width / 2 + (Math.random() * 60 - 30),
        y: height * 0.35 + (Math.random() * 40 - 20),
        size: Math.random() * 8 + 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        alpha: 1,
        decay: Math.random() * 0.012 + 0.008,
        shape: Math.random() > 0.6 ? "circle" : Math.random() > 0.3 ? "square" : "strip",
      });
    }

    let animId: number;
    function render() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      let alive = false;
      for (const p of pieces) {
        if (p.alpha <= 0) continue;
        alive = true;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravity
        p.vx *= 0.98; // air resistance
        p.rotation += p.rotationSpeed;
        p.alpha = Math.max(0, p.alpha - p.decay);

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "square") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2.5);
        }

        ctx.restore();
      }

      if (alive) {
        animId = requestAnimationFrame(render);
      }
    }

    animId = requestAnimationFrame(render);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-50 h-full w-full"
    />
  );
}

