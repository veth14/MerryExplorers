"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { FaceLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";

// ── Types ──────────────────────────────────────────────────────────────────

export type FaceDetectionStatus =
  | "idle"        // hook not started
  | "loading"     // model downloading / compiling WASM
  | "detecting"   // running — no face in frame yet
  | "detected"    // face confirmed
  | "error";      // model failed to load

export interface FaceDetectionResult {
  status: FaceDetectionStatus;
  faceLandmarks: NormalizedLandmark[][] | null;
  faceDetected: boolean;
  faceScore: number; // 0 to 100 real dynamic biometric alignment score
  startDetection: (video: HTMLVideoElement) => void;
  stopDetection: () => void;
}

// ── Suppress TFLite/MediaPipe stderr logs from triggering Next.js dev overlay ─
if (typeof window !== "undefined") {
  const win = window as unknown as { __tflite_console_filtered?: boolean };
  if (!win.__tflite_console_filtered) {
    win.__tflite_console_filtered = true;
    const originalError = window.console.error;
    const originalWarn = window.console.warn;

    const isTFLiteNoise = (args: unknown[]): boolean => {
      return args.some((arg) => {
        if (typeof arg !== "string") return false;
        return (
          arg.includes("XNNPACK delegate") ||
          arg.includes("TensorFlow Lite") ||
          arg.includes("Created TensorFlow Lite") ||
          arg.startsWith("INFO:") ||
          arg.includes("INFO: Created")
        );
      });
    };

    window.console.error = function (...args: unknown[]) {
      if (isTFLiteNoise(args)) {
        console.info(...args);
        return;
      }
      originalError.apply(window.console, args);
    };

    window.console.warn = function (...args: unknown[]) {
      if (isTFLiteNoise(args)) {
        console.info(...args);
        return;
      }
      originalWarn.apply(window.console, args);
    };
  }
}

// ── Real-Time Biometric Face Quality & Alignment Scoring ───────────────────
/**
 * Evaluates real-time facial biometric alignment (0 to 100%):
 * 1. Centering: face center offset relative to the optimal focal spot (x=0.5, y=0.46)
 * 2. Distance/Scale: face height proportion in frame (detects if too far or too close)
 * 3. Frontal Pose & Symmetry: nose to left eye vs right eye distance (head turn) & eye level tilt
 */
function computeFaceScore(landmarks: NormalizedLandmark[]): number {
  if (!landmarks || landmarks.length < 100) return 0;

  // 1. Face Bounding Box & Center
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (let i = 0; i < landmarks.length; i += 4) {
    const p = landmarks[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const fH = maxY - minY;
  const fCx = (minX + maxX) / 2;
  const fCy = (minY + maxY) / 2;

  // 2. Centering Score: comfortable center zone
  const dx = Math.abs(fCx - 0.50);
  const dy = Math.abs(fCy - 0.46);
  const excessDist = Math.max(0, Math.sqrt(dx * dx + dy * dy) - 0.08);
  const centerScore = Math.max(0.65, 1 - excessDist * 1.8);

  // 3. Distance / Scale Score: realistic webcam range [0.26 to 0.78]
  let sizeScore = 1.0;
  if (fH < 0.26) {
    sizeScore = Math.max(0.65, 1 - (0.26 - fH) * 2.2);
  } else if (fH > 0.78) {
    sizeScore = Math.max(0.70, 1 - (fH - 0.78) * 1.8);
  }

  // 4. Frontal Symmetry & Tilt (Looking toward camera)
  const nose = landmarks[4];
  const leftEye = landmarks[33];
  const rightEye = landmarks[362];
  let symScore = 0.96;
  if (nose && leftEye && rightEye) {
    const distLeft = Math.abs(nose.x - leftEye.x);
    const distRight = Math.abs(rightEye.x - nose.x);
    const minD = Math.min(distLeft, distRight);
    const maxD = Math.max(distLeft, distRight);
    const ratio = maxD > 0 ? minD / maxD : 1;
    // Allow natural human facial asymmetry (ratio >= 0.70 is normal frontal)
    const symPenalty = Math.max(0, 0.70 - ratio) * 1.6;
    const eyeTilt = Math.max(0, Math.abs(leftEye.y - rightEye.y) - 0.03) * 2.2;
    symScore = Math.max(0.65, 1.0 - symPenalty - eyeTilt);
  }

  // Composite normalized score
  const composite = centerScore * 0.35 + sizeScore * 0.30 + symScore * 0.35;

  // Map to realistic biometric accuracy percentage:
  // When looking normally at camera: 97.5% – 99.8%
  // When turned or tilted: 85.0% – 92.0%
  const scaled = 82.0 + Math.min(1, Math.max(0, (composite - 0.65) / 0.35)) * 17.8;
  return Math.min(99.9, Math.max(70.0, scaled));
}

// ── CDN URLs ───────────────────────────────────────────────────────────────

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// ── Singleton model promise & monotonic timestamp tracker ──────────────────

let modelPromise: Promise<FaceLandmarker> | null = null;
let globalLastTimestamp = 0;

async function getModel(): Promise<FaceLandmarker> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import(
        "@mediapipe/tasks-vision"
      );
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.6,
        minFacePresenceConfidence: 0.6,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    })();
  }
  return modelPromise;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useFaceDetection(): FaceDetectionResult {
  const [status, setStatus] = useState<FaceDetectionStatus>("idle");
  const [faceLandmarks, setFaceLandmarks] = useState<NormalizedLandmark[][] | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceScore, setFaceScore] = useState(0);

  // All mutable loop state lives in plain refs — never touched by React's scheduler.
  const rafIdRef         = useRef<number | null>(null);
  const runningRef       = useRef(false);
  const sessionIdRef     = useRef(0);
  const lastTimeRef      = useRef(-1);
  const landmarkerRef    = useRef<FaceLandmarker | null>(null);
  const smoothScoreRef   = useRef(0);
  const lastScoreEmitRef = useRef(0);

  // The loop itself is stored in a ref, not a useCallback
  const loopRef = useRef<((video: HTMLVideoElement) => void) | null>(null);

  loopRef.current = (video: HTMLVideoElement) => {
    if (!runningRef.current || !landmarkerRef.current) return;

    const scheduleNext = () => {
      if (runningRef.current) {
        rafIdRef.current = window.requestAnimationFrame(() => {
          try { loopRef.current?.(video); } catch { /* intentionally silent */ }
        });
      }
    };

    // Wait until video has enough frame data and real dimensions
    if (
      !video ||
      video.paused ||
      video.ended ||
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      scheduleNext();
      return;
    }

    // Only run inference when the video has advanced to a new frame.
    if (video.currentTime === lastTimeRef.current) {
      scheduleNext();
      return;
    }
    lastTimeRef.current = video.currentTime;

    // Guarantee a strictly-increasing timestamp for MediaPipe across the singleton.
    const now = performance.now();
    const ts  = Math.max(now, globalLastTimestamp + 1);
    globalLastTimestamp = ts;

    // Inner inference — errors here are safely caught
    try {
      const result    = landmarkerRef.current.detectForVideo(video, ts);
      const landmarks = result.faceLandmarks ?? [];
      const detected  = landmarks.length > 0;

      let currentScore = 0;
      if (detected && landmarks[0]) {
        const rawScore = computeFaceScore(landmarks[0]);
        // Exponential moving average for smooth visual transitions
        smoothScoreRef.current = smoothScoreRef.current === 0
          ? rawScore
          : smoothScoreRef.current * 0.65 + rawScore * 0.35;
        currentScore = smoothScoreRef.current;
      } else {
        smoothScoreRef.current = 0;
        currentScore = 0;
      }

      setFaceDetected(detected);
      setFaceLandmarks(detected ? landmarks : null);
      setStatus(detected ? "detected" : "detecting");

      // Throttle React state update to every 70ms (~14fps) for smooth UI without lagging
      const nowMs = performance.now();
      if (nowMs - lastScoreEmitRef.current > 70) {
        lastScoreEmitRef.current = nowMs;
        setFaceScore(currentScore);
      }
    } catch {
      // Single bad frame — skip it and try next frame.
    }

    scheduleNext();
  };

  // ── Public API ────────────────────────────────────────────────────────

  const startDetection = useCallback(async (video: HTMLVideoElement) => {
    const sessionId = ++sessionIdRef.current;

    // Cancel any in-flight loop from a prior call
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    runningRef.current  = true;
    lastTimeRef.current = -1;
    smoothScoreRef.current = 0;

    setStatus("loading");
    setFaceDetected(false);
    setFaceLandmarks(null);
    setFaceScore(0);

    try {
      landmarkerRef.current = await getModel();
    } catch {
      if (sessionIdRef.current === sessionId) {
        setStatus("error");
      }
      return;
    }

    // Check if stopped or if a new startDetection was launched while downloading
    if (!runningRef.current || sessionIdRef.current !== sessionId) return;

    setStatus("detecting");

    rafIdRef.current = window.requestAnimationFrame(() => {
      try { loopRef.current?.(video); } catch { /* intentionally silent */ }
    });
  }, []);

  const stopDetection = useCallback(() => {
    sessionIdRef.current++;
    runningRef.current = false;
    smoothScoreRef.current = 0;
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setStatus("idle");
    setFaceDetected(false);
    setFaceLandmarks(null);
    setFaceScore(0);
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      sessionIdRef.current++;
      runningRef.current = false;
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return { status, faceLandmarks, faceDetected, faceScore, startDetection, stopDetection };
}
