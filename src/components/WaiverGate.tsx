"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ExplorerBackdrop, MerryStyles, merryFont, M } from "./MerryUI";

// Loosely typed so this file doesn't depend on the ParentProfile type in the dashboard page.
type Profile = any;

export default function WaiverGate({
    profile,
    onComplete,
}: {
    profile: Profile;
    onComplete: (sig: string, photoConsent: boolean) => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasScrolled, setHasScrolled] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [photoConsent, setPhotoConsent] = useState(true);

    // Map pointer position to canvas pixels (the canvas is 800px wide but displayed smaller on phones)
    function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const p = "touches" in e ? e.touches[0] : e;
        return {
            x: ((p.clientX - rect.left) * canvas.width) / rect.width,
            y: ((p.clientY - rect.top) * canvas.height) / rect.height,
        };
    }

    function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
        if (!hasScrolled) return;
        e.preventDefault();
        const ctx = canvasRef.current!.getContext("2d")!;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
    }

    function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
        e.preventDefault();
        if (!isDrawing) return;
        const ctx = canvasRef.current!.getContext("2d")!;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.strokeStyle = M.navy;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        setHasSigned(true);
    }

    function stopDraw() {
        setIsDrawing(false);
    }

    function clearCanvas() {
        const canvas = canvasRef.current!;
        canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
        setHasSigned(false);
    }

    function handleScroll() {
        const el = scrollRef.current;
        if (!el) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setHasScrolled(true);
    }

    async function handleSubmit() {
        if (!hasSigned) {
            setError("Please sign the agreement before continuing.");
            return;
        }
        const sig = canvasRef.current!.toDataURL("image/png");
        setSaving(true);
        setError("");
        try {
            const res = await fetch("/api/parents/waiver", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: profile.id, signature: sig, photoConsent }),
            });
            if (!res.ok) throw new Error("We couldn't save your signature. Check your connection and try again.");
            onComplete(sig, photoConsent);
        } catch (e: any) {
            setError(e.message || "Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    const firstName = (profile.fullName || "").split(" ")[0];
    const ready = hasScrolled && hasSigned;

    return (
        <main className={`${merryFont.className} me-page`} style={{ padding: "40px 16px 140px" }}>
            <MerryStyles />
            <style>{`
        .wv-wrap { max-width: 860px; margin: 0 auto; display: grid; gap: 28px; }
        .wv-logo { position: relative; width: 96px; height: 96px; margin: 0 auto -40px; border-radius: 50%; background: #fff;
          border: 4px solid ${M.navy}; overflow: hidden; z-index: 2; box-shadow: 0 6px 0 ${M.navy}33; }
        .wv-text { padding: 22px 24px; font-size: 15px; line-height: 1.7; color: #2b4278; height: 420px; overflow-y: auto; }
        .wv-text:focus-visible { outline: 4px solid ${M.blue}; outline-offset: -4px; }
        .wv-text h3 { margin: 22px 0 6px; font-size: 14px; font-weight: 700; color: ${M.blue}; }
        .wv-text p { margin: 0 0 10px; }
        .wv-text ul { margin: 0 0 10px; padding-left: 20px; }
        .wv-text li { margin-bottom: 6px; }
        .wv-chip { font-size: 13px; font-weight: 600; padding: 5px 14px; border-radius: 999px; border: 3px solid ${M.navy}; white-space: nowrap; }
        .wv-sign { border: 3px dashed #b6dcf5; border-radius: 18px; background: #f2faff; overflow: hidden; transition: border-color .2s; }
        .wv-sign[data-signed="true"] { border: 3px solid ${M.navy}; background: #fff; }
        .wv-canvas { display: block; width: 100%; height: 180px; touch-action: none; cursor: crosshair; }
        .wv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 16px; background: #f2faff; border: 3px solid #b6dcf5; border-radius: 16px; }
        .wv-consent { display: flex; gap: 12px; align-items: flex-start; padding: 16px; background: #fff8d6; border: 3px solid ${M.sun}; border-radius: 16px; cursor: pointer; }
        .wv-consent input { width: 22px; height: 22px; margin-top: 2px; accent-color: ${M.blue}; flex-shrink: 0; }
        @media (max-width: 640px) {
          .wv-grid { grid-template-columns: 1fr; gap: 12px; }
          .wv-text { height: 360px; padding: 18px; }
        }
      `}</style>
            <ExplorerBackdrop variant="calm" />

            <div className="me-layer wv-wrap">
                {/* Welcome */}
                <div>
                    <div className="wv-logo">
                        <Image src="/LOGO-noBG.png" alt="Merry Explorers" fill style={{ objectFit: "contain", padding: 6 }} />
                    </div>
                    <div className="me-card" style={{ padding: "58px 28px 26px", textAlign: "center" }}>
                        <div className="me-tape" aria-hidden="true" />
                        <h1 className="me-title" style={{ fontSize: 36, marginBottom: 10 }}>Welcome, {firstName}!</h1>
                        <p style={{ margin: "0 auto", maxWidth: 560, fontSize: 16, fontWeight: 500, color: "#3d5a99", lineHeight: 1.6 }}>
                            Before you enter the Parent Portal, please read the Merry Explorers Parent/Guardian Acknowledgment &amp; Agreement. Scroll to the bottom, then sign to confirm.
                        </p>
                    </div>
                </div>

                {/* Agreement text */}
                <section className="me-card" style={{ overflow: "hidden" }} aria-labelledby="wv-agreement-title">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "16px 24px", background: "#f2faff", borderBottom: `3px solid ${M.navy}` }}>
                        <h2 id="wv-agreement-title" style={{ margin: 0, fontSize: 18, fontWeight: 600, color: M.navy }}>Parent/Guardian Acknowledgment &amp; Agreement</h2>
                        <span
                            className="wv-chip"
                            role="status"
                            style={hasScrolled ? { background: "#d9f7df", color: "#14632b" } : { background: "#fff3b0", color: M.navy }}
                        >
                            {hasScrolled ? "✓ You've read it all" : "Scroll down to read it all"}
                        </span>
                    </div>

                    <div ref={scrollRef} onScroll={handleScroll} className="wv-text" tabIndex={0} role="region" aria-label="Agreement text, scroll to read">
                        <p style={{ fontWeight: 700, color: M.navy, fontSize: 16, marginBottom: 12 }}>
                            MERRY EXPLORERS PLAYGROUP LEARNING CENTER<br />PARENT/GUARDIAN ACKNOWLEDGMENT &amp; AGREEMENT
                        </p>
                        <p>By registering my child with Merry Explorers Playgroup Learning Center, I confirm that I have read, understood, and agree to the following program terms and policies:</p>

                        <h3>1. ADVENTURE / CYCLE</h3>
                        <p>For Merry Explorers, &quot;Adventure&quot; means &quot;Cycle.&quot; Adventure 1, Adventure 2, Adventure 3, and so on refer to the succeeding stages of the program. An Adventure is not tied to a calendar month. A child progresses to the next Adventure once the required sessions for their program have been completed, including applicable make-up sessions. Adventure dates may therefore differ between programs.</p>

                        <h3>2. PROGRAMS</h3>
                        <p style={{ fontWeight: 700, marginBottom: 4 }}>Discovery Club — Discover Through Play</p>
                        <ul>
                            <li>🔎 <strong>Discovery Club: Curious Explorer:</strong> Ages 1.5–4.11 | ₱4,295 (Pioneer Family); ₱4,395 (New Family) | 8 sessions | 1 hr/session</li>
                            <li>🎨 <strong>Discovery Club: Creative Explorer:</strong> Ages 2.6–4.11 | ₱4,820 (Pioneer Family); ₱4,985 (New Family) | 12 sessions | 1 hr 15 mins/session</li>
                            <li>🌈 <strong>Discovery Club: Everyday Curious:</strong> Ages 1.5–4.11 | ₱7,518 | 15 sessions | 1 hr/session</li>
                        </ul>
                        <p>Discovery Club provides a play-based environment that encourages socialization, interaction, shared play, and confidence-building. It may also be a suitable starting point for children who are not yet using verbal communication.</p>
                        <p style={{ fontWeight: 700 }}>💡 Trailblazer: Brave Explorer — Prepare for What&apos;s Next</p>
                        <ul>
                            <li>Ages 3–4.11 | ₱6,900 | 18 sessions | 1 hr 15 mins/face-to-face session/shift to online</li>
                        </ul>
                        <p><strong>Milestone Checkpoint:</strong> The 18th session includes the Exploration Diary presentation, review of the child&apos;s learning and discoveries, and milestone recognition through a Certificate of Recognition/Completion.</p>
                        <p style={{ fontWeight: 700 }}>Little Trailblazer Prerequisites:</p>
                        <p>The child should be able to comfortably grip age-appropriate materials, participate independently with teachers, and sit still independently for at least 3 minutes.</p>

                        <h3>3. REGISTRATION, PAYMENTS &amp; PENALTIES</h3>
                        <p>Upon registration, 60% of the total program fee is required as a non-refundable reservation fee. The remaining 40% balance is due on or before the 6th session. An interest of 4% per week will be applied to overdue balances starting the week after the due date. Merry Explorers accepts the following payment methods: Cash, GCash, BDO Bank Transfer, and Credit/Debit Card (via GCash QR). Official receipts or proof of payment must be submitted upon payment.</p>

                        <h3>4. ATTENDANCE, ABSENCES &amp; MAKE-UP SESSIONS</h3>
                        <p>Each program has a set number of sessions. Attending all sessions within your program is encouraged to maximize your child&apos;s learning. Make-up sessions may be arranged for absences, subject to teacher and slot availability. Make-up sessions must be completed within the current Adventure. Unused make-up sessions do not carry over to the next Adventure. Habitual absences without notice may result in forfeiture of make-up privileges. Merry Explorers reserves the right to reschedule or cancel classes due to unforeseen circumstances (e.g., typhoons, public holidays, or force majeure events). In such cases, a make-up session will be scheduled at no additional charge.</p>

                        <h3>5. PHOTO &amp; VIDEO HIGHLIGHTS</h3>
                        <p>Photos and videos taken during sessions are for documentation and sharing within the Merry Explorers community. These are shared via a private portal or class group. Files will be automatically deleted 30 days after sharing. Merry Explorers is not responsible for files once downloaded and shared externally by parents or guardians. If you do not wish your child to be photographed or filmed, please inform us in writing before the first session.</p>

                        <h3>6. UNIFORM POLICY</h3>
                        <p>We would also like to clarify an important part of our uniform policy. <strong>The Merry Explorers uniform is the SAME uniform.</strong></p>
                        <p>If your child already has a Merry Explorers uniform from the previous chapter, you are NOT required to purchase a new set for Adventure 1. We want families to be able to continue using the uniform they already have.</p>
                        <p><strong>Uniform Days:</strong> Wednesday &amp; Friday. On all other class days, children may wear anything comfortable, safe, and appropriate for active play and learning.</p>
                        <p><strong>Welcome Kit — ₱750</strong><br />For families who need a new set or an additional set, the Uniform Kit is available for ₱750 and includes: 1 Merry Explorers polo shirt with logo, 1 pair of jogging pants, 1 name tag with Merry Explorers lanyard.</p>
                        <p><strong>Lanyard &amp; Name Tag — ₱200</strong><br />A Merry Explorers lanyard with laminated name tag may also be purchased separately for ₱200.</p>
                        <p>If you just need the uniform, you may still purchase the polo and jogging pants with the Merry Explorers logo priced at ₱550/set.</p>

                        <div style={{ background: "#f2faff", border: `3px solid #b6dcf5`, borderRadius: 16, padding: 18, marginTop: 20 }}>
                            <p style={{ fontWeight: 700, color: M.navy, marginBottom: 8 }}>PARENT/GUARDIAN ACKNOWLEDGMENT</p>
                            <p>I, the undersigned Parent/Guardian, confirm that I have read, understood, and voluntarily agree to all terms and policies stated in this Agreement, including those covering program requirements, payments, attendance and make-ups, photos and videos, and uniforms.</p>
                            <p>I confirm that the information I provided about my child is true and complete, and I agree to comply with Merry Explorers&apos; policies and arrangements.</p>
                            <p style={{ marginBottom: 0 }}>By signing below, I voluntarily acknowledge, accept, and agree to be bound by these terms and policies as part of my child&apos;s registration with Merry Explorers Playgroup Learning Center.</p>
                        </div>
                    </div>
                </section>

                {/* Signature: unlocks after reading */}
                <section
                    className="me-card"
                    style={{ padding: "28px 28px 26px", opacity: hasScrolled ? 1 : 0.55, transition: "opacity .4s" }}
                    aria-disabled={!hasScrolled}
                    aria-labelledby="wv-sign-title"
                >
                    <div className="me-tape" aria-hidden="true" />

                    <label className="wv-consent" htmlFor="photoConsent" style={{ marginBottom: 24 }}>
                        <input id="photoConsent" type="checkbox" checked={photoConsent} onChange={(e) => setPhotoConsent(e.target.checked)} disabled={!hasScrolled} />
                        <span style={{ fontSize: 15, color: "#2b4278", lineHeight: 1.55, fontWeight: 500 }}>
                            <strong>I give permission</strong> for my child to be photographed and filmed during Merry Explorers sessions, and for these photos and videos to be shared within the private Merry Explorers community to highlight learning moments.
                        </span>
                    </label>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                        <div>
                            <h2 id="wv-sign-title" style={{ margin: 0, fontSize: 20, fontWeight: 600, color: M.navy }}>Your signature</h2>
                            <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 500, color: "#5b74a8" }}>
                                {hasScrolled ? "Sign in the box with your finger or mouse." : "Finish reading the agreement to unlock this box."}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="me-btn me-btn-ghost"
                            style={{ width: "auto", padding: "8px 20px", fontSize: 15, borderRadius: 14, boxShadow: `0 4px 0 ${M.navy}55` }}
                            onClick={clearCanvas}
                            disabled={!hasScrolled || !hasSigned}
                        >
                            Clear
                        </button>
                    </div>

                    <div className="wv-sign" data-signed={hasSigned}>
                        <canvas
                            ref={canvasRef}
                            width={800}
                            height={180}
                            className="wv-canvas"
                            aria-label="Signature box"
                            onMouseDown={startDraw}
                            onMouseMove={draw}
                            onMouseUp={stopDraw}
                            onMouseLeave={stopDraw}
                            onTouchStart={startDraw}
                            onTouchMove={draw}
                            onTouchEnd={stopDraw}
                        />
                    </div>

                    <div className="wv-grid" style={{ marginTop: 20 }}>
                        {[
                            { label: "Name", value: profile.fullName },
                            { label: "Child", value: profile.childName },
                            { label: "Date", value: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: "#5b74a8", marginBottom: 2 }}>{label}</div>
                                <div style={{ fontSize: 16, fontWeight: 600, color: M.navy }}>{value}</div>
                            </div>
                        ))}
                    </div>

                    {error && <div role="alert" className="me-error" style={{ marginTop: 16 }}>{error}</div>}

                    <button type="button" className="me-btn" style={{ marginTop: 22 }} onClick={handleSubmit} disabled={!ready || saving}>
                        {saving
                            ? "Saving…"
                            : !hasScrolled
                                ? "Read the whole agreement first"
                                : !hasSigned
                                    ? "Sign above to continue"
                                    : "I agree, enter the Parent Portal"}
                    </button>
                </section>
            </div>
        </main>
    );
}