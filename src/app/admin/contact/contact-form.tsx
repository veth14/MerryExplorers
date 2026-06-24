"use client";

import { useState } from "react";

const DEVELOPER_EMAIL = "vianangelo.14@gmail.com";

const issueTypes = [
  { value: "bug", label: "Bug / Error", icon: "bug_report", color: "from-[#d32f2f] to-[#b71c1c]" },
  { value: "feature", label: "Feature Request", icon: "lightbulb", color: "from-[#7b1fa2] to-[#5e35b1]" },
  { value: "account", label: "Account Issue", icon: "manage_accounts", color: "from-[#0288d1] to-[#0277bd]" },
  { value: "other", label: "Other", icon: "help", color: "from-[#f57c00] to-[#e65100]" },
] as const;

function ArrowRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function CheckmarkIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function ContactForm() {
  const [issueType, setIssueType] = useState<string>("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!subject.trim() || !message.trim()) {
      setError("Please fill in the subject and describe the issue.");
      return;
    }

    const typeLabel = issueTypes.find((t) => t.value === issueType)?.label ?? issueType;
    const mailSubject = encodeURIComponent(`[Merry Explorers] ${typeLabel}: ${subject.trim()}`);
    const body = encodeURIComponent(
      `Issue type: ${typeLabel}\n\n${message.trim()}\n\n— Sent from the Merry Explorers dashboard`
    );

    window.location.href = `mailto:${DEVELOPER_EMAIL}?subject=${mailSubject}&body=${body}`;
    setSent(true);
  }

  const selectedType = issueTypes.find((t) => t.value === issueType);

  return (
    <div className="rounded-2xl border border-[#e0e0e0] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] overflow-hidden w-full max-w-2xl">
      {/* ── Developer banner with gradient background ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0033A0] via-[#0050d5] to-[#003399] px-8 py-8 md:py-10">
        {/* Animated background orbs */}
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/5 blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[#FFC107]/10 blur-3xl animate-pulse" style={{ animationDuration: "7s", animationDelay: "1s" }} />

        <div className="relative space-y-6">
          {/* Avatar + Name Section */}
          <div className="flex items-start gap-4">
            {/* Avatar with enhanced styling */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/20 to-white/10 ring-2 ring-[#FFC107] backdrop-blur-md text-[22px] font-black text-white shadow-lg">
              IV
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-[18px] md:text-[20px] font-extrabold text-white leading-tight">Ian Angelo Valmores</p>
              <p className="text-[12px] font-semibold text-[#FFC107] mt-1">Developer & Support</p>
            </div>
          </div>

          {/* Info row */}
          <div className="flex flex-col sm:flex-row gap-4 text-[12px] font-medium text-white/90">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#FFC107]" style={{ fontSize: "16px" }}>
                mail
              </span>
              <span>{DEVELOPER_EMAIL}</span>
            </div>
            <div className="hidden sm:block h-4 w-[1px] bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#FFC107]" style={{ fontSize: "16px" }}>
                schedule
              </span>
              <span>Response in 1–2 business days</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form body ── */}
      <div className="px-8 py-10 md:px-10 md:py-12">
        {sent ? (
          <div className="flex flex-col items-center justify-center text-center py-12 animate-in fade-in duration-300">
            {/* Success checkmark with animation */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#4caf50] to-[#45a049] shadow-lg mb-6 animate-bounce" style={{ animationDuration: "0.6s" }}>
              <span className="text-white" style={{ fontSize: "40px" }}>
                <CheckmarkIcon />
              </span>
            </div>
            
            <h3 className="font-headline text-[22px] md:text-[24px] font-extrabold text-[#0033A0]">
              Report sent! 🎉
            </h3>
            
            <p className="mt-3 max-w-sm text-[14px] font-medium text-[#555555] leading-relaxed">
              Your email client should open with your report pre-filled. If it didn't, you can always write directly to{" "}
              <span className="font-bold text-[#0033A0]">{DEVELOPER_EMAIL}</span>.
            </p>
            
            <p className="mt-4 text-[12px] font-semibold text-[#9aa3b2]">
              I&apos;ll get back to you within 1–2 business days.
            </p>

            <button
              onClick={() => {
                setSent(false);
                setSubject("");
                setMessage("");
                setIssueType("bug");
              }}
              className="mt-8 px-6 py-2.5 text-[13px] font-bold text-[#0050d5] bg-white border-2 border-[#0050d5] rounded-full transition-all hover:bg-[#0050d5]/5 focus:outline-none focus:ring-2 focus:ring-[#0050d5] focus:ring-offset-2 active:scale-95"
            >
              Send Another Report
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8" noValidate>
            <p className="text-[14px] font-medium text-[#555555] leading-relaxed">
              Found a bug or have a great idea? Tell me what&apos;s on your mind — I read every message personally.
            </p>

            {/* Issue type selector with visual distinction */}
            <div>
              <label className="block text-[13px] font-bold text-[#1f2a44] mb-3 uppercase tracking-wider">
                What&apos;s this about?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {issueTypes.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setIssueType(t.value)}
                    className={`group relative flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      issueType === t.value
                        ? `border-transparent bg-gradient-to-br ${t.color} text-white shadow-lg scale-105 focus:ring-[#0033A0]`
                        : "border-[#E0E0E0] text-[#555555] hover:border-[#0033A0] hover:shadow-md focus:ring-[#0033A0]/30"
                    }`}
                  >
                    <span
                      className="material-symbols-outlined transition-transform group-hover:scale-110"
                      style={{
                        fontSize: "24px",
                        color: issueType === t.value ? "white" : "#9aa3b2",
                      }}
                    >
                      {t.icon}
                    </span>
                    <span className={`text-[11px] font-bold leading-tight text-center ${
                      issueType === t.value ? "text-white" : "text-[#555555]"
                    }`}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject input with enhanced styling */}
            <div>
              <label
                htmlFor="subject"
                className="block text-[13px] font-bold text-[#1f2a44] mb-2"
              >
                Subject
              </label>
              <div className="relative">
                <input
                  id="subject"
                  type="text"
                  placeholder="A brief summary…"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onFocus={() => setFocused("subject")}
                  onBlur={() => setFocused(null)}
                  className={`w-full px-4 py-3.5 rounded-xl border-2 bg-white text-[14px] font-medium text-[#1f2a44] placeholder:text-[#b6bdc9] transition-all duration-200 focus:outline-none ${
                    focused === "subject"
                      ? "border-[#0050d5] ring-4 ring-[#0050d5]/15 shadow-lg"
                      : "border-[#E0E0E0] hover:border-[#0050d5]/30"
                  } ${error && !subject ? "border-[#d32f2f] ring-4 ring-[#d32f2f]/15" : ""}`}
                />
              </div>
            </div>

            {/* Message textarea with enhanced styling */}
            <div>
              <label
                htmlFor="message"
                className="block text-[13px] font-bold text-[#1f2a44] mb-2"
              >
                Description
              </label>
              <div className="relative">
                <textarea
                  id="message"
                  rows={5}
                  placeholder="Tell me what happened, what you expected, or what you'd like to see…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onFocus={() => setFocused("message")}
                  onBlur={() => setFocused(null)}
                  className={`w-full px-4 py-3.5 rounded-xl border-2 bg-white text-[14px] font-medium text-[#1f2a44] placeholder:text-[#b6bdc9] resize-none transition-all duration-200 focus:outline-none ${
                    focused === "message"
                      ? "border-[#0050d5] ring-4 ring-[#0050d5]/15 shadow-lg"
                      : "border-[#E0E0E0] hover:border-[#0050d5]/30"
                  } ${error && !message ? "border-[#d32f2f] ring-4 ring-[#d32f2f]/15" : ""}`}
                />
              </div>
            </div>

            {/* Error message with better styling */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-[#d32f2f]/20 bg-[#d32f2f]/5 px-4 py-3 text-[13px] font-semibold text-[#d32f2f] flex items-start gap-2 animate-in slide-in-from-top duration-200"
              >
                <span className="material-symbols-outlined flex-shrink-0 mt-px" style={{ fontSize: "18px" }}>
                  error
                </span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit button with enhanced styling and states */}
            <button
              type="submit"
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-[#FFC107] to-[#ffb800] text-[#0033A0] text-[15px] font-extrabold shadow-lg hover:shadow-xl active:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#FFC107]/40 focus:ring-offset-2 flex items-center justify-center gap-2"
            >
              <span>Send Report</span>
              <ArrowRightIcon />
            </button>

            {/* Helper text */}
            <p className="text-center text-[12px] font-medium text-[#9aa3b2]">
              Your browser will open your email client. If you have questions, reply directly there.
            </p>
          </form>
        )}
      </div>

      {/* ── Animation keyframes ── */}
      <style jsx global>{`
        @keyframes in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-in {
          animation: in 0.3s ease-out;
        }
        
        .fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .slide-in-from-top {
          animation: slideInFromTop 0.2s ease-out;
        }
        
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}