"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Fredoka } from "next/font/google";

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
type Tab = "virtual" | "folder" | "payments" | "waiver" | "profile";

type Props = {
    profile: any; // ParentProfile from the page
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
    onOpenMaterial: (m: any) => void;
    loadingFileId: string | null;
    agreement: ReactNode; // the read-only waiver text
};

// ─── Icons (rounded 2.2px stroke, lucide style) ──────────────────────────────
const ICONS: Record<string, ReactNode> = {
    monitor: <><rect x="2" y="3" width="20" height="14" rx="3" /><path d="M8 21h8M12 17v4" /></>,
    folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    card: <><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20" /></>,
    shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="m9 12 2 2 4-4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 20h16" /></>,
    file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
    play: <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4z" /></>,
    camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
    check: <path d="m5 12 5 5 9-10" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};
function Icon({ name, size = 22 }: { name: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONS[name]}
        </svg>
    );
}

// ─── Background scene (calm version for content-heavy pages) ─────────────────
const SK = "vp-sticker"; // white sticker outline
function Cloud({ className }: { className: string }) {
    return (
        <svg className={`vp-cloud ${SK} ${className}`} viewBox="0 0 120 60" aria-hidden="true">
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

// "Dream. Discover. Explore." swoosh banner, like the Facebook posts
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

const BANNER_SEGS: [string, string, string][] = [
    ["DREAM", "#ffffff", "#dbe9ff"],
    [".", "#5cc8ff", "#ffffff"],
    ["Discover", SUN, "#ffffff"],
    [".", "#5cc8ff", "#ffffff"],
    ["Explore", "#ffffff", "#dbe9ff"],
];
const BOUNCE = [-2, 3, -3, 2, -1, 3, -2]; // vertical offset per letter

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
    const CENTER = "M70 175Q400 5 730 175"; // band centerline
    return (
        <div className="vp-banner" role="img" aria-label="Dream. Discover. Explore.">
            <svg viewBox="0 0 800 250" aria-hidden="true">
                <defs>
                    <filter id="vp-rough" filterUnits="userSpaceOnUse" x="0" y="0" width="800" height="250">
                        <feTurbulence type="fractalNoise" baseFrequency="0.03 0.25" numOctaves="2" seed="7" result="n" />
                        <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                    <mask id="vp-band-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="250">
                        <path d={CENTER} fill="none" stroke="#fff" strokeWidth="92" strokeLinecap="round" />
                    </mask>
                    <path id="vp-arc" d="M70 195Q400 25 730 195" />
                </defs>

                {/* brush band: thin light-blue rim, thick navy core */}
                <g filter="url(#vp-rough)" fill="none">
                    <path d={CENTER} stroke="#3db8ff" strokeWidth="116" />
                    <path d={CENTER} stroke="#0a2380" strokeWidth="100" />
                </g>

                {/* dry-brush streaks */}
                <g fill="none" strokeLinecap="round">
                    <path d={CENTER} transform="translate(0 -38)" stroke="#1e4fc4" strokeWidth="3" strokeDasharray="130 20 70 34 210 26" />
                    <path d={CENTER} transform="translate(0 -26)" stroke="#2f6fe0" strokeWidth="2" strokeDasharray="90 40 160 20" />
                    <path d={CENTER} transform="translate(0 28)" stroke="#2f6fe0" strokeWidth="2" strokeDasharray="140 24 80 36" />
                    <path d={CENTER} transform="translate(0 38)" stroke="#1e4fc4" strokeWidth="3" strokeDasharray="70 22 190 28" />
                </g>

                {/* lettering: dark shadow, then white letters with navy outline */}
                <text {...text} fill="#041048" stroke="#041048" strokeWidth="9" transform="translate(0 5)">
                    <textPath href="#vp-arc" startOffset="50%"><BannerChars colored={false} /></textPath>
                </text>
                <text {...text} stroke="#0a2380" strokeWidth="5">
                    <textPath href="#vp-arc" startOffset="50%"><BannerChars colored /></textPath>
                </text>

                {/* splashes, mirrored to the right side */}
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
function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
    return (
        <div className="vp-field">
            <label htmlFor={id} className="vp-label">{label}</label>
            {children}
        </div>
    );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function VirtualDashboard(p: Props) {
    const { profile, user, showToast } = p;
    const [tab, setTab] = useState<Tab>("virtual");
    const childFavs = profile.studentInfo?.childInfo || profile.childInfo;
    const firstName = (profile.fullName || "").split(" ")[0] || "there";
    const due = profile.promoDiscount ? profile.promoDiscount.finalPrice : 450;

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: "virtual", label: "Virtual class", icon: "monitor" },
        { id: "folder", label: "Study folder", icon: "folder" },
        { id: "payments", label: "Payments", icon: "card" },
        { id: "waiver", label: "Waiver", icon: "shield" },
        { id: "profile", label: "Profile", icon: "user" },
    ];

    // ── Submissions (study folder)
    const subRef = useRef<HTMLInputElement>(null);
    const [subFor, setSubFor] = useState<string | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    async function handleSubmissionFile(file?: File) {
        if (!file || !subFor) return;
        const materialId = subFor;
        setUploadingId(materialId);
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("folder", `submissions/${profile.id}`);
            const up = await (await fetch("/api/upload", { method: "POST", body: form })).json();
            if (!up.success) throw new Error(up.error || "Upload failed");
            const res = await fetch("/api/parents/study-materials/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: profile.id, materialId, key: up.key, fileName: file.name, fileType: file.type, size: file.size }),
            });
            if (!res.ok) throw new Error("Failed to record submission");
            p.setProfile((prev) => ({
                ...prev,
                studyMaterials: prev.studyMaterials?.map((m: any) =>
                    m.id === materialId ? { ...m, submission: { key: up.key, fileName: file.name, fileType: file.type, size: file.size, submittedAt: new Date().toISOString() } } : m
                ),
            }));
            showToast("Work sent to your teacher!", "success");
        } catch {
            showToast("We couldn't send that file. Check your connection and try again.", "error");
        } finally {
            setUploadingId(null);
            setSubFor(null);
            if (subRef.current) subRef.current.value = "";
        }
    }

    // ── Payment form
    const payFile = useRef<HTMLInputElement>(null);
    const [method, setMethod] = useState("");
    const [receipt, setReceipt] = useState("");
    const [ref, setRef] = useState("");
    const [amount, setAmount] = useState("");
    const [sending, setSending] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrDone, setOcrDone] = useState(false);

    async function runOCR(img: string) {
        setOcrLoading(true);
        setOcrDone(false);
        try {
            const Tesseract = (await import("tesseract.js")).default;
            const text = (await Tesseract.recognize(img, "eng")).data.text;
            const patterns = [
                /\b(ITO\d{12,20})\b/i,
                /\b([A-Z0-9]{4}\s+[A-Z0-9]{4}\s+[A-Z0-9]{4})\b/i,
                /\b(\d{13})\b/,
                /(?:ref\.?\s*no\.?|reference\s*(?:id|number)?|trace\s*id)\s*[:\-]?\s*([A-Z0-9]{8,20})\b/i,
                /\b(\d{10,20})\b/,
            ];
            for (const re of patterns) {
                const m = text.match(re);
                if (m?.[1]) { setRef(m[1].replace(/\s+/g, "")); break; }
            }
        } catch { /* OCR is a helper only */ }
        setOcrLoading(false);
        setOcrDone(true);
    }

    async function submitPayment() {
        if (!user) return;
        setSending(true);
        try {
            const res = await fetch("/api/parents/session-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: user.uid, paymentMethod: method, receiptBase64: receipt, referenceNumber: ref, amountPaid: Number(amount) || 450 }),
            });
            const data = await res.json();
            if (data.success) {
                p.setSessionPayments((prev) => [data.payment, ...prev]);
                showToast("Payment sent! We'll check it soon.", "success");
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showToast(data.error || "We couldn't send your payment. Please try again.", "error");
            }
        } catch {
            showToast("We couldn't reach the server. Check your connection and try again.", "error");
        }
        setSending(false);
    }

    // ── Profile form
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        nickname: childFavs?.nickname || "",
        dateOfBirth: childFavs?.dateOfBirth || "",
        gender: childFavs?.gender || "",
        favoriteSong: childFavs?.favoriteSong || "",
        favoriteColor: childFavs?.favoriteColor || "",
        favoriteCharacter: childFavs?.favoriteCharacter || "",
    });
    const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

    async function saveProfile() {
        if (!user) return;
        setSaving(true);
        try {
            const res = await fetch("/api/parents/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: user.uid,
                    childInfo: { ...form, healthProfile: childFavs?.healthProfile || "" },
                    emergencyContact: profile.studentInfo?.emergencyContact || profile.emergencyContact || { name: "", relationship: "", phone: "" },
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                showToast("Saved! Updating your page…", "success");
                setTimeout(() => window.location.reload(), 800);
                return;
            }
            showToast(data.error || "We couldn't save your changes. Please try again.", "error");
        } catch {
            showToast("We couldn't reach the server. Check your connection and try again.", "error");
        }
        setSaving(false);
    }

    // ── Tab panels ─────────────────────────────────────────────────────────────
    function VirtualPanel() {
        const setting = p.allRenewalPrograms?.find((x: any) => x.programKey === profile.program);
        const link = profile.virtualSessionLink || (setting?.virtualLinkOpen ? setting?.virtualLink : null);
        const pending = profile.sessionPayments?.find((x: any) => !x.verified && !x.rejected);
        const favs = [
            { k: "favoriteSong", label: "Favorite song", bg: "#fff6cf" },
            { k: "favoriteColor", label: "Favorite color", bg: "#dff1ff" },
            { k: "favoriteCharacter", label: "Favorite character", bg: "#ffe3ef" },
        ];
        return (
            <>
                <Card tape>
                    <Heading icon="monitor" title="Virtual class" sub="Join your online session from here." />
                    {profile.needsSessionPayment ? (
                        <Empty icon="card" title="Time for the next session" text={`Your last session has ended. Send ₱${due.toLocaleString()} to unlock the next one.`}
                            action={<button className="vp-btn" onClick={() => setTab("payments")}>Go to payments</button>} />
                    ) : link ? (
                        <Empty icon="play" title="Your class link is ready" text="Tap the button when it's time to join."
                            action={<a className="vp-btn" href={link} target="_blank" rel="noopener noreferrer">Join virtual class</a>} />
                    ) : pending ? (
                        <Empty icon="clock" title="We're checking your payment" text="Your class link will show up here as soon as we confirm it." />
                    ) : (
                        <Empty icon="monitor" title="No class link yet" text="Your teacher hasn't posted the link. Check back a little before class time." />
                    )}
                </Card>

                <Card>
                    <div className="vp-row-between">
                        <Heading icon="user" title={`${profile.childName || "Your child"}'s favorites`} sub="Teachers use these to make class feel special." />
                        <button className="vp-btn blue" onClick={p.onEditFavorites}>Edit favorites & photo</button>
                    </div>
                    <div className="vp-grid">
                        {favs.map((f) => (
                            <div key={f.k} className="vp-fav" style={{ background: f.bg }}>
                                <span className="vp-label">{f.label}</span>
                                <strong className="vp-fav-val">{childFavs?.[f.k] || <em style={{ fontWeight: 500, color: TEXT_2 }}>Not set yet</em>}</strong>
                            </div>
                        ))}
                    </div>
                </Card>
            </>
        );
    }

    function FolderPanel() {
        const mats: any[] = profile.studyMaterials || [];
        const links = mats.filter((m) => m.type === "link");
        const files = mats.filter((m) => m.type === "file");
        return (
            <Card tape>
                <Heading icon="folder" title="Study folder" sub="Open your files and videos, then send back finished work." />
                <input ref={subRef} type="file" hidden aria-label="Choose a file to submit" accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" onChange={(e) => handleSubmissionFile(e.target.files?.[0])} />
                {mats.length === 0 ? (
                    <Empty icon="folder" title="Nothing here yet" text="Your teacher will add files and videos to this folder." />
                ) : (
                    <>
                        <h3 className="vp-h3">Videos and links <span className="vp-count">{links.length}</span></h3>
                        {links.length === 0 && <p className="vp-sub">No videos yet.</p>}
                        <div className="vp-list">
                            {links.map((m) => (
                                <button key={m.id} className="vp-item" onClick={() => p.onOpenMaterial(m)}>
                                    <span className="vp-badge" style={{ background: "#ffd9d2" }}><Icon name="play" /></span>
                                    <span className="vp-item-text"><strong>{m.title}</strong><small>Opens in a new tab</small></span>
                                </button>
                            ))}
                        </div>

                        <h3 className="vp-h3" style={{ marginTop: 22 }}>Files <span className="vp-count">{files.length}</span></h3>
                        {files.length === 0 && <p className="vp-sub">No files yet.</p>}
                        <div className="vp-list">
                            {files.map((m) => {
                                const loading = p.loadingFileId === m.id;
                                const uploading = uploadingId === m.id;
                                return (
                                    <div key={m.id} className="vp-file">
                                        <button className="vp-item flat" onClick={() => p.onOpenMaterial(m)} disabled={!!p.loadingFileId}>
                                            <span className="vp-badge" style={{ background: "#dff1ff" }}><Icon name="file" /></span>
                                            <span className="vp-item-text"><strong>{m.title}</strong><small>{loading ? "Opening…" : "Tap to view"}</small></span>
                                        </button>
                                        <div className="vp-row-between" style={{ padding: "10px 14px" }}>
                                            <span className="vp-sub" style={{ margin: 0 }}>
                                                {m.submission ? `Sent: ${m.submission.fileName}` : "No work sent yet"}
                                            </span>
                                            <button className={m.submission ? "vp-btn blue small" : "vp-btn small"} disabled={uploading} onClick={() => { setSubFor(m.id); subRef.current?.click(); }}>
                                                {uploading ? "Sending…" : m.submission ? "Send again" : "Send my work"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </Card>
        );
    }

    function PaymentsPanel() {
        const methods = [
            { id: "gcash", label: "GCash", logo: "/gcash-logo.svg", qr: "/GCASHQRONLY.png" },
            { id: "bpi", label: "BPI", logo: "/bpi-logo.svg", qr: "/BPIQRONLY.png" },
            { id: "mari-bank", label: "Mari Bank", logo: "/maribank-logo.svg", qr: "/MARIBANKQRONLY.png" },
        ];
        const chosen = methods.find((m) => m.id === method);
        const ready = !!method && !!receipt && !!amount && !sending;
        return (
            <>
                <Card tape>
                    <Heading icon="card" title="Send a payment" sub="Pay with a QR code, then upload your receipt." />
                    <div className="vp-due">
                        <span className="vp-label" style={{ color: "#fff" }}>Amount due per session</span>
                        {profile.promoDiscount && (
                            <span className="vp-due-small">
                                <s>₱{profile.promoDiscount.originalPrice.toLocaleString()}</s> · {profile.promoCode} saves ₱{profile.promoDiscount.discountAmount.toLocaleString()}
                            </span>
                        )}
                        <strong className="vp-due-amt">₱{due.toLocaleString()}</strong>
                    </div>

                    <h3 className="vp-h3">1. Pick how you'll pay</h3>
                    <div className="vp-grid three" role="radiogroup" aria-label="Payment method">
                        {methods.map((m) => (
                            <button key={m.id} role="radio" aria-checked={method === m.id} className={`vp-method ${method === m.id ? "on" : ""}`} onClick={() => setMethod(m.id)}>
                                <span className="vp-logo"><Image src={m.logo} alt="" fill style={{ objectFit: "contain" }} /></span>
                                <strong>{m.label}</strong>
                            </button>
                        ))}
                    </div>
                    {chosen && (
                        <div className="vp-qr">
                            <div className="vp-qr-img"><Image src={chosen.qr} alt={`${chosen.label} QR code`} fill style={{ objectFit: "contain", padding: 12 }} /></div>
                            <p className="vp-sub" style={{ margin: 0 }}>Scan to send <strong>₱{due.toLocaleString()}</strong> (or more for several sessions), then upload the screenshot below.</p>
                        </div>
                    )}

                    <h3 className="vp-h3" style={{ marginTop: 22 }}>2. Upload your receipt</h3>
                    <input ref={payFile} type="file" accept="image/*" hidden aria-label="Choose a receipt image" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const r = new FileReader();
                        r.onload = () => { const s = r.result as string; setReceipt(s); setRef(""); runOCR(s); };
                        r.readAsDataURL(f);
                    }} />
                    {receipt ? (
                        <div style={{ textAlign: "center" }}>
                            <img src={receipt} alt="Your receipt preview" className="vp-receipt" />
                            {ocrLoading && <p className="vp-sub">Reading your receipt…</p>}
                            {ocrDone && !ocrLoading && !ref && <p className="vp-error" role="alert">We couldn't read the reference number. Please type it below.</p>}
                            <button className="vp-link" onClick={() => { setReceipt(""); setRef(""); setOcrDone(false); }}>Remove receipt</button>
                        </div>
                    ) : (
                        <button className="vp-drop" onClick={() => payFile.current?.click()}><Icon name="camera" size={32} /><strong>Upload receipt</strong></button>
                    )}

                    {receipt && (
                        <div style={{ marginTop: 18 }}>
                            <Field label="Reference number" id="vp-ref"><input id="vp-ref" className="vp-input plain" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 10000000000" /></Field>
                            <Field label="Amount sent (₱)" id="vp-amt"><input id="vp-amt" className="vp-input plain" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 450" /></Field>
                        </div>
                    )}

                    <button className="vp-btn wide" disabled={!ready} onClick={submitPayment}>
                        {sending ? <><span className="vp-spin" aria-hidden="true" />Sending…</> : "Send payment"}
                    </button>
                </Card>

                {(p.sessionPayments.length > 0 || p.paymentsLoading) && (
                    <Card>
                        <Heading icon="clock" title="Payment history" />
                        {p.paymentsLoading ? <p className="vp-sub">Loading your history…</p> : (
                            <div className="vp-list">
                                {p.sessionPayments.map((x: any, i: number) => {
                                    const state = x.verified ? "ok" : x.rejected ? "bad" : "wait";
                                    return (
                                        <div key={x.id || i} className={`vp-pay ${state}`}>
                                            <div>
                                                <strong>₱{(x.amountPaid || 450).toLocaleString()} via {String(x.paymentMethod || "").toUpperCase()}</strong>
                                                <small>{new Date(x.submittedAt).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}{x.referenceNumber ? ` · Ref ${x.referenceNumber}` : ""}</small>
                                                {x.adminNote && <small>Note: {x.adminNote}</small>}
                                            </div>
                                            <span className="vp-tag">{x.verified ? "Confirmed" : x.rejected ? "Needs a new receipt" : "Checking"}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                )}
            </>
        );
    }

    function WaiverPanel() {
        const date = profile.waiverSignedAt ? new Date(profile.waiverSignedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
        return (
            <Card tape>
                <Heading icon="shield" title="Waiver" sub="Signed and safely on file." />
                <div className="vp-grid">
                    {[["Signed by", profile.fullName], ["Child", profile.childName], ["Date signed", date], ["Photo consent", profile.photoConsent ? "Yes" : "No"]].map(([l, v]) => (
                        <div key={l} className="vp-fav" style={{ background: INPUT_BG }}><span className="vp-label">{l}</span><strong className="vp-fav-val">{v}</strong></div>
                    ))}
                </div>
                {profile.waiverSignature && (
                    <>
                        <h3 className="vp-h3" style={{ marginTop: 20 }}>Your signature</h3>
                        <div className="vp-sig"><img src={profile.waiverSignature} alt="Your signature" style={{ maxHeight: 90, display: "block" }} /></div>
                    </>
                )}
                <h3 className="vp-h3" style={{ marginTop: 20 }}>Your agreement</h3>
                <div className="vp-agree" tabIndex={0} aria-label="Agreement text, scrollable">{p.agreement}</div>
                <p className="vp-sub" style={{ marginTop: 14 }}>Questions? Email <a className="vp-a" href="mailto:merryexplorerscenter@gmail.com">merryexplorerscenter@gmail.com</a>.</p>
            </Card>
        );
    }

    function ProfilePanel() {
        return (
            <>
                <Card tape>
                    <div className="vp-row-between">
                        <Heading icon="user" title="Profile" sub="Keep your child's details up to date." />
                        {!editing ? (
                            <button className="vp-btn" onClick={() => setEditing(true)}>Edit profile</button>
                        ) : (
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button className="vp-btn ghost" onClick={() => setEditing(false)}>Cancel</button>
                                <button className="vp-btn" disabled={saving} onClick={saveProfile}>{saving ? <><span className="vp-spin" aria-hidden="true" />Saving…</> : "Save changes"}</button>
                            </div>
                        )}
                    </div>
                </Card>
                <Card>
                    <h3 className="vp-h3">About your child</h3>
                    <div className="vp-grid">
                        <Field label="Nickname" id="pf-nick"><input id="pf-nick" className="vp-input plain" disabled={!editing} value={form.nickname} onChange={setF("nickname")} /></Field>
                        <Field label="Date of birth" id="pf-dob"><input id="pf-dob" type="date" className="vp-input plain" disabled={!editing} value={form.dateOfBirth} onChange={setF("dateOfBirth")} /></Field>
                        <Field label="Gender" id="pf-gen">
                            <select id="pf-gen" className="vp-input plain" disabled={!editing} value={form.gender} onChange={setF("gender")}>
                                <option value="">Select…</option><option>Male</option><option>Female</option><option>Other</option>
                            </select>
                        </Field>
                    </div>
                    <h3 className="vp-h3" style={{ marginTop: 20 }}>Favorites</h3>
                    <div className="vp-grid">
                        <Field label="Favorite song" id="pf-song"><input id="pf-song" className="vp-input plain" disabled={!editing} value={form.favoriteSong} onChange={setF("favoriteSong")} placeholder="e.g. Baby Shark" /></Field>
                        <Field label="Favorite color" id="pf-color"><input id="pf-color" className="vp-input plain" disabled={!editing} value={form.favoriteColor} onChange={setF("favoriteColor")} placeholder="e.g. Blue" /></Field>
                        <Field label="Favorite character or show" id="pf-char"><input id="pf-char" className="vp-input plain" disabled={!editing} value={form.favoriteCharacter} onChange={setF("favoriteCharacter")} placeholder="e.g. Peppa Pig" /></Field>
                    </div>
                </Card>
            </>
        );
    }

    const panels: Record<Tab, () => ReactNode> = { virtual: VirtualPanel, folder: FolderPanel, payments: PaymentsPanel, waiver: WaiverPanel, profile: ProfilePanel };

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
                    <span className="vp-logo-badge"><Image src="/LOGO-noBG.png" alt="Merry Explorers" fill style={{ objectFit: "contain", padding: 6 }} /></span>
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
                                <span className="vp-tag" style={{ background: "#dff1ff" }}>{profile.program}</span>
                                {profile.classTime && <span className="vp-tag" style={{ background: "#d8f5dc" }}>{profile.classTime}</span>}
                                <span className="vp-tag" style={{ background: profile.status === "active" ? "#d8f5dc" : "#e6eaf2" }}>{profile.status === "active" ? "Active" : "Inactive"}</span>
                            </div>
                        </div>
                        <div className="vp-stat"><strong>{profile.virtualSessionsCompleted || 0}</strong><span>sessions done</span></div>
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const CSS = `
.vp-root{min-height:100vh;position:relative;overflow-x:hidden;color:${NAVY};font-weight:500;
  background:radial-gradient(ellipse at 50% 0%,#b9e5fb 0%,#8fd3f7 55%,#74c3f1 100%);background-attachment:fixed}
.vp-root *{box-sizing:border-box}
.vp-main{position:relative;z-index:1;width:100%;max-width:1100px;margin:0 auto;padding:28px 20px 150px;display:flex;flex-direction:column;gap:40px}
.vp-sub{margin:4px 0 0;font-size:14px;color:${TEXT_2};font-weight:500;line-height:1.5}
.vp-h2{margin:0;font-size:22px;font-weight:700;color:${NAVY}}
.vp-h3{margin:0 0 12px;font-size:17px;font-weight:700;color:${NAVY};display:flex;align-items:center;gap:8px}
.vp-label{font-size:15px;font-weight:600;color:${NAVY}}
.vp-a{color:${BLUE};font-weight:600}
.vp-title{margin:0;font-size:40px;font-weight:700;line-height:1.1;color:${BLUE};-webkit-text-stroke:7px ${NAVY};paint-order:stroke fill;text-shadow:0 4px 0 ${NAVY};filter:drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff)}

/* scene */
.vp-sticker{filter:drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff)}
.vp-scene{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.vp-sun{position:absolute;top:8px;right:16px;width:150px;animation:vp-bob 5s ease-in-out infinite}
.vp-rays{transform-origin:70px 70px;animation:vp-rot 40s linear infinite}
.vp-rainbow{position:absolute;top:14px;left:10px;width:190px;animation:vp-bob 5s ease-in-out infinite;animation-delay:-2s}
.vp-cloud{position:absolute;left:0;width:130px;animation:vp-drift linear infinite;will-change:transform}
.vp-cloud.c1{top:18%;animation-duration:70s}.vp-cloud.c2{top:46%;width:100px;animation-duration:90s;animation-delay:-40s}.vp-cloud.c3{top:72%;width:150px;animation-duration:58s;animation-delay:-20s}
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
.vp-grid.three{grid-template-columns:repeat(auto-fit,minmax(130px,1fr))}
.vp-empty{text-align:center;padding:24px 12px;border:3px dashed ${INPUT_BORDER};border-radius:20px;background:${INPUT_BG}}
.vp-empty .vp-h3{justify-content:center}
.vp-count{font-size:13px;font-weight:600;background:${INPUT_BG};border:2px solid ${INPUT_BORDER};border-radius:20px;padding:0 10px}

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
.vp-spin{width:18px;height:18px;border:3px solid rgba(11,42,130,.25);border-top-color:${NAVY};border-radius:50%;animation:vp-spin .7s linear infinite}
.vp-link{margin-top:8px;background:none;border:none;font:inherit;font-weight:600;color:${ERROR};cursor:pointer;min-height:44px;text-decoration:underline}

/* inputs */
.vp-field{margin-bottom:14px}.vp-field .vp-label{display:block;margin-bottom:6px}
.vp-input{width:100%;font:inherit;font-size:16px;font-weight:500;color:${NAVY};padding:13px 14px;background:${INPUT_BG};border:3px solid ${INPUT_BORDER};border-radius:16px;min-height:48px}
.vp-input::placeholder{color:#8aa7cc}
.vp-input:disabled{opacity:.75}
.vp-input:focus{outline:none;border-color:${BLUE};background:#fff;box-shadow:0 0 0 4px rgba(255,210,63,.6)}
.vp-error{margin:12px 0;padding:10px 14px;border:3px solid #ff6b57;background:#fff1ee;color:${ERROR};border-radius:16px;font-weight:600;font-size:14px}
.vp-root button:focus-visible,.vp-root a:focus-visible,.vp-agree:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(255,210,63,.9),0 0 0 7px ${NAVY}}

/* lists & items */
.vp-list{display:grid;gap:12px}
.vp-item{display:flex;align-items:center;gap:14px;width:100%;min-height:64px;padding:12px 14px;text-align:left;font:inherit;color:${NAVY};cursor:pointer;background:#fff6cf;border:3px solid ${NAVY};border-radius:18px;box-shadow:0 4px 0 rgba(11,42,130,.25)}
.vp-item.flat{background:transparent;border:none;box-shadow:none;border-radius:0}
.vp-item:hover:not(:disabled){background:#fff0b3}
.vp-item-text{display:flex;flex-direction:column;min-width:0}.vp-item-text strong{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vp-item-text small,.vp-pay small{color:${TEXT_2};font-size:13px;display:block;margin-top:2px}
.vp-file{background:${INPUT_BG};border:3px solid ${NAVY};border-radius:18px;overflow:hidden}
.vp-file .vp-row-between{border-top:3px dashed ${INPUT_BORDER}}
.vp-fav{border:3px solid ${NAVY};border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:4px}
.vp-fav:nth-child(odd){transform:rotate(-1deg)}.vp-fav:nth-child(even){transform:rotate(1deg)}
.vp-fav-val{font-size:16px;font-weight:700;overflow-wrap:anywhere}
.vp-sig{display:inline-block;background:${INPUT_BG};border:3px solid ${INPUT_BORDER};border-radius:16px;padding:12px}
.vp-agree{border:3px solid ${INPUT_BORDER};border-radius:18px;padding:18px 20px;max-height:380px;overflow-y:auto;font-size:14px;line-height:1.7;color:#27407f;background:#fff}

/* payments */
.vp-due{background:linear-gradient(135deg,${BLUE},#2f8bf0);border:3px solid ${NAVY};border-radius:20px;padding:18px 20px;margin-bottom:22px;color:#fff;box-shadow:0 6px 0 ${NAVY};display:flex;flex-direction:column;gap:2px}
.vp-due-small{font-size:13px;opacity:.9}.vp-due-amt{font-size:42px;line-height:1.1}
.vp-method{display:flex;flex-direction:column;align-items:center;gap:8px;min-height:44px;padding:14px 8px;font:inherit;color:${NAVY};cursor:pointer;background:#fff;border:3px solid ${INPUT_BORDER};border-radius:18px}
.vp-method.on{border-color:${NAVY};background:#fff6cf;box-shadow:0 5px 0 ${NAVY}}
.vp-logo{position:relative;width:90px;height:30px}
.vp-qr{margin-top:16px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding:16px;border:3px dashed ${INPUT_BORDER};border-radius:20px;background:${INPUT_BG}}
.vp-qr-img{position:relative;width:200px;height:200px;background:#fff;border:3px solid ${NAVY};border-radius:20px}
.vp-drop{display:flex;flex-direction:column;align-items:center;gap:8px;width:100%;padding:34px 16px;font:inherit;color:${NAVY};cursor:pointer;background:${INPUT_BG};border:3px dashed ${BLUE};border-radius:20px}
.vp-receipt{max-width:100%;max-height:260px;object-fit:contain;border:3px solid ${NAVY};border-radius:16px}
.vp-pay{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 16px;border:3px solid ${NAVY};border-radius:18px;background:#fff6cf}
.vp-pay.ok{background:#d8f5dc}.vp-pay.bad{background:#fff1ee;border-color:#ff6b57}.vp-pay .vp-tag{background:#fff}

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
  .vp-btn,.vp-tab{transition:none}
}
`;