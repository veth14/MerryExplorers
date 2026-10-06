"use client";

import { useRef, useState } from "react";
import { uploadAvatar } from "@/lib/supabase";
import { ExplorerBackdrop, MerryStyles, merryFont, M } from "./MerryUI";

// Loosely typed so this file doesn't depend on the ParentProfile type in the dashboard page.
// If you export ParentProfile from the page (or a types file), replace `any` with it.
type Profile = any;

const SONGS = [
    { label: "Baby Shark 🦈", val: "Baby Shark" },
    { label: "Wheels on the Bus 🚌", val: "Wheels on the Bus" },
    { label: "Twinkle Twinkle ⭐", val: "Twinkle Twinkle Little Star" },
    { label: "Let It Go ❄️", val: "Let It Go (Frozen)" },
    { label: "Old McDonald 🚜", val: "Old McDonald" },
];

const COLORS = [
    { label: "Blue", bg: "#2f8bf0", fg: "#fff" },
    { label: "Pink", bg: "#ff6fb1", fg: "#fff" },
    { label: "Yellow", bg: "#ffd23f", fg: M.navy },
    { label: "Green", bg: "#3fbf5a", fg: "#fff" },
    { label: "Purple", bg: "#8b5cf6", fg: "#fff" },
    { label: "Red", bg: "#ef4444", fg: "#fff" },
    { label: "Orange", bg: "#ff8a1f", fg: M.navy },
    { label: "Rainbow 🌈", bg: "linear-gradient(135deg,#ef4444,#ffd23f,#4cc35b,#2f8bf0,#8b5cf6)", fg: "#fff" },
];

const CHARACTERS = [
    { label: "Paw Patrol 🐾", val: "Paw Patrol" },
    { label: "Peppa Pig 🐷", val: "Peppa Pig" },
    { label: "Bluey 🐶", val: "Bluey" },
    { label: "Cocomelon 🍉", val: "Cocomelon" },
    { label: "Elsa / Frozen ❄️", val: "Elsa (Frozen)" },
    { label: "Spiderman 🕷️", val: "Spiderman" },
];

const STEP_TITLES = ["Add a photo", "Favorite song", "Favorite color", "Favorite character or show"];

export default function VirtualOnboardingModal({
    profile,
    isGateMode = false,
    onClose,
    onSave,
    showToast,
}: {
    profile: Profile;
    isGateMode?: boolean;
    onClose?: () => void;
    onSave: (updatedData: Partial<Profile>) => void;
    showToast: (msg: string, type?: "success" | "error" | "info") => void;
}) {
    const favs = profile.studentInfo?.childInfo || profile.childInfo;
    const [step, setStep] = useState(1);
    const totalSteps = 4;
    const [song, setSong] = useState(favs?.favoriteSong || "");
    const [color, setColor] = useState(favs?.favoriteColor || "");
    const [character, setCharacter] = useState(favs?.favoriteCharacter || "");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>(profile.avatarUrl || favs?.avatarUrl || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    function onPick(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.type.startsWith("image/")) {
            setError("Please choose a photo file (PNG or JPG).");
            return;
        }
        setError("");
        setFile(f);
        setPreview(URL.createObjectURL(f));
    }

    async function handleSubmit() {
        setSaving(true);
        setError("");
        try {
            let avatarUrl = profile.avatarUrl || "";
            if (file) {
                try {
                    avatarUrl = await uploadAvatar(file, profile.id);
                } catch (err) {
                    console.error("Avatar upload failed:", err);
                }
            }

            const childInfo = {
                favoriteSong: song.trim(),
                favoriteColor: color.trim(),
                favoriteCharacter: character.trim(),
                ...(avatarUrl ? { avatarUrl } : {}),
            };

            const res = await fetch("/api/parents/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: profile.id, avatarUrl, childInfo, hasCompletedVirtualSurvey: true }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to save profile");
            }

            onSave({
                avatarUrl,
                hasCompletedVirtualSurvey: true,
                childInfo: { ...(profile.childInfo || {}), ...childInfo },
                studentInfo: profile.studentInfo
                    ? { ...profile.studentInfo, childInfo: { ...(profile.studentInfo.childInfo || {}), ...childInfo } }
                    : null,
            });
            showToast("Saved! Thank you, we can't wait to meet your explorer. 🌟", "success");
            onClose?.();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "We couldn't save these details. Check your connection and try again.");
        } finally {
            setSaving(false);
        }
    }

    const childName = profile.childName || "your little explorer";

    const card = (
        <div className="me-card me-step" style={{ width: "100%", maxWidth: 560, padding: "44px 28px 28px", margin: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="me-tape" aria-hidden="true" />

            {!isGateMode && onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    style={{ position: "absolute", top: 14, right: 14, width: 40, height: 40, borderRadius: "50%", border: `3px solid ${M.navy}`, background: "#fff", color: M.navy, fontSize: 16, fontWeight: 700, cursor: "pointer" }}
                >
                    ✕
                </button>
            )}

            <h2 className="me-title" style={{ fontSize: 32, marginBottom: 10 }}>Tell us about {childName}</h2>
            <p style={{ margin: "0 auto 22px", maxWidth: 440, textAlign: "center", fontSize: 15, fontWeight: 500, color: "#3d5a99", lineHeight: 1.5 }}>
                Teachers use these to make every virtual session fun for your child.
            </p>

            {/* Progress */}
            <div role="progressbar" aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={step} aria-label={`Step ${step} of ${totalSteps}`} style={{ display: "flex", gap: 8, marginBottom: 22 }}>
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} style={{ flex: 1, height: 12, borderRadius: 8, border: `2px solid ${M.navy}`, background: s <= step ? M.sun : "#e6f3fc", transition: "background .3s" }} />
                ))}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (step < totalSteps) setStep(step + 1);
                    else handleSubmit();
                }}
                style={{ display: "grid", gap: 18 }}
            >
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: M.navy }}>
                    Step {step} of {totalSteps}: {STEP_TITLES[step - 1]}
                </h3>

                {/* Step 1: photo */}
                {step === 1 && (
                    <div key="s1" className="me-step" style={{ display: "grid", justifyItems: "center", gap: 12, padding: 20, background: "#f2faff", border: "3px dashed #b6dcf5", borderRadius: 20 }}>
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            aria-label={preview ? "Change photo" : "Upload photo"}
                            style={{ position: "relative", width: 124, height: 124, borderRadius: "50%", border: `4px solid ${M.navy}`, boxShadow: `0 0 0 5px #fff, 0 7px 0 5px ${M.navy}2e`, background: preview ? "#fff" : "#dff1fd", overflow: "hidden", cursor: "pointer", padding: 0, fontSize: 48 }}
                        >
                            {preview ? <img src={preview} alt="Your child's photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👶"}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
                        <button type="button" className="me-link" onClick={() => fileRef.current?.click()}>
                            {preview ? "Change photo" : "Upload a photo"}
                        </button>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#5b74a8" }}>You can skip this and add one later.</p>
                    </div>
                )}

                {/* Step 2: song */}
                {step === 2 && (
                    <div key="s2" className="me-step" style={{ display: "grid", gap: 12 }}>
                        <input className="me-input" value={song} onChange={(e) => setSong(e.target.value)} placeholder="e.g. Baby Shark, Wheels on the Bus" aria-label="Favorite song" autoFocus />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            {SONGS.map((p) => (
                                <button type="button" key={p.val} className="me-pill" aria-pressed={song === p.val} onClick={() => setSong(p.val)}>{p.label}</button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 3: color */}
                {step === 3 && (
                    <div key="s3" className="me-step" style={{ display: "grid", gap: 12 }}>
                        <input className="me-input" value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Blue, Pink, Yellow" aria-label="Favorite color" autoFocus />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            {COLORS.map((c) => {
                                const on = color.toLowerCase() === c.label.toLowerCase();
                                return (
                                    <button
                                        type="button"
                                        key={c.label}
                                        className="me-pill"
                                        aria-pressed={on}
                                        onClick={() => setColor(c.label)}
                                        style={{ background: c.bg, color: c.fg, borderColor: M.navy, boxShadow: on ? `0 4px 0 ${M.navy}` : "none", transform: on ? "translateY(-2px)" : undefined }}
                                    >
                                        {on ? "✓ " : ""}{c.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Step 4: character */}
                {step === 4 && (
                    <div key="s4" className="me-step" style={{ display: "grid", gap: 12 }}>
                        <input className="me-input" value={character} onChange={(e) => setCharacter(e.target.value)} placeholder="e.g. Paw Patrol, Peppa Pig" aria-label="Favorite character or show" autoFocus />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            {CHARACTERS.map((p) => (
                                <button type="button" key={p.val} className="me-pill" aria-pressed={character === p.val} onClick={() => setCharacter(p.val)}>{p.label}</button>
                            ))}
                        </div>
                    </div>
                )}

                {error && <div role="alert" className="me-error">{error}</div>}

                {/* Actions */}
                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                    {step > 1 && (
                        <button type="button" className="me-btn me-btn-ghost" style={{ flex: 1 }} onClick={() => setStep(step - 1)}>Back</button>
                    )}
                    <button type="submit" className="me-btn" style={{ flex: 2 }} disabled={saving}>
                        {saving ? "Saving…" : step < totalSteps ? "Next step" : "All done"}
                    </button>
                </div>

                {isGateMode && (
                    <div style={{ textAlign: "center" }}>
                        <button
                            type="button"
                            className="me-link"
                            onClick={() => {
                                onSave({ hasCompletedVirtualSurvey: true });
                                onClose?.();
                            }}
                        >
                            Skip for now, I&apos;ll fill this in from my profile
                        </button>
                    </div>
                )}
            </form>
        </div>
    );

    // Gate mode: full-page scene, same look as the login page
    if (isGateMode) {
        return (
            <main className={`${merryFont.className} me-page`} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "56px 16px 120px" }}>
                <MerryStyles />
                <ExplorerBackdrop variant="full" />
                <div className="me-layer" style={{ width: "100%", display: "flex" }}>{card}</div>
            </main>
        );
    }

    // Edit mode: sky overlay above the dashboard
    return (
        <div
            className={merryFont.className}
            role="dialog"
            aria-modal="true"
            onClick={onClose}
            style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(11,42,130,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "36px 16px", overflowY: "auto" }}
        >
            <MerryStyles />
            {card}
        </div>
    );
}