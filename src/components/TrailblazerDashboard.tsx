"use client";

import { useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { Fredoka } from "next/font/google";
import { getCompletedSessionsCount } from "@/lib/sessions";
import {
    RESERVATION_RATE, WEEKLY_INTEREST_RATE, BALANCE_DUE_SESSION,
    isRegistrationVerified, fmtPeso, fmtIsoDate,
    getStudentSessionInfo, calcRegistrationTerms,
} from "@/lib/payment-terms";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

// ─── Design tokens ───────────────────────────────────────────────────────────
const NAVY = "#0b2a82";
const BLUE = "#1f7ae0";
const SUN = "#ffd23f";
const SUN_LIGHT = "#ffe066";
const SUN_DEEP = "#ffb82e";
const ORANGE = "#ff8a1f";
const INPUT_BG = "#f2faff";
const INPUT_BORDER = "#b6dcf5";
const TEXT_2 = "#3d5a99";
const ERROR = "#b3261e";

type ToastType = "success" | "error" | "info";
type Tab = "session" | "virtual" | "photos" | "waiver" | "payments" | "renewal" | "profile";

type Props = {
    profile: any; // ParentProfile
    setProfile: (fn: (p: any) => any) => void;
    user: any;
    signOut: () => void;
    showToast: (msg: string, type?: ToastType) => void;
    toast: { msg: string; type: ToastType } | null;
    clearToast: () => void;
    allRenewalPrograms: any[];
    sessionPayments: any[];
    setSessionPayments: (fn: (p: any[]) => any[]) => void;
    paymentsLoading: boolean;
    onChangePassword: () => void;
    onEditFavorites: () => void;
    onOpenMaterial?: (m: any) => void;
    loadingFileId?: string | null;
    agreement: ReactNode;
    setLightbox?: (lb: any) => void;
    // Registration records for this family (must be filtered to the logged-in parent on the server).
    registrations?: any[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseScheduleDays(schedule: string): number[] {
    const days: number[] = [];
    const s = schedule.toLowerCase();
    if (s.includes("monday – friday") || s.includes("monday - friday")) return [1, 2, 3, 4, 5];
    if (s.includes("monday")) days.push(1);
    if (s.includes("tuesday")) days.push(2);
    if (s.includes("wednesday")) days.push(3);
    if (s.includes("thursday")) days.push(4);
    if (s.includes("friday")) days.push(5);
    if (s.includes("saturday")) days.push(6);
    if (s.includes("sunday")) days.push(0);
    return days;
}

function parseStartTime(classTime: string): { hour: number; minute: number } | null {
    const match = classTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;
    let hour = parseInt(match[1], 10);
    const min = parseInt(match[2], 10);
    const meridiem = match[3].toUpperCase();
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    return { hour, minute: min };
}

function getNextSessionDate(schedule: string, classTime: string): Date | null {
    const days = parseScheduleDays(schedule);
    const time = parseStartTime(classTime);
    if (days.length === 0 || !time) return null;

    const now = new Date();
    let candidate = new Date(now);
    candidate.setHours(time.hour, time.minute, 0, 0);
    if (days.includes(now.getDay()) && candidate > now) return candidate;

    for (let i = 1; i <= 7; i++) {
        candidate = new Date(now);
        candidate.setDate(now.getDate() + i);
        candidate.setHours(time.hour, time.minute, 0, 0);
        if (days.includes(candidate.getDay())) return candidate;
    }
    return null;
}

function NextSessionCountdown({ schedule, classTime }: { schedule: string; classTime: string }) {
    const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

    useEffect(() => {
        const nextDate = getNextSessionDate(schedule, classTime);
        if (!nextDate) return;

        const tick = () => {
            const diff = nextDate.getTime() - Date.now();
            if (diff <= 0) { setTimeLeft({ d: 0, h: 0, m: 0, s: 0 }); return; }
            setTimeLeft({
                d: Math.floor(diff / (1000 * 60 * 60 * 24)),
                h: Math.floor((diff / (1000 * 60 * 60)) % 24),
                m: Math.floor((diff / 1000 / 60) % 60),
                s: Math.floor((diff / 1000) % 60),
            });
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [schedule, classTime]);

    if (!timeLeft) return <strong className="vp-count-line">Calculating…</strong>;
    if (timeLeft.d === 0 && timeLeft.h === 0 && timeLeft.m === 0 && timeLeft.s === 0) {
        return <strong className="vp-count-line" style={{ color: "#b6f5c2" }}>Class is starting!</strong>;
    }
    const pad = (n: number) => n.toString().padStart(2, "0");
    return (
        <div className="vp-count-line">
            {timeLeft.d > 0 && <span>{timeLeft.d}d</span>}
            <span>{pad(timeLeft.h)}h</span>
            <span>{pad(timeLeft.m)}m</span>
            {timeLeft.d === 0 && <span style={{ color: SUN_LIGHT }}>{pad(timeLeft.s)}s</span>}
        </div>
    );
}

function isExpired(expiresAt: string | null) {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
}

function fmtExpiry(str: string) {
    return new Date(str).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ─── Payments (rules + math live in @/lib/payment-terms, shared with Payment Tracking) ───
// TEMP (testing only): when the parent page does not pass `registrations`, fetch them here and keep
// only this parent's. This downloads EVERY family's registrations to the browser, so replace it with
// a server route that returns only the logged-in parent's registration, then set this to false.
const TEMP_FETCH_REGISTRATIONS = true;

type LedgerRow = {
    key: string; label: string; date: string; method: string; ref: string;
    amount: number; verified: boolean; rejected: boolean; note?: string;
};
const ledgerStatus = (r: { verified: boolean; rejected: boolean }) =>
    r.verified ? "Verified" : r.rejected ? "Rejected" : "Pending";

// ─── Icons (rounded 2.2px stroke, lucide style) ──────────────────────────────
const ICONS: Record<string, ReactNode> = {
    monitor: <><rect x="2" y="3" width="20" height="14" rx="3" /><path d="M8 21h8M12 17v4" /></>,
    shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="m9 12 2 2 4-4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
    camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    refresh: <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>,
    check: <path d="m5 12 5 5 9-10" />,
    card: <><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20M6 15h4" /></>,
};
function Icon({ name, size = 22 }: { name: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONS[name] || ICONS.monitor}
        </svg>
    );
}

// ─── Background scene ────────────────────────────────────────────────────────
const SK = "vp-sticker";
function Cloud({ className }: { className: string }) {
    return (
        <svg className={`vp-cloud ${SK} ${className}`} viewBox="-4 -16 124 78" aria-hidden="true">
            <path d="M26 52a18 18 0 0 1-2-35 24 24 0 0 1 46-6 20 20 0 0 1 28 18 14 14 0 0 1-4 23z" fill="#fff" stroke="#cfeaff" strokeWidth="3" />
        </svg>
    );
}
function Star({ style, far = false }: { style: React.CSSProperties; far?: boolean }) {
    return (
        <svg className={`vp-star ${SK} ${far ? "far" : ""}`} style={style} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 2 3 6.5 7 .9-5.2 4.8 1.4 7L12 17.7 5.8 21.2l1.4-7L2 9.4l7-.9z" fill={SUN} stroke={SUN_DEEP} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    );
}
function Scene() {
    return (
        <div className="vp-scene" aria-hidden="true">
            <svg className={`vp-rainbow ${SK}`} viewBox="0 0 160 90">
                {["#ef4444", "#ff9a1f", "#ffd23f", "#4cc35b", "#2f8bf0", "#7c4dcc"].map((c, i) => {
                    const r = 68 - i * 7;
                    return <path key={c} d={`M${80 - r} 70A${r} ${r} 0 0 1 ${80 + r} 70`} fill="none" stroke={c} strokeWidth="7" />;
                })}
                <g fill="#fff">
                    <circle cx="14" cy="72" r="13" /><circle cx="30" cy="68" r="15" /><circle cx="26" cy="78" r="12" />
                    <circle cx="132" cy="72" r="13" /><circle cx="148" cy="68" r="12" /><circle cx="140" cy="78" r="12" />
                </g>
            </svg>
            <svg className={`vp-sun ${SK}`} viewBox="0 0 140 140">
                <g className="vp-rays">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <ellipse key={i} cx="70" cy="16" rx="6" ry="12" fill={SUN} stroke={SUN_DEEP} strokeWidth="2" transform={`rotate(${i * 30} 70 70)`} />
                    ))}
                </g>
                <circle cx="70" cy="70" r="36" fill={SUN_LIGHT} stroke={SUN_DEEP} strokeWidth="5" />
                <circle cx="52" cy="77" r="6" fill="#ffa9c4" opacity=".85" /><circle cx="88" cy="77" r="6" fill="#ffa9c4" opacity=".85" />
                <circle cx="58" cy="64" r="3.5" fill={NAVY} /><circle cx="82" cy="64" r="3.5" fill={NAVY} />
                <path d="M58 76q12 11 24 0" fill="none" stroke={NAVY} strokeWidth="3.5" strokeLinecap="round" />
            </svg>
            <Cloud className="c1" /><Cloud className="c2" /><Cloud className="c3" />
            <Star style={{ top: "24%", left: "6%", animationDelay: "0s" }} />
            <Star far style={{ top: "13%", left: "62%", animationDelay: "0.9s" }} />
            <Star style={{ top: "52%", left: "94%", animationDelay: "1.6s" }} />
            <Star far style={{ top: "72%", left: "4%", animationDelay: "0.4s" }} />
            <svg className={`vp-plane ${SK}`} viewBox="0 0 220 60">
                <path d="M0 52Q60 58 100 32T168 24" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
                <path d="M168 24 214 6 192 42 183 29z" fill="#dff1ff" stroke={BLUE} strokeWidth="3" strokeLinejoin="round" />
            </svg>
            <svg className={`vp-rocket ${SK}`} viewBox="0 0 60 90">
                <path d="M30 4c14 12 18 34 14 54H16C12 38 16 16 30 4z" fill="#fff" stroke={NAVY} strokeWidth="3" />
                <circle cx="30" cy="30" r="8" fill="#8fd3f7" stroke={NAVY} strokeWidth="3" />
                <path d="M16 46 4 62l12-2zM44 46l12 16-12-2z" fill="#ef4444" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
                <path d="M22 60c2 12 6 22 8 26 2-4 6-14 8-26z" fill={ORANGE} stroke={SUN} strokeWidth="3" />
            </svg>
            <svg className={`vp-extra l ${SK}`} viewBox="0 0 80 80">
                <circle cx="32" cy="32" r="22" fill="#dff4ff" stroke={BLUE} strokeWidth="7" />
                <path d="M49 49l22 22" stroke={ORANGE} strokeWidth="9" strokeLinecap="round" />
            </svg>
            <svg className={`vp-extra r ${SK}`} viewBox="0 0 80 80">
                <path d="M40 8C20 8 6 22 6 40s14 32 30 32c8 0 8-6 4-10-4-5 0-10 6-10h14c8 0 14-6 14-14C74 22 60 8 40 8z" fill="#fff3cf" stroke={ORANGE} strokeWidth="3" />
                {[["#ef4444", 26, 28], ["#2f8bf0", 44, 22], ["#4cc35b", 58, 34], ["#ff9a1f", 24, 46]].map(([c, x, y]) => <circle key={String(c)} cx={x as number} cy={y as number} r="5" fill={c as string} />)}
            </svg>
            {[{ l: "12%", c: "#fff", d: 13, s: "0s" }, { l: "46%", c: SUN_LIGHT, d: 16, s: "4s" }, { l: "74%", c: "#ffc4dd", d: 12, s: "7s" }, { l: "90%", c: "#b8f0bf", d: 17, s: "2s" }].map((b, i) => (
                <span key={i} className="vp-bubble" style={{ left: b.l, background: b.c, animationDuration: `${b.d}s`, animationDelay: b.s }} />
            ))}
            <svg className="vp-bank" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <g fill="#fff">
                    {Array.from({ length: 12 }).map((_, i) => <circle key={i} cx={i * 110 + 20} cy={95 - (i % 3) * 14} r={55 + (i % 2) * 14} />)}
                    <rect x="0" y="90" width="1300" height="40" />
                </g>
            </svg>
        </div>
    );
}

// ─── "Dream. Discover. Explore." banner ──────────────────────────────────────
function Drop({ x, y, r, s = 1, fill }: { x: number; y: number; r: number; s?: number; fill: string }) {
    const d = "M0 -24C11 -11 16 -1 16 8a16 16 0 0 1-32 0c0-9 5-19 16-32z";
    return (
        <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
            <path d={d} fill="#06165a" transform="translate(2 4)" />
            <path d={d} fill={fill} stroke="#fff" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" />
            <ellipse cx="-5" cy="2" rx="3" ry="6" fill="#fff" opacity=".75" transform="rotate(12 -5 2)" />
        </g>
    );
}

const BANNER_SEGS: [string, string][] = [
    ["Dream", "#ffffff"],
    [".", "#5cc8ff"],
    ["Discover", SUN],
    [".", "#5cc8ff"],
    ["Explore", "#ffffff"],
];
const BOUNCE = [-2, 3, -3, 2, -1, 3, -2];

function BannerChars({ colored }: { colored: boolean }) {
    let i = 0;
    return (
        <>
            {BANNER_SEGS.flatMap(([word, fill]) =>
                [...word].map((ch) => {
                    const k = i++;
                    const dy = BOUNCE[k % BOUNCE.length] - (k ? BOUNCE[(k - 1) % BOUNCE.length] : 0);
                    return (
                        <tspan key={k} dy={dy} fontSize={ch === "." ? 78 : undefined} {...(colored ? { fill } : {})}>
                            {ch}
                        </tspan>
                    );
                })
            )}
        </>
    );
}

function Banner() {
    const text = {
        fontSize: 58, fontWeight: 700, textAnchor: "middle" as const, letterSpacing: 1,
        strokeLinejoin: "round" as const, strokeLinecap: "round" as const, paintOrder: "stroke",
    };
    const CENTER = "M70 175Q400 5 730 175";
    return (
        <div className="vp-banner" role="img" aria-label="Dream. Discover. Explore.">
            <svg viewBox="0 0 800 250" aria-hidden="true">
                <defs>
                    <filter id="vp-rough" filterUnits="userSpaceOnUse" x="0" y="0" width="800" height="250">
                        <feTurbulence type="fractalNoise" baseFrequency="0.03 0.25" numOctaves="2" seed="7" result="n" />
                        <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                    <path id="vp-arc" d="M70 195Q400 25 730 195" />
                </defs>
                <g filter="url(#vp-rough)" fill="none">
                    <path d={CENTER} stroke="#3db8ff" strokeWidth="116" />
                    <path d={CENTER} stroke="#0a2380" strokeWidth="100" />
                </g>
                <g fill="none" strokeLinecap="round">
                    <path d={CENTER} transform="translate(0 -38)" stroke="#1e4fc4" strokeWidth="3" strokeDasharray="130 20 70 34 210 26" />
                    <path d={CENTER} transform="translate(0 -26)" stroke="#2f6fe0" strokeWidth="2" strokeDasharray="90 40 160 20" />
                    <path d={CENTER} transform="translate(0 28)" stroke="#2f6fe0" strokeWidth="2" strokeDasharray="140 24 80 36" />
                    <path d={CENTER} transform="translate(0 38)" stroke="#1e4fc4" strokeWidth="3" strokeDasharray="70 22 190 28" />
                </g>
                <text {...text} fill="#041048" stroke="#041048" strokeWidth="9" transform="translate(0 5)">
                    <textPath href="#vp-arc" startOffset="50%"><BannerChars colored={false} /></textPath>
                </text>
                <text {...text} stroke="#0a2380" strokeWidth="5">
                    <textPath href="#vp-arc" startOffset="50%"><BannerChars colored /></textPath>
                </text>
                {[false, true].map((mirror) => (
                    <g key={String(mirror)} transform={mirror ? "translate(800 0) scale(-1 1)" : undefined}>
                        <Drop x={52} y={70} r={-55} s={1.2} fill={SUN} />
                        <Drop x={98} y={30} r={-15} s={0.75} fill="#5cc8ff" />
                        <Drop x={24} y={112} r={-85} s={0.7} fill="#5cc8ff" />
                        <Drop x={28} y={176} r={-125} s={1} fill={SUN} />
                        <Drop x={60} y={218} r={-155} s={0.6} fill="#5cc8ff" />
                    </g>
                ))}
            </svg>
        </div>
    );
}

function Berry() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 7c-5-1-8 2-7 7 1 4 4 7 7 7s6-3 7-7c1-5-2-8-7-7z" fill="#ef4444" stroke={NAVY} strokeWidth="2" strokeLinejoin="round" />
            <path d="M8 6c2-2 6-2 8 0-2 1-6 1-8 0zM12 2v4" fill="#4cc35b" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// ─── Small building blocks ───────────────────────────────────────────────────
function Card({ children, tape = false, style, className = "" }: { children: ReactNode; tape?: boolean; style?: React.CSSProperties; className?: string }) {
    return (
        <section className={`vp-card ${className}`} style={style}>
            {tape && <span className="vp-tape" aria-hidden="true" />}
            {children}
        </section>
    );
}
function Heading({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
    return (
        <div className="vp-head">
            <span className="vp-badge"><Icon name={icon} /></span>
            <div>
                <h2 className="vp-h2">{title}</h2>
                {sub && <p className="vp-sub">{sub}</p>}
            </div>
        </div>
    );
}
function Empty({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
    return (
        <div className="vp-empty">
            <span className="vp-badge big"><Icon name={icon} size={30} /></span>
            <h3 className="vp-h3">{title}</h3>
            <p className="vp-sub" style={{ margin: "0 auto 14px", maxWidth: 380 }}>{text}</p>
            {action}
        </div>
    );
}
function InfoBox({ label, value, bg = INPUT_BG }: { label: string; value: ReactNode; bg?: string }) {
    return (
        <div className="vp-fav" style={{ background: bg }}>
            <span className="vp-label">{label}</span>
            <strong className="vp-fav-val">{value || "—"}</strong>
        </div>
    );
}

type StepState = "paid" | "pending" | "partial" | "due" | "late";
const STEP_LABEL: Record<StepState, string> = {
    paid: "Paid", pending: "Awaiting verification", partial: "Partially paid", due: "Not yet paid", late: "Overdue",
};
function Step({ state, title, amount, note }: { state: StepState; title: string; amount: string; note?: string }) {
    return (
        <div className={`vp-step ${state}`}>
            <div className="vp-step-top">
                <span className="vp-label">{title}</span>
                <span className="vp-pill">{state === "paid" && <Icon name="check" size={14} />}{STEP_LABEL[state]}</span>
            </div>
            <strong className="vp-step-amt">{amount}</strong>
            {note && <small className="vp-step-note">{note}</small>}
        </div>
    );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function TrailblazerDashboard(p: Props) {
    const { profile } = p;
    const [tab, setTab] = useState<Tab>("session");

    // Registration records for this family: from props, or (TEMP) fetched here
    const [fetchedRegs, setFetchedRegs] = useState<any[] | null>(null);
    useEffect(() => {
        const mail = (profile.email || "").toLowerCase();
        if (!TEMP_FETCH_REGISTRATIONS || p.registrations || !mail) return;
        fetch("/api/registrations?status=all")
            .then((r) => r.json())
            .then((d) => {
                const list: any[] = d?.success && Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : [];
                setFetchedRegs(list.filter((r) => (r.parentInfo?.email || "").toLowerCase() === mail));
            })
            .catch(() => setFetchedRegs([]));
    }, [p.registrations, profile.email]);
    const registrations: any[] = p.registrations ?? fetchedRegs ?? [];

    const recentAlbum = profile.albums?.[0] ?? null;
    const [expandedAlbum, setExpandedAlbum] = useState<string | null>(recentAlbum?.id ?? null);
    const waiverSigned = !!profile.waiverSignature;
    const childFavs = profile.studentInfo?.childInfo || profile.childInfo;
    const firstName = (profile.fullName || "").split(" ")[0] || "there";

    // Sessions completed, counted the same way as the main parent dashboard and Payment Tracking
    const TOTAL_SESSIONS = 18; // Trailblazer: Brave Explorer
    const sessionsDone = getCompletedSessionsCount(
        profile.studentInfo?.enrolledAt,
        profile.schedule || profile.studentInfo?.schedule || "",
        profile.classTime || profile.studentInfo?.classTime || ""
    );

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: "session", label: "Session", icon: "calendar" },
        { id: "virtual", label: "Virtual class", icon: "monitor" },
        { id: "photos", label: "Photos", icon: "camera" },
        { id: "waiver", label: "Waiver", icon: "shield" },
        { id: "payments", label: "Payments", icon: "card" },
        { id: "renewal", label: "Renewal", icon: "refresh" },
        { id: "profile", label: "Profile", icon: "user" },
    ];

    // ── Tab panels ─────────────────────────────────────────────────────────────
    function SessionPanel() {
        return (
            <>
                <Card tape>
                    <Heading icon="clock" title="Current program" sub="Here is the schedule for your child's sessions." />
                    <div className="vp-grid">
                        <InfoBox label="Program" value={profile.program || "Trailblazer"} bg="#dff1ff" />
                        {profile.schedule && <InfoBox label="Schedule" value={profile.schedule} bg="#d8f5dc" />}
                        {profile.classTime && <InfoBox label="Time" value={profile.classTime} bg="#fff6cf" />}
                    </div>
                    {profile.schedule && profile.classTime && (
                        <div className="vp-due" style={{ marginTop: 22, marginBottom: 0, alignItems: "center", textAlign: "center" }}>
                            <span className="vp-label" style={{ color: "#fff" }}>Next session countdown</span>
                            <NextSessionCountdown schedule={profile.schedule} classTime={profile.classTime} />
                        </div>
                    )}
                </Card>

                <Card>
                    <Heading icon="camera" title="Latest session" sub="Recent moments from class" />
                    {recentAlbum ? (
                        <div>
                            <h3 className="vp-h3">{recentAlbum.sessionLabel}</h3>
                            {recentAlbum.note && <p className="vp-note-box">{recentAlbum.note}</p>}
                            <div className="vp-tags" style={{ marginBottom: 18 }}>
                                <span className="vp-tag" style={{ background: "#dff1ff" }}>📸 {recentAlbum.photoCount} photo{recentAlbum.photoCount !== 1 ? "s" : ""}</span>
                                {recentAlbum.expiresAt && !isExpired(recentAlbum.expiresAt) && (
                                    <span className="vp-tag">⏰ Expires {fmtExpiry(recentAlbum.expiresAt)}</span>
                                )}
                                {recentAlbum.expiresAt && isExpired(recentAlbum.expiresAt) && (
                                    <span className="vp-tag" style={{ background: "#fff1ee", borderColor: "#ff6b57", color: ERROR }}>Expired</span>
                                )}
                            </div>
                            {!isExpired(recentAlbum.expiresAt) && (
                                <button className="vp-btn wide" style={{ marginTop: 0 }} onClick={() => { setTab("photos"); setExpandedAlbum(recentAlbum.id); }}>
                                    View session photos
                                </button>
                            )}
                        </div>
                    ) : (
                        <Empty icon="camera" title="No sessions recorded yet" text="Photos will appear here after your first class." />
                    )}
                </Card>
            </>
        );
    }

    function VirtualPanel() {
        return (
            <Card tape>
                <Heading icon="monitor" title="Virtual class" sub="Join your online sessions here when applicable." />
                {profile.virtualLinkOpen && profile.virtualLink ? (
                    <Empty icon="monitor" title="Virtual session is open" text="Tap the button when it's time to join the classroom."
                        action={<a className="vp-btn" href={profile.virtualLink} target="_blank" rel="noopener noreferrer">Join virtual class</a>} />
                ) : (
                    <Empty icon="monitor" title="Class closed" text="The virtual classroom is closed right now. It will open before the session begins." />
                )}
            </Card>
        );
    }

    function PhotosPanel() {
        const albums: any[] = profile.albums || [];
        return (
            <Card tape>
                <Heading icon="camera" title="Photos" sub="Moments shared by the teacher." />
                {albums.length === 0 ? (
                    <Empty icon="camera" title="No photos yet" text="Photos from your child's sessions will appear here once the teacher uploads them." />
                ) : (
                    <div className="vp-list">
                        {albums.map((album: any) => {
                            const expired = isExpired(album.expiresAt);
                            const expanded = expandedAlbum === album.id && !expired;
                            return (
                                <div key={album.id} className="vp-file" style={expired ? { opacity: 0.75 } : undefined}>
                                    <button
                                        className="vp-item flat"
                                        aria-expanded={expanded}
                                        disabled={expired}
                                        onClick={() => setExpandedAlbum(expanded ? null : album.id)}
                                    >
                                        <span className="vp-badge" style={{ background: "#dff1ff" }}><Icon name="camera" /></span>
                                        <span className="vp-item-text">
                                            <strong>{album.sessionLabel}</strong>
                                            <small>
                                                {album.photoCount} photo{album.photoCount !== 1 ? "s" : ""}
                                                {expired ? " · Expired" : album.expiresAt ? ` · Until ${fmtExpiry(album.expiresAt)}` : ""}
                                            </small>
                                        </span>
                                        {!expired && <span style={{ marginLeft: "auto", color: TEXT_2 }}>{expanded ? "▲" : "▼"}</span>}
                                    </button>
                                    {expired && (
                                        <p className="vp-sub" style={{ padding: "0 16px 16px", textAlign: "center" }}>
                                            This album has expired and the photos are no longer available.
                                        </p>
                                    )}
                                    {expanded && (
                                        <div style={{ padding: "14px 16px 16px", borderTop: `3px dashed ${INPUT_BORDER}` }}>
                                            {album.note && <p className="vp-note-box">📝 {album.note}</p>}
                                            {album.photos?.length > 0 ? (
                                                <div className="tb-photo-grid">
                                                    {album.photos.map((photo: any, idx: number) => (
                                                        <button key={idx} className="tb-photo-item" onClick={() => p.setLightbox?.({ album, photoIdx: idx })} aria-label={`Open photo ${idx + 1}`}>
                                                            <img src={photo.url} alt={photo.caption || `Photo ${idx + 1}`} />
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="vp-sub" style={{ textAlign: "center" }}>No photos available.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div className="vp-info">
                            <span style={{ fontSize: 24 }}>📌</span>
                            <div>
                                <strong>About Trailblazer photos</strong>
                                <p className="vp-sub" style={{ margin: "2px 0 0" }}>
                                    Photos are shared every <b>Thursday and Friday</b>. Albums are removed every <b>Saturday at 11:59 PM</b>.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        );
    }

    function WaiverPanel() {
        const date = profile.waiverSignedAt ? new Date(profile.waiverSignedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
        return (
            <Card tape>
                <Heading icon="shield" title="Waiver" sub={waiverSigned ? "Signed and safely on file." : "Please sign the waiver to continue."} />
                {waiverSigned ? (
                    <div className="vp-grid">
                        <InfoBox label="Signed by" value={profile.fullName} />
                        <InfoBox label="Child" value={profile.childName} />
                        <InfoBox label="Date signed" value={date} />
                        <InfoBox label="Photo consent" value={profile.photoConsent ? "Granted" : "Declined"} />
                    </div>
                ) : (
                    <div className="vp-error" role="alert">⚠️ Waiver required. Please sign the waiver to continue.</div>
                )}
                {profile.waiverSignature && (
                    <>
                        <h3 className="vp-h3" style={{ marginTop: 20 }}>Your signature</h3>
                        <div className="vp-sig"><img src={profile.waiverSignature} alt="Your signature" style={{ maxHeight: 90, display: "block" }} /></div>
                    </>
                )}
                <h3 className="vp-h3" style={{ marginTop: 20 }}>Your agreement</h3>
                <div className="vp-agree" tabIndex={0} aria-label="Agreement text, scrollable">{p.agreement}</div>
            </Card>
        );
    }

    function PaymentsPanel() {
        // Find this child's registration (same email, then same first name for siblings)
        const email = (profile.email || "").toLowerCase();
        const childName = (childFavs?.firstName || profile.childName || "").trim().toLowerCase();
        const mine = registrations.filter((r: any) => (r.parentInfo?.email || "").toLowerCase() === email);
        // handles multi-word first names like "Ian Angelo"; falls back to the first registration on this email
        const registration: any =
            mine.find((r: any) => {
                const rn = (r.childInfo?.firstName || "").trim().toLowerCase();
                return !!rn && !!childName && (rn === childName || childName.startsWith(rn) || rn.startsWith(childName));
            }) ?? mine[0] ?? null;

        // Ledger: registration + session payments (renewal downpayments belong to the Renewal tab, same as Payment Tracking's "Current Adventure" view)
        const ledger: LedgerRow[] = [];
        if (registration) {
            ledger.push({
                key: "reg", label: "Registration",
                date: registration.submittedAt || "", method: registration.paymentMethod || "", ref: registration.referenceNumber || "",
                amount: Number(registration.amountPaid || registration.amountDue || 0),
                verified: isRegistrationVerified(registration.status), rejected: registration.status === "rejected",
                note: registration.adminNote,
            });
        }
        (p.sessionPayments || []).forEach((sp: any) =>
            ledger.push({
                key: "s-" + sp.id, label: "Virtual Session",
                date: sp.submittedAt, method: sp.paymentMethod || "", ref: sp.referenceNumber || "",
                amount: Number(sp.amountPaid || 0), verified: !!sp.verified, rejected: !!sp.rejected, note: sp.adminNote,
            })
        );
        ledger.sort((x, y) => new Date(x.date || 0).getTime() - new Date(y.date || 0).getTime());

        // Balance math: identical to Payment Tracking (only the verified registration payment counts)
        const regLine = ledger.find((l) => l.key === "reg");
        const paidVerified = regLine?.verified ? regLine.amount : 0;
        const terms = registration
            ? calcRegistrationTerms(registration, getStudentSessionInfo(registration, profile), paidVerified, registration.amountDue)
            : null;
        const fullyPaid = terms?.balance === 0;
        const overdue = !!terms && terms.interest > 0;
        const regPending = !!regLine && !regLine.verified && !regLine.rejected;
        const pct = (n: number) => Math.round(n * 100);

        // Which part of the schedule is covered by verified payments
        const resAmt = terms?.reservation ?? 0;
        const balAmt = terms?.balanceShare ?? 0;
        const resPaid = !!terms && terms.paidVerified >= resAmt;
        const balPaidAmt = terms ? Math.min(balAmt, Math.max(0, terms.paidVerified - resAmt)) : 0;
        const balPaid = !!terms && balPaidAmt >= balAmt;
        const balPartial = !balPaid && balPaidAmt > 0;

        return (
            <>
                <Card tape>
                    <Heading icon="card" title="Payment summary" sub="Your balance, due date and any interest." />
                    {p.paymentsLoading ? (
                        <Empty icon="card" title="Loading payments…" text="Please wait a moment." />
                    ) : !registration || !terms || terms.due == null ? (
                        <>
                            <Empty icon="card" title="No payment details yet" text="Your fee and balance will appear here once your registration is on file." />
                            {process.env.NODE_ENV !== "production" && (
                                <p className="vp-sub" style={{ marginTop: 10 }}>
                                    dev: {registrations.length} registration(s) received for {profile.email || "no email"}
                                    {registration && terms?.due == null ? ` · registration found but no fee for program "${registration.program}"` : ""}
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="vp-due" style={{ alignItems: "center", textAlign: "center" }}>
                                <span className="vp-label" style={{ color: "#fff" }}>{fullyPaid ? "Balance" : "Total payable now"}</span>
                                <strong className="vp-count-line" style={fullyPaid ? { color: "#b6f5c2" } : undefined}>
                                    {fullyPaid ? "Fully paid" : fmtPeso(terms.totalPayable)}
                                </strong>
                                {overdue && (
                                    <span style={{ fontSize: 14, color: SUN_LIGHT, fontWeight: 600 }}>
                                        includes {fmtPeso(terms.interest)} interest ({pct(WEEKLY_INTEREST_RATE)}% × {terms.mondays} Monday{terms.mondays > 1 ? "s" : ""})
                                    </span>
                                )}
                                {!fullyPaid && !overdue && terms.dueDate && (
                                    <span style={{ fontSize: 14, color: SUN_LIGHT, fontWeight: 600 }}>
                                        Balance due on {fmtIsoDate(terms.dueDate)}
                                    </span>
                                )}
                            </div>

                            {regPending && (
                                <div className="vp-note-box">Your registration payment is awaiting verification, so it is not counted in the balance yet.</div>
                            )}
                            {regLine?.rejected && (
                                <div className="vp-error" role="alert">
                                    Your registration payment was rejected.{regLine.note ? ` Reason: ${regLine.note}` : ""} Please contact the center.
                                </div>
                            )}

                            <h3 className="vp-h3" style={{ marginBottom: 14 }}>Payment schedule</h3>
                            <div className="vp-grid">
                                <Step
                                    state={resPaid ? "paid" : regPending ? "pending" : "due"}
                                    title={`Reservation (${pct(RESERVATION_RATE)}%)`}
                                    amount={fmtPeso(terms.reservation)}
                                    note={resPaid ? "Received and verified" : regPending ? "We are checking your payment" : "Non-refundable, paid upon registration"}
                                />
                                <Step
                                    state={balPaid ? "paid" : overdue ? "late" : balPartial ? "partial" : "due"}
                                    title={`Balance (${100 - pct(RESERVATION_RATE)}%) · session ${BALANCE_DUE_SESSION}`}
                                    amount={fmtPeso(terms.balanceShare)}
                                    note={
                                        balPaid
                                            ? "Received and verified"
                                            : [
                                                balPartial ? `${fmtPeso(balPaidAmt)} of ${fmtPeso(balAmt)} paid` : "",
                                                terms.dueDate ? `Due ${fmtIsoDate(terms.dueDate)}` : "Due date not set",
                                                overdue ? `+${fmtPeso(terms.interest)} interest so far` : "",
                                            ].filter(Boolean).join(" · ")
                                    }
                                />
                            </div>

                            <details className="vp-more">
                                <summary>See fee breakdown</summary>
                                <div className="vp-receipt">
                                    {terms.items.map((it) => (
                                        <div key={it.key} className="vp-rrow"><span>{it.label}</span><span>{fmtPeso(it.amount)}</span></div>
                                    ))}
                                    <div className="vp-rrow total"><span>Total fee</span><span>{fmtPeso(terms.due)}</span></div>
                                    <div className="vp-rrow"><span>Verified paid</span><span>− {fmtPeso(terms.paidVerified)}</span></div>
                                    <div className="vp-rrow total"><span>Remaining balance</span><span>{fmtPeso(terms.balance)}</span></div>
                                    {!fullyPaid && (
                                        <>
                                            <div className={`vp-rrow ${overdue ? "late" : ""}`}>
                                                <span>
                                                    {overdue
                                                        ? `Interest (${pct(WEEKLY_INTEREST_RATE)}% × ${terms.mondays} Monday${terms.mondays > 1 ? "s" : ""})`
                                                        : `Interest (${pct(WEEKLY_INTEREST_RATE)}% every Monday)`}
                                                    {!overdue && (
                                                        <small>
                                                            {terms.interestStart ? `None yet. First charge Monday, ${fmtIsoDate(terms.interestStart)}` : "Starts the Monday after session 6"}
                                                        </small>
                                                    )}
                                                </span>
                                                <span>{overdue ? "+ " : ""}{fmtPeso(terms.interest)}</span>
                                            </div>
                                            <div className={`vp-rrow total ${overdue ? "late" : ""}`}><span>Total payable now</span><span>{fmtPeso(terms.totalPayable)}</span></div>
                                        </>
                                    )}
                                </div>
                            </details>

                            {!fullyPaid && (
                                <p className="vp-sub" style={{ marginTop: 14 }}>
                                    📌 Unpaid balances after the due date are charged <b>{pct(WEEKLY_INTEREST_RATE)}% every Monday</b>. Only verified payments reduce your balance.
                                </p>
                            )}
                        </>
                    )}
                </Card>

                {!p.paymentsLoading && ledger.length > 0 && (
                    <Card>
                        <Heading icon="card" title="Payment history" sub="Every payment you have submitted." />
                        <div className="vp-list">
                            {ledger.map((l) => {
                                const st = ledgerStatus(l);
                                const bg = l.verified ? "#d8f5dc" : l.rejected ? "#fff1ee" : undefined;
                                return (
                                    <div key={l.key} className="vp-pay" style={bg ? { background: bg } : undefined}>
                                        <div>
                                            <strong>{l.label}</strong>
                                            <small>
                                                {l.date ? new Date(l.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                                                {l.method ? ` · ${l.method.toUpperCase()}` : ""}
                                            </small>
                                            {l.ref && <small>Ref: {l.ref}</small>}
                                            {l.rejected && l.note && <small style={{ color: ERROR }}>Reason: {l.note}</small>}
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <strong style={{ display: "block", fontSize: 18 }}>{fmtPeso(l.amount)}</strong>
                                            <span className="vp-tag" style={l.rejected ? { color: ERROR, borderColor: "#ff6b57" } : undefined}>{st}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                )}
            </>
        );
    }

    function RenewalPanel() {
        return (
            <Card tape>
                <Heading icon="refresh" title="Renewal" sub="Renew your child's enrollment." />
                <Empty icon="refresh" title="Coming soon" text="Renewal options for Trailblazer will be available shortly." />
            </Card>
        );
    }

    function ProfilePanel() {
        return (
            <>
                <Card tape>
                    <Heading icon="user" title="Child information" sub="Registration details on file." />
                    <div className="vp-grid">
                        <InfoBox label="First name" value={childFavs?.firstName} />
                        <InfoBox label="Last name" value={childFavs?.lastName} />
                        <InfoBox label="Nickname" value={childFavs?.nickname} />
                        <InfoBox label="Date of birth" value={childFavs?.dateOfBirth} />
                        <InfoBox label="Gender" value={childFavs?.gender} />
                        <InfoBox label="Health notes" value={childFavs?.healthProfile || "None"} />
                    </div>
                </Card>
                <Card>
                    <Heading icon="user" title="Parent / guardian" sub="How we reach you." />
                    <div className="vp-grid">
                        <InfoBox label="Full name" value={profile.fullName} bg="#fff6cf" />
                        <InfoBox label="Email" value={profile.email} bg="#fff6cf" />
                        <InfoBox label="Phone" value={profile.phone} bg="#fff6cf" />
                    </div>
                </Card>
            </>
        );
    }

    const panels: Record<Tab, () => ReactNode> = {
        session: SessionPanel, virtual: VirtualPanel, photos: PhotosPanel,
        waiver: WaiverPanel, payments: PaymentsPanel, renewal: RenewalPanel, profile: ProfilePanel,
    };

    return (
        <div className={`vp-root ${fredoka.className}`}>
            <style>{CSS}</style>
            <Scene />

            <div className="vp-main">
                {/* Top bar */}
                <header className="vp-top">
                    <span className="vp-note">Parent portal</span>
                    <button className="vp-btn blue small" onClick={p.onChangePassword}>Change password</button>
                    <button id="parent-signout-btn" className="vp-btn ghost small" onClick={p.signOut}>Sign out</button>
                </header>

                {/* Hero */}
                <Card tape className="vp-hero-card">
                    <span className="vp-logo-badge"><Image src="/LOGO-noBG.png" alt="Merry Explorers Playgroup & Learning Center" fill style={{ objectFit: "contain", padding: 6 }} /></span>
                    <div className="vp-hero">
                        <div className="vp-photo">
                            <i className="vp-photo-tape" aria-hidden="true" />
                            <div className="vp-photo-inner" style={{ background: profile.avatarColor || NAVY }}>
                                {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.childName || profile.fullName} /> : <b>{profile.initials || "?"}</b>}
                            </div>
                        </div>
                        <div className="vp-hero-body">
                            <div className="vp-title-wrap"><h1 className="vp-title">Hi, {firstName}!</h1></div>
                            <p className="vp-note"><Berry />Follow {profile.childName || "your child"}'s adventure.</p>
                            <div className="vp-tags">
                                <span className="vp-tag" style={{ background: "#dff1ff" }}>{profile.program || "Trailblazer"}</span>
                                {profile.classTime && <span className="vp-tag" style={{ background: "#d8f5dc" }}>{profile.classTime}</span>}
                                {profile.status && (
                                    <span className="vp-tag" style={{ background: profile.status === "active" ? "#d8f5dc" : "#e6eaf2" }}>{profile.status === "active" ? "Active" : "Inactive"}</span>
                                )}
                            </div>
                        </div>
                        <div className="vp-stats">
                            <div className="vp-stat"><strong>{sessionsDone}<small> / {TOTAL_SESSIONS}</small></strong><span>sessions</span></div>
                            <div className="vp-stat"><strong>{profile.albums?.length || 0}</strong><span>photo albums</span></div>
                        </div>
                    </div>
                </Card>

                {/* Tabs */}
                <nav className="vp-tabs" role="tablist" aria-label="Portal sections">
                    {tabs.map((t) => (
                        <button key={t.id} id={`parent-tab-${t.id}`} role="tab" aria-selected={tab === t.id} className={`vp-tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
                            <Icon name={t.icon} size={20} />{t.label}
                        </button>
                    ))}
                </nav>

                <div role="tabpanel" className="vp-panel">{panels[tab]()}</div>

                <Banner />
            </div>

            {p.toast && (
                <div className={`vp-toast ${p.toast.type}`} role="status">
                    <span>{p.toast.msg}</span>
                    <button onClick={p.clearToast} aria-label="Dismiss message">✕</button>
                </div>
            )}
        </div>
    );
}

// ─── Styles (shared with VirtualDashboard + a few Trailblazer extras) ────────
const CSS = `
.vp-root{min-height:100vh;position:relative;overflow-x:hidden;color:${NAVY};font-weight:500;
  background:radial-gradient(ellipse at 50% 0%,#b9e5fb 0%,#8fd3f7 55%,#74c3f1 100%);background-attachment:fixed}
.vp-root *{box-sizing:border-box}
.vp-main{position:relative;z-index:1;width:100%;max-width:1100px;margin:0 auto;padding:28px 20px 150px;display:flex;flex-direction:column;gap:40px}
.vp-sub{margin:4px 0 0;font-size:14px;color:${TEXT_2};font-weight:500;line-height:1.5}
.vp-h2{margin:0;font-size:22px;font-weight:700;color:${NAVY}}
.vp-h3{margin:0 0 12px;font-size:17px;font-weight:700;color:${NAVY};display:flex;align-items:center;gap:8px}
.vp-label{font-size:15px;font-weight:600;color:${NAVY}}
.vp-title{margin:0;font-size:40px;font-weight:700;line-height:1.1;color:${BLUE};-webkit-text-stroke:7px ${NAVY};paint-order:stroke fill;text-shadow:0 4px 0 ${NAVY};filter:drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff)}

/* scene */
.vp-sticker{filter:drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff)}
.vp-scene{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.vp-sun{position:absolute;top:8px;right:16px;width:150px;animation:vp-bob 5s ease-in-out infinite}
.vp-rays{transform-origin:70px 70px;animation:vp-rot 40s linear infinite}
.vp-rainbow{position:absolute;top:14px;left:10px;width:190px;animation:vp-bob 5s ease-in-out infinite;animation-delay:-2s}
.vp-cloud{position:absolute;left:0;width:130px;overflow:visible;animation:vp-drift linear infinite;will-change:transform}
.vp-cloud.c1{top:18%;animation-duration:70s}
.vp-cloud.c2{top:46%;width:104px;animation-duration:90s;animation-delay:-40s}
.vp-cloud.c3{top:72%;width:156px;animation-duration:58s;animation-delay:-20s}
.vp-star{position:absolute;width:28px;animation:vp-twinkle 2.6s ease-in-out infinite}
.vp-bubble{position:absolute;bottom:-40px;width:22px;height:22px;border-radius:50%;border:3px solid #fff;opacity:.8;animation:vp-rise linear infinite}
.vp-bank{position:absolute;left:-5%;bottom:-20px;width:110%;height:90px;animation:vp-sway 9s ease-in-out infinite}
.vp-plane{position:absolute;top:32%;left:0;width:220px;animation:vp-fly 26s linear infinite}
.vp-rocket{position:absolute;left:-80px;bottom:-110px;width:56px;animation:vp-launch 20s linear infinite;animation-delay:5s}
.vp-extra{position:absolute;bottom:90px;width:84px;display:none}.vp-extra.l{left:1.5%}.vp-extra.r{right:1.5%}
@media(min-width:1360px){.vp-extra{display:block}}
@keyframes vp-bob{50%{transform:translateY(10px)}}
@keyframes vp-rot{to{transform:rotate(360deg)}}
@keyframes vp-drift{from{transform:translateX(-200px)}to{transform:translateX(110vw)}}
@keyframes vp-fly{from{transform:translateX(-260px)}to{transform:translateX(110vw)}}
@keyframes vp-launch{from{transform:translate(0,0) rotate(45deg)}to{transform:translate(115vw,-125vh) rotate(45deg)}}
@keyframes vp-twinkle{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.6);opacity:.5}}
@keyframes vp-rise{to{transform:translateY(-110vh)}}
@keyframes vp-sway{50%{transform:translateX(24px)}}
@keyframes vp-spin{to{transform:rotate(360deg)}}

/* top bar + note sticker */
.vp-top{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:12px}
.vp-note{display:inline-flex;align-items:center;gap:8px;margin:0;padding:8px 16px;font-size:15px;font-weight:600;color:${NAVY};
  background:linear-gradient(#ffeb8f,${SUN_LIGHT});border-radius:6px;transform:rotate(-1.5deg);box-shadow:0 4px 0 rgba(11,42,130,.18)}
.vp-note-box{margin:0 0 16px;padding:12px 16px;background:${INPUT_BG};border:3px solid ${INPUT_BORDER};border-left:8px solid ${BLUE};border-radius:16px;font-size:14px;font-weight:500;color:${TEXT_2};line-height:1.5}

/* cards */
.vp-card{position:relative;background:#fff;border:4px solid ${NAVY};border-radius:28px;padding:28px;
  box-shadow:0 0 0 6px #fff,0 12px 0 6px rgba(11,42,130,.18)}
.vp-tape{position:absolute;top:-17px;left:50%;width:92px;height:28px;margin-left:-46px;transform:rotate(6deg);
  background:repeating-linear-gradient(45deg,${SUN} 0 9px,${SUN_LIGHT} 9px 18px);border:2px solid rgba(11,42,130,.25);border-radius:4px}
.vp-head{display:flex;gap:14px;align-items:center;margin-bottom:20px}
.vp-badge{width:46px;height:46px;border-radius:16px;border:3px solid ${NAVY};background:${SUN_LIGHT};color:${NAVY};display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.vp-badge.big{width:68px;height:68px;border-radius:50%;margin-bottom:12px}
.vp-row-between{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
.vp-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.vp-empty{text-align:center;padding:24px 12px;border:3px dashed ${INPUT_BORDER};border-radius:20px;background:${INPUT_BG}}
.vp-empty .vp-h3{justify-content:center}

/* hero */
.vp-hero-card{margin-top:36px}
.vp-logo-badge{position:absolute;top:-54px;left:28px;z-index:2;width:92px;height:92px;border-radius:50%;overflow:hidden;background:#fff;border:4px solid ${NAVY};
  box-shadow:0 0 0 5px #fff,0 6px 0 5px rgba(11,42,130,.18)}
.vp-hero{display:flex;align-items:center;gap:26px;flex-wrap:wrap;padding-top:40px}
.vp-hero-body{flex:1;min-width:220px;display:flex;flex-direction:column;align-items:flex-start;gap:14px}
.vp-title-wrap{position:relative;display:inline-block;padding:0 6px}
.vp-title-wrap::before,.vp-title-wrap::after{content:"";position:absolute;top:8px;width:12px;height:28px;border-radius:50%;background:${SUN};border:2px solid #fff}
.vp-title-wrap::before{left:-24px;transform:rotate(-50deg)}.vp-title-wrap::after{right:-24px;transform:rotate(50deg)}
.vp-photo{position:relative;flex-shrink:0;width:108px;height:108px;padding:6px;background:#fff;border:3px solid ${NAVY};border-radius:12px;transform:rotate(-4deg);box-shadow:0 6px 0 rgba(11,42,130,.2)}
.vp-photo-inner{width:100%;height:100%;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#fff;font-size:30px}
.vp-photo-inner img{width:100%;height:100%;object-fit:cover}
.vp-photo-tape{position:absolute;top:-13px;left:50%;width:54px;height:18px;margin-left:-27px;transform:rotate(-4deg);background:repeating-linear-gradient(45deg,${SUN_LIGHT} 0 6px,#fff0a8 6px 12px);border:1.5px solid rgba(11,42,130,.2)}
.vp-tags{display:flex;gap:8px;flex-wrap:wrap}
.vp-tag{display:inline-block;font-size:13px;font-weight:600;color:${NAVY};border:2.5px solid ${NAVY};border-radius:20px;padding:3px 12px;background:#fff6cf}
.vp-stat{text-align:center;background:#fff6cf;border:3px solid ${NAVY};border-radius:20px;padding:12px 22px;box-shadow:0 5px 0 rgba(11,42,130,.2)}
.vp-stat strong{display:block;font-size:32px;line-height:1.1}.vp-stat span{font-size:13px;color:${TEXT_2};font-weight:600}
.vp-stat strong small{font-size:17px;color:${TEXT_2};font-weight:600}
.vp-stats{display:flex;gap:14px;flex-wrap:wrap;justify-content:center}

/* tabs */
.vp-tabs{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;padding:4px 4px 8px}
.vp-tab{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;min-height:46px;padding:0 18px;font:inherit;font-size:15px;font-weight:600;color:${NAVY};
  background:#fff;border:3px solid ${NAVY};border-radius:18px;box-shadow:0 4px 0 rgba(11,42,130,.3);cursor:pointer;transition:transform .1s}
.vp-tab:hover{transform:translateY(-2px)}
.vp-tab.on{background:linear-gradient(${SUN_LIGHT},${SUN} 50%,${SUN_DEEP});box-shadow:0 4px 0 ${NAVY}}
.vp-panel{display:flex;flex-direction:column;gap:40px}

/* buttons */
.vp-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:0 24px;font:inherit;font-size:18px;font-weight:700;color:${NAVY};text-decoration:none;cursor:pointer;
  background:linear-gradient(${SUN_LIGHT},${SUN} 50%,${SUN_DEEP});border:3px solid ${NAVY};border-radius:18px;box-shadow:0 6px 0 ${NAVY};transition:transform .1s,box-shadow .1s}
.vp-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 0 ${NAVY}}
.vp-btn:active:not(:disabled){transform:translateY(5px);box-shadow:0 1px 0 ${NAVY}}
.vp-btn:disabled{background:#fff3c4;color:#6f7fb0;border-color:#8c9bc9;box-shadow:0 6px 0 #c3cce6;cursor:not-allowed}
.vp-btn.blue{background:${BLUE};color:#fff}
.vp-btn.ghost{background:#fff}
.vp-btn.small{min-height:44px;font-size:15px;padding:0 16px;box-shadow:0 4px 0 ${NAVY}}
.vp-btn.wide{width:100%;margin-top:22px}
.vp-error{margin:12px 0;padding:10px 14px;border:3px solid #ff6b57;background:#fff1ee;color:${ERROR};border-radius:16px;font-weight:600;font-size:14px}
.vp-root button:focus-visible,.vp-root a:focus-visible,.vp-agree:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(255,210,63,.9),0 0 0 7px ${NAVY}}

/* lists & items */
.vp-list{display:grid;gap:12px}
.vp-item{display:flex;align-items:center;gap:14px;width:100%;min-height:64px;padding:12px 14px;text-align:left;font:inherit;color:${NAVY};cursor:pointer;background:#fff6cf;border:3px solid ${NAVY};border-radius:18px;box-shadow:0 4px 0 rgba(11,42,130,.25)}
.vp-item.flat{background:transparent;border:none;box-shadow:none;border-radius:0}
.vp-item:hover:not(:disabled){background:#fff0b3}
.vp-item:disabled{cursor:default}
.vp-item-text{display:flex;flex-direction:column;min-width:0}.vp-item-text strong{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vp-item-text small,.vp-pay small{color:${TEXT_2};font-size:13px;display:block;margin-top:2px}
.vp-file{background:${INPUT_BG};border:3px solid ${NAVY};border-radius:18px;overflow:hidden}
.vp-fav{border:3px solid ${NAVY};border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:4px}
.vp-fav:nth-child(odd){transform:rotate(-1deg)}.vp-fav:nth-child(even){transform:rotate(1deg)}
.vp-fav-val{font-size:16px;font-weight:700;overflow-wrap:anywhere}
.vp-sig{display:inline-block;background:${INPUT_BG};border:3px solid ${INPUT_BORDER};border-radius:16px;padding:12px}
.vp-agree{border:3px solid ${INPUT_BORDER};border-radius:18px;padding:18px 20px;max-height:380px;overflow-y:auto;font-size:14px;line-height:1.7;color:#27407f;background:#fff}
.vp-pay{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 16px;border:3px solid ${NAVY};border-radius:18px;background:#fff6cf}
.vp-pay .vp-tag{background:#fff}
.vp-info{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;background:#dff1ff;border:3px solid ${NAVY};border-radius:18px}

/* countdown (reuses the blue "due" panel) */
.vp-due{background:linear-gradient(135deg,${BLUE},#2f8bf0);border:3px solid ${NAVY};border-radius:20px;padding:18px 20px;margin-bottom:22px;color:#fff;box-shadow:0 6px 0 ${NAVY};display:flex;flex-direction:column;gap:6px}
.vp-count-line{display:flex;gap:14px;justify-content:center;font-size:34px;font-weight:700;line-height:1.2}

/* collapsible fee breakdown */
.vp-more{margin-top:18px;border:3px solid ${NAVY};border-radius:18px;background:${INPUT_BG};overflow:hidden}
.vp-more summary{cursor:pointer;list-style:none;padding:12px 16px;font-weight:700;font-size:15px;display:flex;justify-content:space-between;align-items:center}
.vp-more summary::-webkit-details-marker{display:none}
.vp-more summary::after{content:"▼";font-size:12px;color:${TEXT_2}}
.vp-more[open] summary::after{content:"▲"}
.vp-more summary:focus-visible{outline:none;box-shadow:inset 0 0 0 4px rgba(255,210,63,.9)}
.vp-receipt{padding:0 16px 8px;background:#fff;border-top:3px dashed ${INPUT_BORDER}}
.vp-rrow{display:flex;justify-content:space-between;gap:12px;padding:10px 0;font-size:14px;border-bottom:2px dashed ${INPUT_BORDER}}
.vp-rrow:last-child{border-bottom:none}
.vp-rrow.total{font-weight:700;font-size:16px}
.vp-rrow.late{color:${ERROR};font-weight:700}
.vp-rrow small{display:block;color:${TEXT_2};font-size:12px;font-weight:500;margin-top:2px}

/* payment schedule steps */
.vp-step{border:3px solid ${NAVY};border-radius:18px;padding:14px 16px;display:flex;flex-direction:column;gap:6px;background:#fff6cf;border-style:dashed}
.vp-step-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap}
.vp-step-amt{font-size:24px;line-height:1.1}
.vp-step-note{font-size:13px;color:${TEXT_2};font-weight:600}
.vp-pill{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;border:2.5px solid ${NAVY};background:#fff;white-space:nowrap}
.vp-step.paid{background:#d8f5dc;border-style:solid;box-shadow:0 5px 0 rgba(11,42,130,.25)}
.vp-step.paid .vp-pill{background:#2fa84f;border-color:${NAVY};color:#fff}
.vp-step.pending .vp-pill,.vp-step.partial .vp-pill{background:${SUN_LIGHT}}
.vp-step.late{background:#fff1ee;border-color:#ff6b57}
.vp-step.late .vp-pill{background:#ff6b57;border-color:${ERROR};color:#fff}
.vp-step.late .vp-step-note{color:${ERROR}}

/* photos */
.tb-photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
.tb-photo-item{padding:0;aspect-ratio:1;overflow:hidden;cursor:pointer;background:#fff;border:3px solid ${NAVY};border-radius:16px;box-shadow:0 4px 0 rgba(11,42,130,.25);transition:transform .1s}
.tb-photo-item:hover{transform:translateY(-3px) rotate(-1deg)}
.tb-photo-item img{display:block;width:100%;height:100%;object-fit:cover}

/* banner & toast */
.vp-banner{width:min(720px,100%);margin:6px auto 0}
.vp-banner svg{display:block;width:100%;height:auto;filter:drop-shadow(0 6px 0 rgba(11,42,130,.2))}
.vp-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:50;display:flex;align-items:center;gap:12px;min-width:260px;max-width:90vw;padding:12px 18px;background:#fff;border:3px solid ${NAVY};border-radius:18px;box-shadow:0 6px 0 ${NAVY};font-weight:600}
.vp-toast.success{background:#d8f5dc}.vp-toast.error{background:#fff1ee;border-color:#ff6b57;color:${ERROR}}
.vp-toast span{flex:1}.vp-toast button{min-width:44px;min-height:44px;background:none;border:none;font:inherit;color:inherit;cursor:pointer}

@media(max-width:640px){
  .vp-main{padding:104px 14px 140px;gap:34px}
  .vp-panel{gap:34px}
  .vp-title{font-size:34px}
  .vp-card{padding:24px 18px}
  .vp-count-line{font-size:28px}
  .vp-sun{width:84px;right:8px}.vp-rainbow{width:104px;left:4px}
  .vp-star.far,.vp-plane,.vp-rocket{display:none}
  .vp-logo-badge{left:50%;margin-left:-46px}
  .vp-hero-card .vp-tape{left:auto;right:22px;margin-left:0}
  .vp-hero{justify-content:center;text-align:center}.vp-hero-body{align-items:center}.vp-tags{justify-content:center}
  .vp-title-wrap::before,.vp-title-wrap::after{display:none}
  .vp-tabs{flex-wrap:nowrap;overflow-x:auto;justify-content:flex-start;padding-bottom:14px;-webkit-overflow-scrolling:touch}
}
@media(prefers-reduced-motion:reduce){
  .vp-scene *,.vp-scene{animation:none!important}.vp-bubble,.vp-plane,.vp-rocket{display:none}
  .vp-btn,.vp-tab,.tb-photo-item{transition:none}
}
`;