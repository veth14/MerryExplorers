"use client";

import { useEffect, useRef } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

// ── MediaPipe Landmark Indices ─────────────────────────────────────────────
// 36 outer silhouette points forming the face oval
const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];

// Key biometric anchor nodes (eyes, eyebrows, nose, mouth, chin, forehead)
const BIOMETRIC_ANCHOR_INDICES = [
  10,   // Forehead top
  70,   // Left brow peak
  300,  // Right brow peak
  33,   // Left eye inner
  133,  // Left eye outer
  263,  // Right eye outer
  362,  // Right eye inner
  168,  // Glabella (between eyes)
  4,    // Nose tip
  61,   // Mouth left corner
  291,  // Mouth right corner
  0,    // Upper lip center
  17,   // Lower lip center
  152,  // Chin bottom
  234,  // Left cheek
  454,  // Right cheek
];

// Elegant biometric mesh triangulation pairs (diamond wireframe aesthetic)
const MESH_PAIRS: [number, number][] = [
  // Brow & forehead
  [10, 70], [10, 300], [70, 168], [300, 168],
  // Eyes to nose bridge
  [33, 168], [168, 362], [33, 133], [362, 263],
  // Nose structure
  [168, 4], [4, 61], [4, 291],
  // Cheeks to mouth & chin
  [234, 61], [454, 291], [61, 152], [291, 152],
  // Lip line
  [61, 0], [0, 291], [61, 17], [17, 291],
];

// ── Component Props ────────────────────────────────────────────────────────

interface FaceOverlayProps {
  /** The landmarks array from useFaceDetection (null = no face). */
  faceLandmarks: NormalizedLandmark[][] | null;
  /** Whether a face has been confirmed — controls color theme and HUD state. */
  faceDetected: boolean;
  /** Mirrored? Must match the video transform so points align with selfie feed. */
  mirrored?: boolean;
}

export function FaceOverlay({
  faceLandmarks,
  faceDetected,
  mirrored = true,
}: FaceOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Store latest props in refs so the RAF loop always accesses current data
  const landmarksRef = useRef(faceLandmarks);
  const detectedRef = useRef(faceDetected);
  const mirroredRef = useRef(mirrored);
  landmarksRef.current = faceLandmarks;
  detectedRef.current = faceDetected;
  mirroredRef.current = mirrored;

  // Track state transitions for success animations (ripple pulse)
  const prevDetectedRef = useRef(faceDetected);
  const rippleStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = (timeMs: number) => {
      const landmarks = landmarksRef.current?.[0] ?? null;
      const isDetected = detectedRef.current;
      const isMirrored = mirroredRef.current;

      // Handle lock-on transition for success ripple
      if (isDetected && !prevDetectedRef.current) {
        rippleStartTimeRef.current = timeMs;
      }
      prevDetectedRef.current = isDetected;

      // Ensure canvas matches client display size with DPR scaling
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const displayW = Math.round(rect.width);
      const displayH = Math.round(rect.height);

      if (displayW === 0 || displayH === 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
        canvas.width = displayW * dpr;
        canvas.height = displayH * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayW, displayH);

      const w = displayW;
      const h = displayH;
      const timeSec = timeMs / 1000;

      // Transform normalized coordinates
      const lx = (lm: NormalizedLandmark) => (isMirrored ? (1 - lm.x) * w : lm.x * w);
      const ly = (lm: NormalizedLandmark) => lm.y * h;

      // ─── 1. NO FACE: Render Apple Face ID Alignment Guide & Laser Scan ───
      if (!landmarks || !isDetected) {
        const guideCx = w / 2;
        const guideCy = h / 2 - 10;
        const guideRx = Math.min(w * 0.28, 110);
        const guideRy = Math.min(h * 0.38, 150);

        // Gentle breathing animation
        const breath = Math.sin(timeSec * 2.5) * 3;
        const curRx = guideRx + breath;
        const curRy = guideRy + breath * 1.3;

        // Biometric Alignment Head Silhouette Guide
        ctx.save();
        ctx.setLineDash([8, 8]);
        ctx.lineDashOffset = -timeSec * 14; // smooth rotating dash feel
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(56, 189, 248, 0.45)";
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.ellipse(guideCx, guideCy, curRx, curRy, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 4 Sleek Outer Reticle Accents around the Guide
        const cornerPad = 12;
        const retX1 = guideCx - curRx - cornerPad;
        const retX2 = guideCx + curRx + cornerPad;
        const retY1 = guideCy - curRy - cornerPad;
        const retY2 = guideCy + curRy + cornerPad;
        const retLen = 16;

        ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";

        // Top-left
        ctx.beginPath();
        ctx.moveTo(retX1, retY1 + retLen);
        ctx.lineTo(retX1, retY1);
        ctx.lineTo(retX1 + retLen, retY1);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(retX2 - retLen, retY1);
        ctx.lineTo(retX2, retY1);
        ctx.lineTo(retX2, retY1 + retLen);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(retX1, retY2 - retLen);
        ctx.lineTo(retX1, retY2);
        ctx.lineTo(retX1 + retLen, retY2);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(retX2 - retLen, retY2);
        ctx.lineTo(retX2, retY2);
        ctx.lineTo(retX2, retY2 - retLen);
        ctx.stroke();

        // Horizontal Sweeping Laser Beam (Searching Mode)
        const scanT = (Math.sin(timeSec * 2.8) + 1) / 2;
        const laserY = guideCy - curRy + scanT * (curRy * 2);
        const laserW = curRx * 2 + 10;
        const laserX = guideCx - laserW / 2;

        // Gradient laser tail
        const beamGrad = ctx.createLinearGradient(0, laserY - 26, 0, laserY);
        beamGrad.addColorStop(0, "rgba(56, 189, 248, 0)");
        beamGrad.addColorStop(1, "rgba(56, 189, 248, 0.22)");
        ctx.fillStyle = beamGrad;
        ctx.fillRect(laserX, laserY - 26, laserW, 26);

        // Core laser glowing line
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(laserX, laserY);
        ctx.lineTo(laserX + laserW, laserY);
        ctx.strokeStyle = "rgba(186, 230, 253, 0.95)";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();

        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      // ─── 2. FACE CONFIRMED: Render High-End Apple Face ID Mesh & HUD ───────

      // Calculate face bounding box & center
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      FACE_OVAL_INDICES.forEach((idx) => {
        const pt = landmarks[idx];
        if (!pt) return;
        const x = lx(pt);
        const y = ly(pt);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });

      const faceCx = (minX + maxX) / 2;
      const faceCy = (minY + maxY) / 2;

      // Success Ripple Animation on Initial Lock-on
      if (rippleStartTimeRef.current !== null) {
        const elapsed = timeMs - rippleStartTimeRef.current;
        const dur = 750;
        if (elapsed < dur) {
          const progress = elapsed / dur;
          const rippleRadius = 40 + progress * 130;
          const alpha = (1 - progress) * 0.75;

          ctx.save();
          ctx.beginPath();
          ctx.arc(faceCx, faceCy, rippleRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`;
          ctx.lineWidth = 3 * (1 - progress) + 1;
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 16;
          ctx.stroke();
          ctx.restore();
        } else {
          rippleStartTimeRef.current = null;
        }
      }

      // A. Smooth Spline Closed Face Oval
      // Transforms the 36 polygon coordinates into an organic, smooth curved silhouette
      const ovalPoints = FACE_OVAL_INDICES.map((idx) => {
        const pt = landmarks[idx];
        return { x: lx(pt), y: ly(pt) };
      });

      if (ovalPoints.length > 2) {
        ctx.beginPath();
        const firstMidX = (ovalPoints[0].x + ovalPoints[ovalPoints.length - 1].x) / 2;
        const firstMidY = (ovalPoints[0].y + ovalPoints[ovalPoints.length - 1].y) / 2;
        ctx.moveTo(firstMidX, firstMidY);

        for (let i = 0; i < ovalPoints.length; i++) {
          const next = ovalPoints[(i + 1) % ovalPoints.length];
          const midX = (ovalPoints[i].x + next.x) / 2;
          const midY = (ovalPoints[i].y + next.y) / 2;
          ctx.quadraticCurveTo(ovalPoints[i].x, ovalPoints[i].y, midX, midY);
        }
        ctx.closePath();

        // Soft emerald bloom inside the oval
        ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
        ctx.fill();

        // Radiant emerald stroke
        ctx.save();
        ctx.strokeStyle = "rgba(16, 185, 129, 0.9)";
        ctx.lineWidth = 2.2;
        ctx.shadowColor = "#10b981";
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.restore();
      }

      // B. Subtle 3D Geometric Mesh Connectors
      ctx.save();
      ctx.strokeStyle = "rgba(52, 211, 153, 0.22)";
      ctx.lineWidth = 1;
      MESH_PAIRS.forEach(([a, b]) => {
        const p1 = landmarks[a];
        const p2 = landmarks[b];
        if (!p1 || !p2) return;
        ctx.beginPath();
        ctx.moveTo(lx(p1), ly(p1));
        ctx.lineTo(lx(p2), ly(p2));
        ctx.stroke();
      });
      ctx.restore();

      // C. Biometric Anchor Nodes (Glowing Apple-Style Micro-Nodes)
      BIOMETRIC_ANCHOR_INDICES.forEach((idx) => {
        const pt = landmarks[idx];
        if (!pt) return;
        const x = lx(pt);
        const y = ly(pt);

        // Outer translucent ring
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(52, 211, 153, 0.3)";
        ctx.fill();

        // Inner solid core node
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      });

      // D. Eye Centers Crosshair / Tracking Focus
      // Left eye (468 or midpoint of 33 & 133), Right eye (473 or midpoint of 362 & 263)
      const leftEyeMid = {
        x: (lx(landmarks[33]) + lx(landmarks[133])) / 2,
        y: (ly(landmarks[33]) + ly(landmarks[133])) / 2,
      };
      const rightEyeMid = {
        x: (lx(landmarks[362]) + lx(landmarks[263])) / 2,
        y: (ly(landmarks[362]) + ly(landmarks[263])) / 2,
      };

      [leftEyeMid, rightEyeMid].forEach((eye) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(eye.x, eye.y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(110, 231, 183, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "#34d399";
        ctx.shadowBlur = 8;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(eye.x, eye.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();
      });

      // E. Dynamic Face-Tracking Reticle Brackets (Framing the user's face)
      const boxPad = 18;
      const bx1 = minX - boxPad;
      const bx2 = maxX + boxPad;
      const by1 = minY - boxPad;
      const by2 = maxY + boxPad;
      const bLen = Math.min((bx2 - bx1) * 0.16, 22);

      ctx.save();
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(16, 185, 129, 0.6)";
      ctx.shadowBlur = 10;

      // Top-Left Bracket
      ctx.beginPath();
      ctx.moveTo(bx1, by1 + bLen);
      ctx.lineTo(bx1, by1);
      ctx.lineTo(bx1 + bLen, by1);
      ctx.stroke();

      // Top-Right Bracket
      ctx.beginPath();
      ctx.moveTo(bx2 - bLen, by1);
      ctx.lineTo(bx2, by1);
      ctx.lineTo(bx2, by1 + bLen);
      ctx.stroke();

      // Bottom-Left Bracket
      ctx.beginPath();
      ctx.moveTo(bx1, by2 - bLen);
      ctx.lineTo(bx1, by2);
      ctx.lineTo(bx1 + bLen, by2);
      ctx.stroke();

      // Bottom-Right Bracket
      ctx.beginPath();
      ctx.moveTo(bx2 - bLen, by2);
      ctx.lineTo(bx2, by2);
      ctx.lineTo(bx2, by2 - bLen);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 10 }}
    />
  );
}
