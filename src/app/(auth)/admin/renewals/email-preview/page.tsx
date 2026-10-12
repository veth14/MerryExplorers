"use client";

import { useState } from "react";

const TABS = [
    { key: "promo_code", label: "📨 Promo Code Email" },
    { key: "payment_reminder", label: "⏰ Payment Reminder Email" },
    { key: "slot_released", label: "🔴 Slot Released Email" },
];

function PromoCodePreview() {
    return (
        <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 600, margin: "0 auto", color: "#1e293b", lineHeight: 1.6, border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
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
        <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 600, margin: "0 auto", color: "#1e293b", lineHeight: 1.6, border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
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
        <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 600, margin: "0 auto", color: "#1e293b", lineHeight: 1.6, border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
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
    const [activeTab, setActiveTab] = useState("promo_code");

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", fontFamily: "Arial, sans-serif" }}>
            <div style={{ backgroundColor: "#002f76", color: "white", padding: "20px 32px" }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>📧 Email Template Preview</h1>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#93c5fd" }}>
                    Visual preview of all renewal email templates — no emails will be sent from this page.
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

            <div style={{ padding: "32px", maxWidth: 700, margin: "0 auto" }}>
                <div style={{ backgroundColor: "#e2e8f0", borderRadius: 8, padding: "8px 16px", marginBottom: 20, fontSize: 12, color: "#64748b" }}>
                    ℹ️ Placeholder values shown: <strong>Parent / Guardian</strong> &amp; <strong>Child Name</strong>. Real emails use actual family data.
                </div>
                {activeTab === "promo_code" && <PromoCodePreview />}
                {activeTab === "payment_reminder" && <PaymentReminderPreview />}
                {activeTab === "slot_released" && <SlotReleasedPreview />}
            </div>
        </div>
    );
}
