"use client";

import { useState } from "react";

const TABS = [
    { key: "registration_preview", label: "📝 Registration Confirmation (All Programs)" },
    { key: "promo_code", label: "📨 Promo Code Email" },
    { key: "payment_reminder", label: "⏰ Renewal Payment Reminder" },
    { key: "slot_released", label: "🔴 Slot Released Email" },
];

type ProgramOption = {
    id: string;
    name: string;
    short: string;
    icon: string;
    isAdv: boolean;
    advNum?: number;
    classes: { name: string; time: string }[];
    schedule: string;
    startDate: string;
    badgeColor: string;
    themeBg: string;
    disclaimerType: "adventure" | "ballet" | "virtual" | "playdate";
};

const PROGRAMS: ProgramOption[] = [
    {
        id: "curious-explorer",
        name: "Discovery Club: Curious Explorer",
        short: "Curious Explorer",
        icon: "🔎",
        isAdv: true,
        advNum: 2,
        classes: [
            { name: "Morning Session", time: "9:45 AM – 11:00 AM" },
            { name: "Afternoon Session", time: "1:30 PM – 2:45 PM" },
        ],
        schedule: "Monday & Wednesday",
        startDate: "Monday, October 26, 2026",
        badgeColor: "#b45309",
        themeBg: "#fffbeb",
        disclaimerType: "adventure",
    },
    {
        id: "creative-explorer",
        name: "Discovery Club: Creative Explorer",
        short: "Creative Explorer",
        icon: "🎨",
        isAdv: true,
        advNum: 2,
        classes: [
            { name: "Morning Session", time: "9:45 AM – 11:00 AM" },
            { name: "Mid-Day Session", time: "11:15 AM – 12:30 PM" },
            { name: "Afternoon Session", time: "1:30 PM – 2:45 PM" },
        ],
        schedule: "Tuesday & Thursday",
        startDate: "Tuesday, October 27, 2026",
        badgeColor: "#0284c7",
        themeBg: "#f0f9ff",
        disclaimerType: "adventure",
    },
    {
        id: "everyday-curious",
        name: "Discovery Club: Everyday Explorer",
        short: "Everyday Explorer",
        icon: "🌈",
        isAdv: true,
        advNum: 2,
        classes: [
            { name: "Mid-Day Session", time: "11:15 AM – 12:30 PM" },
        ],
        schedule: "Monday – Thursday",
        startDate: "Monday, October 26, 2026",
        badgeColor: "#16a34a",
        themeBg: "#f0fdf4",
        disclaimerType: "adventure",
    },
    {
        id: "brave-explorer",
        name: "Trailblazer: Brave Explorer",
        short: "Brave Explorer",
        icon: "🏕️",
        isAdv: true,
        advNum: 2,
        classes: [
            { name: "Afternoon Session", time: "3:00 PM – 4:15 PM" },
        ],
        schedule: "Monday – Friday",
        startDate: "Monday, October 26, 2026",
        badgeColor: "#4f46e5",
        themeBg: "#eef2ff",
        disclaimerType: "adventure",
    },
    {
        id: "saturday-playdate",
        name: "Saturday Playdate",
        short: "Saturday Playdate",
        icon: "🛝",
        isAdv: true,
        advNum: 2,
        classes: [
            { name: "Morning Session", time: "10:30 AM – 11:45 AM" },
        ],
        schedule: "Saturdays",
        startDate: "Saturday, October 31, 2026",
        badgeColor: "#0ea5e9",
        themeBg: "#f0f9ff",
        disclaimerType: "playdate",
    },
    {
        id: "ballet",
        name: "Ballet",
        short: "Ballet",
        icon: "🩰",
        isAdv: false,
        classes: [
            { name: "Baby Ballet (Morning)", time: "9:00 AM – 10:00 AM" },
            { name: "Baby Ballet (Afternoon)", time: "12:30 PM – 1:30 PM" },
            { name: "Basic Ballet", time: "1:45 PM – 2:45 PM" },
        ],
        schedule: "Every Saturday, starts Oct 31",
        startDate: "Saturday, October 31, 2026",
        badgeColor: "#be185d",
        themeBg: "#fdf2f8",
        disclaimerType: "ballet",
    },
    {
        id: "virtual-session",
        name: "Virtual Tutorial",
        short: "Virtual Tutorial",
        icon: "💻",
        isAdv: false,
        classes: [
            { name: "Online 1-on-1 Sessions", time: "Flexible Schedule" },
        ],
        schedule: "Flexible weekday / weekend slots",
        startDate: "Ongoing / Arranged with Teacher",
        badgeColor: "#6d28d9",
        themeBg: "#f5f3ff",
        disclaimerType: "virtual",
    },
];

function RegistrationAllProgramsPreview() {
    const [selectedProgId, setSelectedProgId] = useState("curious-explorer");
    const [selectedClassIdx, setSelectedClassIdx] = useState(0);
    const [childName, setChildName] = useState("Noah");
    const [parentName, setParentName] = useState("Maria Santos");

    const prog = PROGRAMS.find((p) => p.id === selectedProgId) || PROGRAMS[0];
    const selectedClass = prog.classes[selectedClassIdx] || prog.classes[0];

    const advLabel = prog.isAdv ? `Adventure ${prog.advNum ?? 2}` : prog.name;

    const emailSubject = prog.isAdv
        ? `Payment Reminder & Slot Confirmation: ${prog.name} (${advLabel}) for ${childName} 🌈`
        : prog.id === "ballet"
            ? `Payment Reminder & Slot Confirmation: Ballet (${selectedClass.name}) for ${childName} 🩰`
            : prog.id === "saturday-playdate"
                ? `Payment Reminder & Slot Confirmation: Saturday Playdate for ${childName} 🛝`
                : `Payment Reminder & Slot Confirmation: Virtual Tutorial for ${childName} 💻`;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* ── Interactive Program Selector ── */}
            <div style={{ backgroundColor: "white", borderRadius: 16, border: "1px solid #cbd5e1", padding: 20 }}>
                <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: "bold", color: "#002f76", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Select Program to Preview:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {PROGRAMS.map((p) => {
                        const isSelected = p.id === prog.id;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                    setSelectedProgId(p.id);
                                    setSelectedClassIdx(0);
                                }}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "8px 14px",
                                    borderRadius: 12,
                                    border: isSelected ? `2px solid ${p.badgeColor}` : "1.5px solid #e2e8f0",
                                    backgroundColor: isSelected ? p.themeBg : "white",
                                    color: isSelected ? p.badgeColor : "#475569",
                                    fontWeight: isSelected ? 800 : 600,
                                    fontSize: 13,
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                }}
                            >
                                <span>{p.icon}</span>
                                <span>{p.short}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Class / Session Pills (especially useful for Ballet with 3 sessions) */}
                {prog.classes.length > 1 && (
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                            Session / Time Slot:
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {prog.classes.map((cls, idx) => {
                                const isClassActive = idx === selectedClassIdx;
                                return (
                                    <button
                                        key={cls.name}
                                        type="button"
                                        onClick={() => setSelectedClassIdx(idx)}
                                        style={{
                                            padding: "6px 12px",
                                            borderRadius: 8,
                                            border: isClassActive ? "1.5px solid #0033a0" : "1px solid #cbd5e1",
                                            backgroundColor: isClassActive ? "#eff6ff" : "white",
                                            color: isClassActive ? "#0033a0" : "#475569",
                                            fontSize: 12,
                                            fontWeight: isClassActive ? 700 : 500,
                                            cursor: "pointer",
                                        }}
                                    >
                                        <strong>{cls.name}</strong> · {cls.time}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Sample Names Customizer */}
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #f1f5f9", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Parent:</span>
                        <input
                            type="text"
                            value={parentName}
                            onChange={(e) => setParentName(e.target.value)}
                            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, fontWeight: 600, color: "#1e293b", width: 130 }}
                        />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Child:</span>
                        <input
                            type="text"
                            value={childName}
                            onChange={(e) => setChildName(e.target.value)}
                            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, fontWeight: 600, color: "#1e293b", width: 100 }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Metadata Box: Subject & Headers ── */}
            <div style={{ backgroundColor: "#f8fafc", borderRadius: 14, border: "1px solid #cbd5e1", padding: "14px 18px", fontSize: 12.5, color: "#334155" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <span style={{ color: "#64748b", fontWeight: "bold", width: 65 }}>To:</span>
                    <span style={{ color: "#002f76", fontWeight: "bold" }}>{parentName.toLowerCase().replace(/\s+/g, ".")}@gmail.com</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <span style={{ color: "#64748b", fontWeight: "bold", width: 65 }}>From:</span>
                    <span>Merry Explorers &lt;merryexplorerscenter@gmail.com&gt;</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "#64748b", fontWeight: "bold", width: 65 }}>Subject:</span>
                    <span style={{ color: "#0033a0", fontWeight: 800 }}>{emailSubject}</span>
                </div>
            </div>

            {/* ── Rendered Email Template ── */}
            <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 600, margin: "0 auto", color: "#1e293b", lineHeight: 1.6, border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", backgroundColor: "white", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                {/* Header Banner */}
                <div style={{ backgroundColor: "#002f76", padding: 24, textAlign: "center", color: "white" }}>
                    <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>Merry Explorers Playgroup Learning Center</h1>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#ffb800", fontWeight: "bold" }}>
                        Slot Reservation &amp; Payment Confirmation · {prog.isAdv ? advLabel : prog.name}
                    </p>
                </div>

                <div style={{ padding: 28 }}>
                    <p>Dear <strong>{parentName}</strong>,</p>
                    <p>Thank you for submitting your registration for <strong>{childName}</strong>! Your slot has been received and is currently held on reservation.</p>

                    {/* Specific Program & Schedule Details Box */}
                    <div style={{ backgroundColor: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 14, padding: "18px 20px", margin: "20px 0" }}>
                        <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: "#1e40af", textTransform: "uppercase", letterSpacing: 0.5 }}>
                            📋 Confirmed Registration Details
                        </p>
                        <table width="100%" cellPadding="0" cellSpacing="0" style={{ fontSize: 13.5, color: "#1e293b" }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: "4px 0", color: "#64748b", width: 140 }}><strong>Explorer:</strong></td>
                                    <td style={{ padding: "4px 0", fontWeight: "bold", color: "#002f76" }}>{childName} Santos</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: "4px 0", color: "#64748b" }}><strong>Program:</strong></td>
                                    <td style={{ padding: "4px 0", fontWeight: "bold", color: "#002f76" }}>{prog.name}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: "4px 0", color: "#64748b" }}><strong>Session:</strong></td>
                                    <td style={{ padding: "4px 0", fontWeight: "bold", color: "#002f76" }}>{selectedClass.name} ({selectedClass.time})</td>
                                </tr>
                                {prog.isAdv && (
                                    <tr>
                                        <td style={{ padding: "4px 0", color: "#64748b" }}><strong>Adventure Cycle:</strong></td>
                                        <td style={{ padding: "4px 0", fontWeight: "bold", color: "#059669" }}>{advLabel}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td style={{ padding: "4px 0", color: "#64748b" }}><strong>{prog.isAdv ? "Adventure Starts:" : "Program Starts:"}</strong></td>
                                    <td style={{ padding: "4px 0", fontWeight: 800, color: "#d97706" }}>🚀 {prog.startDate}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Action Button */}
                    <div style={{ backgroundColor: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 14, padding: 20, textAlign: "center", margin: "24px 0" }}>
                        <p style={{ margin: 0, fontSize: 14, color: "#1e40af", fontWeight: "bold" }}>Ready to complete your payment?</p>
                        <p style={{ margin: "8px 0 16px", fontSize: 13, color: "#3b82f6" }}>Click the button below to upload your payment receipt and confirm your child&apos;s slot:</p>
                        <a
                            href="#"
                            onClick={(e) => e.preventDefault()}
                            style={{ backgroundColor: "#0033a0", color: "white", padding: "13px 28px", textDecoration: "none", borderRadius: 12, fontWeight: "bold", display: "inline-block" }}
                        >
                            Proceed to Payment Page →
                        </a>
                    </div>

                    {/* Program-specific notes and disclaimers */}
                    {prog.disclaimerType === "adventure" && (
                        <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 16, margin: "20px 0", fontSize: 13, color: "#92400e" }}>
                            <p style={{ margin: "0 0 6px", fontWeight: "bold" }}>⚠️ IMPORTANT NOTE &amp; DISCLAIMER:</p>
                            <p style={{ margin: "0 0 8px" }}>Please ensure to settle your <strong>Adventure 1 Balance</strong> before you can proceed to the registration.</p>
                            <p style={{ margin: 0, fontStyle: "italic" }}>
                                &quot;In the event that a family has unsettled balance, your downpayment for {advLabel} will be credited as your balance payment for the previous cycle.&quot;
                            </p>
                        </div>
                    )}

                    {prog.disclaimerType === "ballet" && (
                        <div style={{ backgroundColor: "#fdf2f8", border: "1.5px solid #fbcfe8", borderRadius: 12, padding: 16, margin: "20px 0", fontSize: 13, color: "#831843" }}>
                            <p style={{ margin: "0 0 6px", fontWeight: "bold", fontSize: 14 }}>🩰 2026 BALLET RECITAL ON NOVEMBER 28</p>
                            <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Recital kit is optional, but required if joining the recital.</p>
                            <div style={{ backgroundColor: "white", border: "1px solid #fbcfe8", borderRadius: 10, padding: 12, margin: "10px 0" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                    <span style={{ fontWeight: "bold", color: "#be185d", fontSize: 13.5 }}>Recital Kit</span>
                                    <span style={{ fontWeight: 900, color: "#be185d", fontSize: 15 }}>₱1,500</span>
                                </div>
                                <p style={{ margin: "0 0 6px", fontSize: 12, color: "#475569" }}>
                                    Recital kit preorder starts on October 3. Inclusive of 2 guest passes, 1 mini bouquet, and 1 set of costume.
                                </p>
                                <div style={{ display: "flex", gap: 12, fontSize: 12, fontWeight: 700, color: "#1e293b", flexWrap: "wrap" }}>
                                    <span>🎫 2 Guest Passes</span>
                                    <span>💐 1 Mini Bouquet</span>
                                    <span>👗 1 Set of Costume</span>
                                </div>
                            </div>
                            <ul style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 12.5, color: "#475569" }}>
                                <li>5 sessions total (₱2,750): 60% downpayment (₱1,650) to confirm a slot, 40% balance (₱1,100).</li>
                                <li><strong>12 completed sessions</strong> are required to join the recital.</li>
                                <li>The next recital will be in <strong>Q1 of 2027</strong>.</li>
                            </ul>
                        </div>
                    )}

                    {prog.disclaimerType === "virtual" && (
                        <div style={{ backgroundColor: "#f5f3ff", border: "1.5px solid #ddd6fe", borderRadius: 12, padding: 16, margin: "20px 0", fontSize: 13, color: "#5b21b6" }}>
                            <p style={{ margin: "0 0 6px", fontWeight: "bold" }}>💻 VIRTUAL TUTORIAL INFORMATION:</p>
                            <p style={{ margin: 0 }}>Online classroom links and schedules will be coordinated directly with your teacher prior to your first session.</p>
                        </div>
                    )}

                    {prog.disclaimerType === "playdate" && (
                        <div style={{ backgroundColor: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: 12, padding: 16, margin: "20px 0", fontSize: 13, color: "#0369a1" }}>
                            <p style={{ margin: "0 0 6px", fontWeight: "bold" }}>🛝 SATURDAY PLAYDATE REMINDERS:</p>
                            <p style={{ margin: 0 }}>Please wear comfortable play clothes and socks. A parent or guardian is welcome to accompany little explorers!</p>
                        </div>
                    )}

                    <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, marginTop: 20, fontSize: 12.5, color: "#475569" }}>
                        <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>⏰ Deadline Reminder:</p>
                        <p style={{ margin: 0 }}>Unpaid reservations will be held until <strong>October 16, 2026 at 1:00 PM</strong>, after which unpaid slots will be released to the waitlist.</p>
                    </div>

                    <p style={{ fontSize: 13, color: "#64748b", marginTop: 24 }}>
                        Need help? Feel free to approach Teacher Angel onsite, or reply directly to this email.
                    </p>

                    <p style={{ marginTop: 24, fontSize: 14, color: "#002f76", fontWeight: "bold" }}>
                        Warm regards,<br />
                        The Merry Explorers Team 💛
                    </p>
                </div>
            </div>
        </div>
    );
}

function PromoCodePreview() {
    return (
        <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 600, margin: "0 auto", color: "#1e293b", lineHeight: 1.6, border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", backgroundColor: "white" }}>
            <div style={{ backgroundColor: "#002f76", padding: 24, textAlign: "center", color: "white" }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>Merry Explorers Playgroup Learning Center</h1>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#ffb800", fontWeight: "bold" }}>Priority Renewal Access</p>
            </div>
            <div style={{ padding: 28 }}>
                <p>Dear <strong>Parent / Guardian</strong>,</p>
                <p>We are excited to welcome back <strong>Child Name</strong> for our upcoming adventure!</p>
                <p>As a valued returning family, you have priority access to reserve your slot before general registration:</p>

                <div style={{ backgroundColor: "#f8fafc", border: "2px dashed #0033a0", borderRadius: 12, padding: 18, textAlign: "center", margin: "24px 0" }}>
                    <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#64748b", fontWeight: "bold" }}>Your Priority Reservation Code</p>
                    <p style={{ margin: "6px 0 0", fontSize: 26, fontFamily: "monospace", fontWeight: 900, color: "#002f76", letterSpacing: 2 }}>A1RENEWAL2026</p>
                </div>

                <p style={{ textAlign: "center", margin: "24px 0" }}>
                    <a href="#" style={{ backgroundColor: "#0033a0", color: "white", padding: "14px 28px", textDecoration: "none", borderRadius: 12, fontWeight: "bold", display: "inline-block" }}>
                        Complete Registration Form →
                    </a>
                </p>

                <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 16, marginTop: 24, fontSize: 13, color: "#92400e" }}>
                    <p style={{ margin: "0 0 8px", fontWeight: "bold" }}>⚠️ Key Reminders Regarding Your Reservation:</p>
                    <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>
                        <li>This code is <strong>not a discount voucher</strong>. It reserves your child&apos;s slot without upfront payment today.</li>
                        <li><strong>Code validity:</strong> Valid only until <strong>October 15, 2026</strong>.</li>
                        <li><strong>Slot release policy:</strong> All unpaid slots as of <strong>October 16, 2026 at 1:00 PM</strong> will be released.</li>
                        <li><strong>Confirmation:</strong> Your slot is officially confirmed upon receipt of the 60% non-refundable downpayment.</li>
                    </ul>
                    <div style={{ borderTop: "1px dashed #fcd34d", paddingTop: 10, marginTop: 10 }}>
                        <p style={{ margin: "0 0 4px", fontWeight: "bold", color: "#b45309" }}>⚠️ NOTE &amp; DISCLAIMER:</p>
                        <p style={{ margin: "0 0 6px" }}>Please ensure to settle your <strong>2026 Adventure 1 Balance</strong> before you can proceed to the registration.</p>
                        <p style={{ margin: 0, fontStyle: "italic", color: "#78350f" }}>
                            &quot;In the event that a family has unsettled balance, your downpayment for the 2026 Adventure 2 will be credited as your balance payment for the 2026 Adventure 1.&quot;
                        </p>
                    </div>
                </div>

                <p style={{ fontSize: 13, color: "#64748b", marginTop: 24 }}>
                    If you have any questions about schedules or need help accessing the form, feel free to approach Teacher Angel onsite, or reply directly to this email.
                </p>
                <p style={{ marginTop: 24, fontSize: 14, color: "#002f76", fontWeight: "bold" }}>
                    Warm regards,<br />The Merry Explorers Team 💛
                </p>
            </div>
        </div>
    );
}

function PaymentReminderPreview() {
    return (
        <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 600, margin: "0 auto", color: "#1e293b", lineHeight: 1.6, border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", backgroundColor: "white" }}>
            <div style={{ backgroundColor: "#002f76", padding: 24, textAlign: "center", color: "white" }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>Merry Explorers Playgroup Learning Center</h1>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#ffb800", fontWeight: "bold" }}>Slot Reservation &amp; Payment Confirmation</p>
            </div>
            <div style={{ padding: 28 }}>
                <p>Dear <strong>Parent / Guardian</strong>,</p>
                <p>Thank you for submitting your priority renewal registration for <strong>Child Name</strong>! Your slot is currently on hold under reservation.</p>

                <div style={{ backgroundColor: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 14, padding: 20, textAlign: "center", margin: "24px 0" }}>
                    <p style={{ margin: 0, fontSize: 14, color: "#1e40af", fontWeight: "bold" }}>Ready to complete your payment?</p>
                    <p style={{ margin: "8px 0 16px", fontSize: 13, color: "#3b82f6" }}>Click the button below to upload your payment receipt and confirm your child&apos;s slot:</p>
                    <a href="#" style={{ backgroundColor: "#0033a0", color: "white", padding: "13px 28px", textDecoration: "none", borderRadius: 12, fontWeight: "bold", display: "inline-block" }}>
                        Proceed to Payment Page →
                    </a>
                </div>

                <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 16, margin: "20px 0", fontSize: 13, color: "#92400e" }}>
                    <p style={{ margin: "0 0 6px", fontWeight: "bold" }}>⚠️ IMPORTANT NOTE &amp; DISCLAIMER:</p>
                    <p style={{ margin: "0 0 8px" }}>Please ensure to settle your <strong>2026 Adventure 1 Balance</strong> before you can proceed to the registration.</p>
                    <p style={{ margin: 0, fontStyle: "italic" }}>
                        &quot;In the event that a family has unsettled balance, your downpayment for the 2026 Adventure 2 will be credited as your balance payment for the 2026 Adventure 1.&quot;
                    </p>
                </div>

                <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, marginTop: 20, fontSize: 13, color: "#475569" }}>
                    <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>⏰ Deadline Reminder:</p>
                    <p style={{ margin: 0 }}>Unpaid reservations will be held until <strong>October 16, 2026 at 1:00 PM</strong>, after which unpaid slots will be released to the waitlist.</p>
                </div>

                <p style={{ fontSize: 13, color: "#64748b", marginTop: 24 }}>
                    Need help? Feel free to approach Teacher Angel onsite, or reply directly to this email.
                </p>
                <p style={{ marginTop: 24, fontSize: 14, color: "#002f76", fontWeight: "bold" }}>
                    Warm regards,<br />The Merry Explorers Team 💛
                </p>
            </div>
        </div>
    );
}

function SlotReleasedPreview() {
    return (
        <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 600, margin: "0 auto", color: "#1e293b", lineHeight: 1.6, border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", backgroundColor: "white" }}>
            <div style={{ backgroundColor: "#002f76", padding: 24, textAlign: "center", color: "white" }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>Merry Explorers Playgroup Learning Center</h1>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#ffb800", fontWeight: "bold" }}>Adventure 2 Reservation Update</p>
            </div>
            <div style={{ padding: 28 }}>
                <p>Dear <strong>Parent / Guardian</strong>,</p>
                <p>We are reaching out to inform you regarding your temporary reservation for <strong>Child Name</strong> for the upcoming <strong>2026 Adventure 2</strong> program.</p>

                <div style={{ backgroundColor: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 14, padding: 20, textAlign: "center", margin: "24px 0" }}>
                    <p style={{ margin: 0, fontSize: 16, color: "#991b1b", fontWeight: 800 }}>Notice of Released Slot</p>
                    <p style={{ margin: "8px 0 0", fontSize: 13, color: "#b91c1c", lineHeight: 1.5 }}>
                        As of <strong>October 16, 2026 at 1:00 PM</strong>, our priority reservation payment deadline has officially closed. Because payment was not received or confirmed before the cutoff, your reserved slot has now been <strong>released</strong> to waitlisted families.
                    </p>
                </div>

                <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18, margin: "20px 0", fontSize: 13 }}>
                    <p style={{ margin: "0 0 8px", fontWeight: "bold", color: "#002f76" }}>Would you still like Child Name to join us for Adventure 2?</p>
                    <p style={{ margin: "0 0 16px", color: "#475569" }}>
                        Families who miss the payment deadline and still wish to secure a slot must submit a <strong>new registration form</strong> through our standard registration portal, subject to remaining program availability.
                    </p>
                    <p style={{ textAlign: "center", margin: 0 }}>
                        <a href="#" style={{ backgroundColor: "#0033a0", color: "white", padding: "13px 28px", textDecoration: "none", borderRadius: 12, fontWeight: "bold", display: "inline-block" }}>
                            Submit New Registration Form →
                        </a>
                    </p>
                </div>

                <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 14, margin: "20px 0", fontSize: 13, color: "#92400e" }}>
                    <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>⚠️ Reminder for Adventure 1 Balances:</p>
                    <p style={{ margin: 0 }}>
                        If you have an unsettled Adventure 1 account balance, please remember that any new downpayments will be credited toward outstanding balances first.
                    </p>
                </div>

                <p style={{ fontSize: 13, color: "#64748b", marginTop: 24 }}>
                    If you have any questions or have already made a payment that needs verification, please reach out to Teacher Angel immediately, or reply directly to this email.
                </p>
                <p style={{ marginTop: 24, fontSize: 14, color: "#002f76", fontWeight: "bold" }}>
                    Warm regards,<br />The Merry Explorers Team 💛
                </p>
            </div>
        </div>
    );
}

export default function EmailPreviewPage() {
    const [activeTab, setActiveTab] = useState("registration_preview");

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", fontFamily: "Arial, sans-serif" }}>
            <div style={{ backgroundColor: "#002f76", color: "white", padding: "20px 32px" }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>📧 Email Template Preview</h1>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#93c5fd" }}>
                    Interactive visual preview of registration &amp; renewal email templates across all programs — no emails will be sent from this page.
                </p>
            </div>

            <div style={{ display: "flex", gap: 8, padding: "16px 32px", backgroundColor: "white", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap" }}>
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            padding: "10px 20px",
                            borderRadius: 10,
                            border: "none",
                            cursor: "pointer",
                            fontWeight: activeTab === tab.key ? "bold" : "normal",
                            backgroundColor: activeTab === tab.key ? "#002f76" : "#f1f5f9",
                            color: activeTab === tab.key ? "white" : "#475569",
                            fontSize: 14,
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ padding: "32px", maxWidth: 740, margin: "0 auto" }}>
                {activeTab === "registration_preview" && <RegistrationAllProgramsPreview />}
                {activeTab === "promo_code" && <PromoCodePreview />}
                {activeTab === "payment_reminder" && <PaymentReminderPreview />}
                {activeTab === "slot_released" && <SlotReleasedPreview />}
            </div>
        </div>
    );
}
