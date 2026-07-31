"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import { useAuth } from "@/lib/auth-context";
import { uploadAttendanceLog } from "@/lib/supabase";
import type { BreakEntry, ActivityEntry } from "@/data/teacher-dashboard";

// ── State types ──────────────────────────────────────────────────────────────
type ClockState = "ready" | "clocked-in" | "on-break";
type CameraStatus = "idle" | "loading" | "active" | "denied" | "unavailable";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(d: Date) {
  const str = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" });
  const [timePart, ampm] = str.split(" ");
  return { time: timePart, ampm };
}

function formatLongDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
}

function formatElapsed(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
}

function totalBreakMs(breaks: BreakEntry[]): number {
  return breaks.reduce((sum, b) => {
    if (b.start && b.end) return sum + (b.end.getTime() - b.start.getTime());
    return sum;
  }, 0);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ClockPage() {
  const [now, setNow] = useState<Date>(() => new Date());
  const [state, setState] = useState<ClockState>("ready");

  // Session tracking
  const clockInAt = useRef<Date | null>(null);
  const [breaks, setBreaks] = useState<BreakEntry[]>([]);
  const currentBreakStart = useRef<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const accumulatedWorkMs = useRef(0);

  // Activity log
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  // MongoDB record ID for the current shift
  const [attendanceId, setAttendanceId] = useState<string | null>(null);

  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendReason, setSuspendReason] = useState<string | null>(null);

  // Auth
  const { user, userProfile } = useAuth();

  // Load existing session for today
  useEffect(() => {
    if (!user?.uid) return;
    
    async function fetchTodaySession() {
      try {
        const res = await fetch(`/api/attendance?date=today&uid=${user!.uid}`);
        const json = await res.json();
        
        if (json.success) {
          setIsSuspended(json.isSuspended || false);
          setSuspendReason(json.suspendReason || null);

          if (json.data.length > 0) {
            const record = json.data[0];
            setAttendanceId(String(record._id));
          
          const newActivities: ActivityEntry[] = [];
          
          if (record.clockInTime) {
            const inDate = new Date(record.clockInTime);
            clockInAt.current = inDate;
            const t = formatTime(inDate);
            newActivities.push({
              id: `act-in-${inDate.getTime()}`,
              time: `${t.time} ${t.ampm}`,
              action: "clock-in",
              label: "Clocked In",
            });
            setState("clocked-in");
          }
          
          const parsedBreaks: BreakEntry[] = [];
          for (const b of (record.breaks || [])) {
            const bStart = new Date(b.start);
            const bEnd = b.end ? new Date(b.end) : undefined;
            parsedBreaks.push({ start: bStart, end: bEnd });
            
            const ts = formatTime(bStart);
            newActivities.push({
              id: `act-bs-${bStart.getTime()}`,
              time: `${ts.time} ${ts.ampm}`,
              action: "break-start",
              label: "Started Break",
            });
            
            if (bEnd) {
              const te = formatTime(bEnd);
              const breakSec = Math.floor((bEnd.getTime() - bStart.getTime()) / 1000);
              newActivities.push({
                id: `act-be-${bEnd.getTime()}`,
                time: `${te.time} ${te.ampm}`,
                action: "break-end",
                label: "Ended Break",
                duration: formatElapsed(breakSec),
              });
            } else {
              currentBreakStart.current = bStart;
              setState("on-break");
            }
          }
          setBreaks(parsedBreaks);
          
          if (record.clockOutTime) {
            const outDate = new Date(record.clockOutTime);
            const to = formatTime(outDate);
            newActivities.push({
              id: `act-out-${outDate.getTime()}`,
              time: `${to.time} ${to.ampm}`,
              action: "clock-out",
              label: "Clocked Out",
            });
            setState("ready");
            clockInAt.current = null;
          } else if (clockInAt.current) {
            const workMs = Date.now() - clockInAt.current.getTime() - totalBreakMs(parsedBreaks);
            setElapsed(Math.max(0, Math.floor(workMs / 1000)));
          }
          
          // Sort activities by time
          newActivities.sort((a, b) => {
             const timeA = parseInt(a.id.split('-').pop() || "0");
             const timeB = parseInt(b.id.split('-').pop() || "0");
             return timeA - timeB;
          });
          setActivities(newActivities);
        }
        }
      } catch (err) {
        console.error("Failed to load today's session", err);
      }
    }
    fetchTodaySession();
  }, [user]);

  // Undo state
  const [undoInfo, setUndoInfo] = useState<{
    clockInAt: Date;
    accumulatedWorkMs: number;
    breaks: BreakEntry[];
    activities: ActivityEntry[];
  } | null>(null);
  const undoTimer = useRef<number | null>(null);

  // Camera state
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [isCameraCovered, setIsCameraCovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // The currently active stream (may be null if startCamera is in flight).
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // A set of EVERY stream this component has ever created via getUserMedia.
  // We need this because React StrictMode (dev) mounts the component twice on
  // first render: startCamera() can be called twice in quick succession, and
  // whichever getUserMedia() resolves second overwrites streamRef.current —
  // orphaning the first stream. An orphaned stream's tracks never get stopped,
  // so the camera indicator stays lit forever (even after navigation).
  // By tracking all of them, stopCamera can guarantee every track is stopped.
  const allStreamsRef = useRef<Set<MediaStream>>(new Set());
  // Monotonic token for the most recent startCamera() call. Each in-flight
  // getUserMedia() captures its token at call time; after the await resolves,
  // it only proceeds if its token is still the current one. stopCamera and a
  // newer startCamera both bump the token, invalidating any older in-flight
  // call so its stream gets stopped instead of leaked.
  const startTokenRef = useRef(0);

  // Frozen / covered frame detection
  const lastFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  // Debounce: camera must appear blocked for this many consecutive checks before
  // we actually flag it — reduces false positives when the user briefly sits still
  const coveredFrameCount = useRef(0);
  const COVERED_FRAMES_REQUIRED = 3;

  // ── Camera ───────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    // Assign this call a fresh token and capture it. Any earlier in-flight
    // call is implicitly invalidated (its captured token no longer matches).
    const myToken = ++startTokenRef.current;

    setCameraStatus("loading");
    lastFrameDataRef.current = null;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus("unavailable");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
    } catch (err) {
      if (myToken !== startTokenRef.current) return; // superseded — ignore
      const error = err as DOMException;
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setCameraStatus("denied");
      } else {
        setCameraStatus("unavailable");
      }
      return;
    }

    // Race guard: if a newer startCamera() or a stopCamera() ran while we
    // were awaiting (either via StrictMode double-mount or user navigation),
    // our token no longer matches — stop this stream immediately so it can't
    // leak, and don't touch any refs/state.
    if (myToken !== startTokenRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    const track = stream.getVideoTracks()[0];
    if (track) {
      // "ended" fires on some hardware kill switches — keep as a safety net
      track.addEventListener("ended", () => {
        setCameraStatus("unavailable");
      });
      // "mute" fires on some OS/driver combos when HW switch is toggled
      track.addEventListener("mute", () => {
        setCameraStatus("unavailable");
      });
    }

    streamRef.current = stream;
    allStreamsRef.current.add(stream);
    setCameraStatus("active");
  }, []);

  // Single source of truth for tearing down the camera. Both the manual
  // "Turn Off Camera" button, the unmount cleanup, and the route-change
  // effect all route through here so they can never drift out of sync.
  const stopCamera = useCallback(() => {
    // Invalidate any in-flight startCamera() so its resolved stream gets
    // stopped by its own race guard rather than orphaned.
    startTokenRef.current++;
    // Stop EVERY stream this component ever created, not just the current
    // one. This is the critical fix: under React StrictMode (dev), two
    // getUserMedia() calls can race and the loser's stream gets orphaned in
    // the OS — only iterating all known streams guarantees no track is left
    // running, which is what keeps the camera indicator lit.
    allStreamsRef.current.forEach((s) => {
      s.getTracks().forEach((t) => t.stop());
    });
    allStreamsRef.current.clear();
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    lastFrameDataRef.current = null;
    setCameraStatus("idle");
    setIsCameraCovered(false);
  }, []);

  // Attach stream to video once both are ready (fixes race condition)
  useEffect(() => {
    if (cameraStatus === "active" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraStatus]);

  // ── Poll track.readyState every 500 ms ──────────────────────────────────
  // Browsers don't always fire "ended"/"mute" events on hardware kill switches,
  // so we poll as a secondary guard.
  useEffect(() => {
    if (cameraStatus !== "active") return;

    const id = window.setInterval(() => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) return;

      if (track.readyState === "ended" || track.muted) {
        setCameraStatus("unavailable");
        setIsCameraCovered(false);
      }
    }, 500);

    return () => clearInterval(id);
  }, [cameraStatus]);

  // ── Frame analysis: black / dark / static / covered detection ───────────
  // Runs every 800 ms while the camera stream is active.
  //
  // Three layered checks:
  //   1. Pure-black / very-dark feed  → hardware shutter or lens fully covered
  //   2. Motion-variance check        → detects physical covering regardless of
  //      color (finger, tape, paper). A real face always has subtle movement;
  //      a covered lens produces a near-identical frame every tick.
  //   3. Debounce (3 consecutive hits) → avoids false-positives when the user
  //      briefly sits completely still for a moment.
  useEffect(() => {
    if (cameraStatus !== "active") {
      setIsCameraCovered(false);
      coveredFrameCount.current = 0;
      return;
    }

    const SAMPLE_SIZE = 64;
    const CENTER_OFFSET = Math.floor(SAMPLE_SIZE / 2) - 8; // 16×16 center crop

    // Brightness thresholds
    const BRIGHTNESS_THRESHOLD = 8;  // avg brightness below this → very dark feed
    const NOISE_THRESHOLD = 5;       // per-channel value below this → treat as black

    // Motion-variance thresholds
    // A covered lens shows almost no inter-frame pixel change.
    // A live face always has breathing / micro-movements.
    const MIN_DIFF_PIXELS = 60;      // fewer than this many changed pixels → static
    const VARIANCE_THRESHOLD = 15;   // avg change magnitude below this → static

    const id = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx || video.videoWidth === 0 || video.readyState < 2) return;

      canvas.width = SAMPLE_SIZE;
      canvas.height = SAMPLE_SIZE;
      ctx.drawImage(video, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

      // ── Check 1: center-crop brightness ──────────────────────────────
      const centerData = ctx.getImageData(CENTER_OFFSET, CENTER_OFFSET, 16, 16).data;
      let totalBrightness = 0;
      let isBlack = true;

      for (let i = 0; i < centerData.length; i += 4) {
        const r = centerData[i];
        const g = centerData[i + 1];
        const b = centerData[i + 2];
        totalBrightness += (r + g + b) / 3;
        if (r > NOISE_THRESHOLD || g > NOISE_THRESHOLD || b > NOISE_THRESHOLD) {
          isBlack = false;
        }
      }

      const avgBrightness = totalBrightness / (centerData.length / 4);
      const isDark = avgBrightness < BRIGHTNESS_THRESHOLD;

      // ── Check 2: motion-variance (full 64×64) ────────────────────────
      const fullData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
      let isStaticFeed = false;

      if (lastFrameDataRef.current !== null) {
        let diffCount = 0;
        let totalDiff = 0;

        for (let i = 0; i < fullData.length; i += 4) {
          const diff =
            Math.abs(fullData[i] - lastFrameDataRef.current[i]) +
            Math.abs(fullData[i + 1] - lastFrameDataRef.current[i + 1]) +
            Math.abs(fullData[i + 2] - lastFrameDataRef.current[i + 2]);

          if (diff > 6) {
            diffCount++;
            totalDiff += diff;
          }
        }

        const avgDiff = diffCount > 0 ? totalDiff / diffCount : 0;

        // Feed is considered static if too few pixels changed OR changes are tiny
        isStaticFeed =
          diffCount < MIN_DIFF_PIXELS || avgDiff < VARIANCE_THRESHOLD;
      }

      lastFrameDataRef.current = new Uint8ClampedArray(fullData);

      // ── Check 3: debounce ─────────────────────────────────────────────
      // Require COVERED_FRAMES_REQUIRED consecutive "blocked" results before
      // flipping the flag — avoids false-positives from a momentary stillness.
      const looksBlocked = isBlack || isDark || isStaticFeed;

      if (looksBlocked) {
        coveredFrameCount.current += 1;
        if (coveredFrameCount.current >= COVERED_FRAMES_REQUIRED) {
          setIsCameraCovered(true);
        }
      } else {
        coveredFrameCount.current = 0;
        setIsCameraCovered(false);
      }
    }, 250);

    return () => clearInterval(id);
  }, [cameraStatus]);

  // Start/stop the camera based on whether this page is the active route.
  //
  // WHY route-driven (not just unmount): In Next.js 16 the App Router may
  // keep the previous route's component tree alive (background activity /
  // cached) rather than truly unmounting it on navigation. When that happens,
  // this component's unmount cleanup does NOT fire — so relying on it leaves
  // the webcam stream running with the camera indicator lit on every other
  // page.
  //
  // usePathname() updates on every navigation regardless of whether React
  // unmounts, hides, or caches us, so it's a reliable signal of which page is
  // visible. We start the camera when pathname is /teacher/clock and stop it
  // otherwise. The cleanup return also fires on genuine unmount as a backstop.
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/teacher/clock") {
      startCamera();
      return () => stopCamera();
    }
    // Not on this route — make sure the camera is off.
    stopCamera();
  }, [pathname, startCamera, stopCamera]);

  // ── Live clock ───────────────────────────────────────────────────────────

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // ── Elapsed timer (pauses during breaks) ─────────────────────────────────

  useEffect(() => {
    if (state !== "clocked-in" || !clockInAt.current) return;

    const id = window.setInterval(() => {
      const workNow =
        Date.now() - clockInAt.current!.getTime() - totalBreakMs(breaks);
      setElapsed(Math.max(0, Math.floor(workNow / 1000)));
    }, 1000);

    return () => window.clearInterval(id);
  }, [state, breaks]);

  // ── Undo timer ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (undoInfo) {
      undoTimer.current = window.setTimeout(() => setUndoInfo(null), 10000);
      return () => {
        if (undoTimer.current) window.clearTimeout(undoTimer.current);
      };
    }
  }, [undoInfo]);

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Grabs the current video frame and returns it as a JPEG Blob. */
  async function captureSnapshot(): Promise<Blob | null> {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return null;

    // Render full-res snapshot (not the tiny 64×64 analysis canvas)
    const snap = document.createElement("canvas");
    snap.width = video.videoWidth;
    snap.height = video.videoHeight;
    const ctx = snap.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);

    return new Promise<Blob | null>((resolve) => {
      snap.toBlob((blob) => resolve(blob), "image/jpeg", 0.88);
    });
  }

  async function handleClockIn() {
    const d = new Date();
    clockInAt.current = d;
    accumulatedWorkMs.current = 0;
    setBreaks([]);
    setElapsed(0);

    const t = formatTime(d);
    setActivities((prev) => [
      ...prev,
      {
        id: `act-${Date.now()}`,
        time: `${t.time} ${t.ampm}`,
        action: "clock-in",
        label: "Clocked In",
      },
    ]);
    setState("clocked-in");

    // Capture & upload face snapshot, then persist to MongoDB
    try {
      let clockInPhotoUrl: string | null = null;
      const blob = await captureSnapshot();
      if (blob && user?.uid) {
        try {
          clockInPhotoUrl = await uploadAttendanceLog(blob, user.uid, "clock-in");
          console.log("Clock-in photo uploaded:", clockInPhotoUrl);
        } catch (uploadErr) {
          console.warn("Photo upload failed (continuing without photo):", uploadErr);
        }
      }

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherUid: user?.uid ?? "unknown",
          name: userProfile?.fullName ?? user?.email ?? "Teacher",
          group: userProfile?.assignedRoom ?? "Unassigned",
          clockInPhotoUrl,
        }),
      });
      const json = await res.json();
      console.log("Clock-in response:", json);
      if (json.success && json.data?._id) {
        setAttendanceId(String(json.data._id));
        console.log("attendanceId set to:", json.data._id);
      } else if (json.error === "Already clocked in today" && json.data?._id) {
        // Resume existing session
        setAttendanceId(String(json.data._id));
        console.log("Resuming existing session:", json.data._id);
      }
    } catch (err) {
      console.error("Failed to save clock-in:", err);
    }
  }

  async function handleClockOut() {
    const out = new Date();
    const workMs =
      out.getTime() - clockInAt.current!.getTime() - totalBreakMs(breaks);
    const workSec = Math.max(0, Math.floor(workMs / 1000));
    const t = formatTime(out);

    setUndoInfo({
      clockInAt: new Date(clockInAt.current!),
      accumulatedWorkMs: accumulatedWorkMs.current,
      breaks: [...breaks],
      activities: [...activities],
    });

    setActivities((prev) => {
      const newActivities = [...prev];
      for (let i = newActivities.length - 1; i >= 0; i--) {
        if (
          newActivities[i].action === "clock-in" &&
          !newActivities[i].duration
        ) {
          newActivities[i] = {
            ...newActivities[i],
            duration: formatElapsed(workSec),
          };
          break;
        }
      }
      return [
        ...newActivities,
        {
          id: `act-${Date.now()}`,
          time: `${t.time} ${t.ampm}`,
          action: "clock-out",
          label: "Clocked Out",
        },
      ];
    });

    setElapsed(0);
    clockInAt.current = null;
    accumulatedWorkMs.current = 0;
    setState("ready");

    // Capture snapshot + persist clock-out to MongoDB
    if (attendanceId) {
      try {
        let photoUrl: string | null = null;
        const blob = await captureSnapshot();
        if (blob && user?.uid) {
          try {
            photoUrl = await uploadAttendanceLog(blob, user.uid, "clock-out");
            console.log("Clock-out photo uploaded:", photoUrl);
          } catch (uploadErr) {
            console.warn("Clock-out photo upload failed:", uploadErr);
          }
        }

        await fetch("/api/attendance", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: attendanceId, action: "clock-out", photoUrl }),
        });
        setAttendanceId(null);
      } catch (err) {
        console.error("Failed to save clock-out:", err);
      }
    }
  }

  function handleUndoClockOut() {
    if (!undoInfo) return;

    clockInAt.current = undoInfo.clockInAt;
    accumulatedWorkMs.current = undoInfo.accumulatedWorkMs;
    setBreaks(undoInfo.breaks);
    setActivities(undoInfo.activities);

    const workMs =
      Date.now() -
      undoInfo.clockInAt.getTime() -
      totalBreakMs(undoInfo.breaks);
    setElapsed(Math.max(0, Math.floor(workMs / 1000)));

    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    setUndoInfo(null);
    setState("clocked-in");
  }

  async function handleTakeBreak() {
    const d = new Date();
    currentBreakStart.current = d;

    if (clockInAt.current) {
      accumulatedWorkMs.current =
        d.getTime() - clockInAt.current.getTime() - totalBreakMs(breaks);
    }

    const t = formatTime(d);
    setActivities((prev) => [
      ...prev,
      {
        id: `act-${Date.now()}`,
        time: `${t.time} ${t.ampm}`,
        action: "break-start",
        label: "Started Break",
      },
    ]);
    setState("on-break");

    // Capture snapshot + persist break-start to MongoDB
    if (attendanceId) {
      try {
        let photoUrl: string | null = null;
        const blob = await captureSnapshot();
        if (blob && user?.uid) {
          try {
            photoUrl = await uploadAttendanceLog(blob, user.uid, "break-start");
          } catch (uploadErr) {
            console.warn("Break-start photo upload failed:", uploadErr);
          }
        }
        await fetch("/api/attendance", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: attendanceId, action: "start-break", photoUrl }),
        });
      } catch (err) {
        console.error("Failed to save break start:", err);
      }
    }
  }

  async function handleEndBreak() {
    const d = new Date();
    const breakStart = currentBreakStart.current || new Date();

    const breakEntry: BreakEntry = { start: breakStart, end: d };
    setBreaks((prev) => [...prev, breakEntry]);
    currentBreakStart.current = null;

    const breakSec = Math.floor((d.getTime() - breakStart.getTime()) / 1000);
    const t = formatTime(d);
    setActivities((prev) => [
      ...prev,
      {
        id: `act-${Date.now()}`,
        time: `${t.time} ${t.ampm}`,
        action: "break-end",
        label: "Ended Break",
        duration: formatElapsed(breakSec),
      },
    ]);

    if (clockInAt.current) {
      const workMs =
        d.getTime() -
        clockInAt.current.getTime() -
        totalBreakMs([...breaks, breakEntry]);
      accumulatedWorkMs.current = workMs;
      setElapsed(Math.max(0, Math.floor(workMs / 1000)));
    }

    setState("clocked-in");

    // Persist to MongoDB
    if (attendanceId) {
      try {
        await fetch("/api/attendance", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: attendanceId, action: "end-break" }),
        });
      } catch (err) {
        console.error("Failed to save break end:", err);
      }
    }
  }

  // ── Confirmation modal ───────────────────────────────────────────────────

  const [showClockOutModal, setShowClockOutModal] = useState(false);

  function openClockOutModal() {
    setShowClockOutModal(true);
  }

  function confirmClockOut() {
    setShowClockOutModal(false);
    handleClockOut();
  }

  // ── Break elapsed timer ──────────────────────────────────────────────────

  const [breakElapsed, setBreakElapsed] = useState(0);

  useEffect(() => {
    if (state !== "on-break" || !currentBreakStart.current) return;
    const id = window.setInterval(() => {
      setBreakElapsed(
        Math.floor(
          (Date.now() - currentBreakStart.current!.getTime()) / 1000,
        ),
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, [state]);

  // ── Computed ─────────────────────────────────────────────────────────────

  const timeData = formatTime(now);
  const clockedIn = state === "clocked-in";
  const onBreak = state === "on-break";
  const isActive = clockedIn || onBreak;

  const lastClockInTime = activities
    .filter((a) => a.action === "clock-in")
    .pop()?.time;

  const lastClockOutTime =
    activities.filter((a) => a.action === "clock-out").pop()?.time;

  // Camera is considered truly ready when active AND feed is not covered/frozen
  const cameraReady = cameraStatus === "active" && !isCameraCovered;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <TeacherShell
      title="Clock In/Out"
      description="Record your attendance with face verification."
    >
      <div className="flex flex-col xl:flex-row gap-8 w-full py-4">
        {/* ─── Left Section (Clock & Camera Combined) ─── */}
        <section className="flex flex-col md:flex-row gap-8 w-full xl:w-[860px] shrink-0 rounded-[1.5rem] border border-[#e8effe] bg-white p-8 shadow-[0_8px_28px_-8px_rgba(0,47,118,0.12)]">
          {/* ─── Clock half ─── */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Status chip */}
            <span
              className={`mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-widest ${onBreak
                ? "bg-[#fff7e6] text-[#b8860b]"
                : clockedIn
                  ? "bg-[#e8f9f0] text-[#2da05b]"
                  : "bg-[#f0f4f9] text-[#5a6e8c]"
                }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${onBreak
                  ? "bg-[#ffb800] animate-pulse"
                  : clockedIn
                    ? "bg-[#2da05b]"
                    : "bg-[#9aa3b2]"
                  }`}
              />
              {onBreak
                ? "On Break"
                : clockedIn
                  ? "Clocked In"
                  : "Ready to Record"}
            </span>

            {/* Live time */}
            <div className="flex items-end justify-center gap-2">
              <span className="font-headline text-[64px] font-extrabold leading-none tracking-tight text-[#002f76]">
                {timeData.time}
              </span>
              <span className="mb-2 font-headline text-[22px] font-extrabold text-[#0050d5]">
                {timeData.ampm}
              </span>
            </div>

            {/* Date */}
            <p className="mt-2 text-[15px] font-bold text-[#5a6e8c]">
              {formatLongDate(now)}
            </p>

            {/* Elapsed / Break timer */}
            {clockedIn && (
              <div className="mt-5 flex items-center gap-2 rounded-full bg-[#e8f9f0] px-4 py-2 text-[13px] font-extrabold text-[#2da05b]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2da05b] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2da05b]" />
                </span>
                Working · {formatElapsed(elapsed)}
              </div>
            )}
            {onBreak && (
              <div className="mt-5 flex items-center gap-2 rounded-full bg-[#fff7e6] px-4 py-2 text-[13px] font-extrabold text-[#b8860b]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ffb800] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ffb800]" />
                </span>
                On Break · {formatElapsed(breakElapsed)}
              </div>
            )}

            {/* Buttons */}
            <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
              {/* Primary action */}
              {isActive && (
                <button
                  onClick={openClockOutModal}
                  disabled={!cameraReady}
                  className={`w-full rounded-full py-4 text-[15px] font-extrabold transition-all ${cameraReady
                    ? "bg-[#ffb800] text-[#002f76] shadow-[0_6px_18px_-4px_rgba(255,184,0,0.5)] hover:bg-[#ffb800]/90 active:translate-y-px"
                    : "bg-[#f0f4f9] text-[#9aa3b2] cursor-not-allowed border border-[#e2e8f0]"
                    }`}
                >
                  Clock Out
                </button>
              )}
              {!isActive && isSuspended && (
                <div className="w-full rounded-full border border-orange-200 bg-orange-50 py-4 text-center text-[15px] font-extrabold text-orange-600">
                  Classes Suspended
                </div>
              )}
              {!isActive && !isSuspended && (
                <button
                  onClick={handleClockIn}
                  disabled={!cameraReady}
                  className={`w-full rounded-full py-4 text-[15px] font-extrabold transition-all ${cameraReady
                    ? "bg-[#0050d5] text-white shadow-[0_6px_18px_-4px_rgba(0,80,213,0.5)] hover:bg-[#0046b8] active:translate-y-px"
                    : "bg-[#f0f4f9] text-[#9aa3b2] cursor-not-allowed border border-[#e2e8f0]"
                    }`}
                >
                  Clock In
                </button>
              )}

              {/* Break / End Break */}
              {clockedIn && (
                <button
                  onClick={handleTakeBreak}
                  className="w-full rounded-full border border-[#e2e8f0] bg-white py-3 text-[14px] font-bold text-[#5a6e8c] transition-colors hover:bg-[#f0f4f9]"
                >
                  Take Break
                </button>
              )}
              {onBreak && (
                <button
                  onClick={handleEndBreak}
                  className="w-full rounded-full bg-[#0050d5] py-3 text-[14px] font-bold text-white shadow-[0_6px_18px_-4px_rgba(0,80,213,0.5)] transition-all hover:bg-[#0046b8] active:translate-y-px"
                >
                  End Break
                </button>
              )}
            </div>

            {/* Last activity */}
            <p className="mt-6 text-[12.5px] font-semibold text-[#9aa3b2]">
              {isActive && lastClockInTime
                ? `Clocked In at ${lastClockInTime}`
                : lastClockOutTime
                  ? `Last Clock Out: ${lastClockOutTime}`
                  : "Ready to start your day"}
            </p>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-[#e8effe]" />

          {/* ─── Live camera / face verification panel ─── */}
          <div className="flex-1 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-headline text-[16px] font-extrabold text-[#002f76]">
                Face Verification
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest ${cameraReady
                  ? "bg-[#fff0f0] text-[#ef4444]"
                  : "bg-[#f0f4f9] text-[#9aa3b2]"
                  }`}
              >
                {cameraReady && (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ef4444]" />
                )}
                {cameraReady ? "Live Camera" : "Camera Off"}
              </span>
            </div>

            {/* Camera viewport */}
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1rem] border-2 border-[#c5d6ff] bg-gradient-to-br from-[#f0f5ff] to-[#e8effe]">
              {/* Loading */}
              {cameraStatus === "loading" && (
                <div className="flex flex-col items-center gap-3">
                  <span className="h-8 w-8 animate-spin rounded-full border-3 border-[#0050d5]/30 border-t-[#0050d5]" />
                  <p className="text-[13px] font-bold text-[#5a6e8c]">
                    Accessing camera…
                  </p>
                </div>
              )}

              {/* Denied */}
              {cameraStatus === "denied" && (
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-10 w-10 text-[#ef4444]"
                  >
                    <path d="m15.5 2-1 4" />
                    <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4" />
                    <path d="m6 14 3 3 5-5" />
                    <line x1="2" x2="22" y1="22" y2="22" />
                  </svg>
                  <p className="text-[13px] font-bold text-[#ef4444]">
                    Camera access denied
                  </p>
                  <p className="text-[12px] font-medium text-[#5a6e8c]">
                    Please allow camera access in your browser settings and
                    reload the page.
                  </p>
                </div>
              )}

              {/* Unavailable */}
              {cameraStatus === "unavailable" && (
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-10 w-10 text-[#9aa3b2]"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" x2="12" y1="9" y2="13" />
                    <line x1="12" x2="12.01" y1="17" y2="17" />
                  </svg>
                  <p className="text-[13px] font-bold text-[#5a6e8c]">
                    Camera not available
                  </p>
                  <p className="text-[12px] font-medium text-[#9aa3b2]">
                    No camera was detected or the hardware switch is off. Please
                    re-enable your camera and{" "}
                    <button
                      onClick={startCamera}
                      className="underline text-[#0050d5] font-bold"
                    >
                      try again
                    </button>
                    .
                  </p>
                </div>
              )}

              {/* Idle */}
              {cameraStatus === "idle" && (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={startCamera}
                    className="flex items-center gap-2 rounded-full bg-[#0050d5] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#0046b8]"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    Enable Camera
                  </button>
                  <p className="text-[12px] font-medium text-[#9aa3b2]">
                    Camera is currently off
                  </p>
                </div>
              )}

              {/* Live video feed (mirrored for selfie view) */}
              {cameraStatus === "active" && (
                <>
                  <canvas ref={canvasRef} className="hidden" />
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                </>
              )}

              {/* Camera covered / frozen overlay */}
              {cameraStatus === "active" && isCameraCovered && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70 px-6 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8 text-white"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  <p className="text-[13px] font-bold text-white">
                    Camera Blocked or Disabled
                  </p>
                  <p className="text-[11px] font-medium text-white/70">
                    Uncover your camera or re-enable the hardware switch,
                    then wait a moment.
                  </p>
                </div>
              )}

              {/* Face guide overlay (visible only when feed is clean) */}
              {cameraReady && (
                <>
                  <div className="pointer-events-none absolute inset-6 rounded-[50%] border-2 border-[#0050d5]/40" />
                  <span className="pointer-events-none absolute left-3 top-3 h-5 w-5 rounded-tl-[8px] border-l-2 border-t-2 border-[#0050d5]" />
                  <span className="pointer-events-none absolute right-3 top-3 h-5 w-5 rounded-tr-[8px] border-r-2 border-t-2 border-[#0050d5]" />
                  <span className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 rounded-bl-[8px] border-b-2 border-l-2 border-[#0050d5]" />
                  <span className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 rounded-br-[8px] border-b-2 border-r-2 border-[#0050d5]" />
                </>
              )}
            </div>

            {/* Camera controls */}
            {cameraStatus === "active" && (
              <button
                onClick={stopCamera}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] border border-[#e2e8f0] px-4 py-2 text-[12.5px] font-bold text-[#5a6e8c] transition-colors hover:bg-[#f0f4f9]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M16.5 10a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" />
                  <line x1="2" x2="2.01" y1="12" y2="12" />
                  <line x1="5" x2="5.01" y1="12" y2="12" />
                  <line x1="8" x2="8.01" y1="12" y2="12" />
                </svg>
                Turn Off Camera
              </button>
            )}

            <p className="mt-4 text-[13px] font-medium leading-relaxed text-[#5a6e8c]">
              Position your face within the frame to verify attendance
              automatically upon clicking.
            </p>

            <div
              className={`mt-4 flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[12.5px] font-bold ${cameraReady
                ? "bg-[#f0f5ff] text-[#0050d5]"
                : cameraStatus === "active" && isCameraCovered
                  ? "bg-[#fff0f0] text-[#ef4444]"
                  : "bg-[#f0f5ff] text-[#0050d5]"
                }`}
            >
              {cameraStatus === "active" && isCameraCovered ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              )}
              {cameraReady
                ? "Face Verification Active"
                : cameraStatus === "active" && isCameraCovered
                  ? "Camera Feed is Blocked or Frozen"
                  : "Camera Required for Verification"}
            </div>
          </div>
        </section>

        {/* ─── Right Column (Today's Activity Log) ─── */}
        <section className="flex-1 flex flex-col rounded-[1.5rem] border border-[#e8effe] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-[#e8effe] bg-[#f8fafd]">
            <div className="w-8 h-[3px] bg-[#ffb800]" />
            <h2 className="text-[14px] font-black uppercase tracking-[0.1em] text-[#002f76]">
              Today&apos;s Activity
            </h2>
          </div>

          {activities.length > 0 ? (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e8effe] bg-[#f8fafd]">
                    <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-wider text-[#5a6e8c]">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-black uppercase tracking-wider text-[#5a6e8c]">
                      Action
                    </th>
                    <th className="px-6 py-3 text-right text-[11px] font-black uppercase tracking-wider text-[#5a6e8c]">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-[#f0f4f9] last:border-b-0"
                    >
                      <td className="px-6 py-3.5 text-[13px] font-bold text-[#002f76]">
                        {entry.time}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold ${entry.action === "clock-in"
                            ? "bg-[#e8f9f0] text-[#2da05b]"
                            : entry.action === "clock-out"
                              ? "bg-[#f0f4f9] text-[#5a6e8c]"
                              : entry.action === "break-start"
                                ? "bg-[#fff7e6] text-[#b8860b]"
                                : "bg-[#e8f0fe] text-[#005cc8]"
                            }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${entry.action === "clock-in"
                              ? "bg-[#2da05b]"
                              : entry.action === "clock-out"
                                ? "bg-[#9aa3b2]"
                                : entry.action === "break-start"
                                  ? "bg-[#ffb800]"
                                  : "bg-[#005cc8]"
                              }`}
                          />
                          {entry.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right text-[13px] font-bold text-[#002f76]">
                        {entry.action === "clock-in" &&
                          isActive &&
                          entry ===
                          activities.findLast((a) => a.action === "clock-in")
                          ? formatElapsed(elapsed)
                          : entry.duration ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f0f4f9]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-[#9aa3b2]"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 className="font-headline text-[16px] font-bold text-[#002f76]">
                No Activity Yet
              </h3>
              <p className="mt-1 text-[13px] text-[#5a6e8c]">
                Clock in to start recording your day.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* ─── Clock-Out Confirmation Modal ─── */}
      {showClockOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-[1.5rem] bg-white p-8 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff7e6]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7 text-[#ffb800]"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>

              <h3 className="font-headline text-[20px] font-extrabold text-[#002f76]">
                Clock Out?
              </h3>
              <p className="mt-2 text-[14px] font-medium text-[#5a6e8c]">
                Are you sure you want to clock out? Your session of{" "}
                <span className="font-bold text-[#002f76]">
                  {formatElapsed(elapsed)}
                </span>{" "}
                will be recorded.
              </p>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setShowClockOutModal(false)}
                className="flex-1 rounded-full border border-[#e2e8f0] bg-white py-3 text-[14px] font-bold text-[#5a6e8c] transition-colors hover:bg-[#f0f4f9]"
              >
                Cancel
              </button>
              <button
                onClick={confirmClockOut}
                className="flex-1 rounded-full bg-[#ffb800] py-3 text-[14px] font-bold text-[#002f76] shadow-[0_6px_18px_-4px_rgba(255,184,0,0.5)] transition-all hover:bg-[#ffb800]/90 active:translate-y-px"
              >
                Yes, Clock Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Undo Toast ─── */}
      {undoInfo && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-[slideUp_0.3s_ease-out]">
          <div className="flex items-center gap-4 rounded-full bg-[#002f76] px-5 py-3 shadow-lg">
            <p className="text-[13px] font-bold text-white">
              You clocked out {lastClockOutTime ? `at ${lastClockOutTime.split(", ").pop()}` : "just now"}.{" "}
              <span className="text-[#9aa3b2]">Auto-dismisses in 10s</span>
            </p>
            <button
              onClick={handleUndoClockOut}
              className="rounded-full bg-[#ffb800] px-4 py-1.5 text-[12px] font-extrabold text-[#002f76] transition-colors hover:bg-[#ffb800]/90"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {/* Inline keyframe for the slide-up toast animation */}
      <style jsx global>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(1rem);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </TeacherShell>
  );
}