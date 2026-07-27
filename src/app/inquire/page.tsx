"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { NAV_LINKS } from "@/data/landing";

const CHILD_AGE_OPTIONS = [
  "1.6 – 2.5 years (Tiny Explorers)",
  "2.6 – 4.11 years (Little Explorers)",
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

const inputCls = "w-full bg-[#f8fafc] border-2 border-transparent rounded-2xl px-5 py-4 text-[15px] font-bold text-[#002f76] placeholder:text-[#94a3b8] placeholder:font-semibold focus:outline-none focus:border-[#0033A0]/30 focus:bg-white transition-all shadow-inner";

function AgeDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 border-2 rounded-2xl px-5 py-4 text-[15px] font-bold text-left transition-all
          ${open ? "bg-white border-[#0033A0]/30" : "bg-[#f8fafc] border-transparent hover:bg-[#f1f5f9]"}
          ${value ? "text-[#002f76]" : "text-[#94a3b8] font-semibold"}`}
      >
        <span>{value || "Select age range"}</span>
        <span className="text-[#64748b] shrink-0"><ChevronDownIcon open={open} /></span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 z-30 bg-white border border-[#e2e8f0] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden p-2"
          >
            {CHILD_AGE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[14px] font-bold text-left transition-colors
                  ${value === opt ? "bg-[#0033A0] text-white" : "text-[#334155] hover:bg-[#f1f5f9]"}`}
              >
                <span>{opt}</span>
                {value === opt && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 shrink-0"><path d="M20 6 9 17l-5-5" /></svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function InquirePage() {
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!parentName.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentName, email, phone, childName, childAge, message }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setParentName(""); setEmail(""); setPhone("");
        setChildName(""); setChildAge(""); setMessage("");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="min-h-screen bg-[#fdfdfd] flex flex-col relative">
      
      {/* ── Dreamy Background Orbs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div aria-hidden className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#0033A0] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.07]"></div>
        <div aria-hidden className="absolute top-40 -right-20 w-[500px] h-[500px] bg-[#FFC107] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.1]"></div>
        <div aria-hidden className="absolute -bottom-40 left-1/3 w-[700px] h-[700px] bg-[#0050d5] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.05]"></div>
      </div>

      {/* ── Header ── */}
      <header className="relative z-50 bg-white/60 border-b border-black/5 sticky top-0 backdrop-blur-xl">
        <div className="mx-auto flex h-[80px] w-full max-w-[1400px] items-center justify-between px-6 sm:px-10">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 transition-transform hover:scale-[0.98]">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl">
              <Image src="/LOGO-noBG.png" alt="Merry Explorers Logo" fill sizes="40px" className="object-contain" />
            </div>
            <span className="flex flex-col leading-none">
              <span className="font-headline text-[18px] font-extrabold tracking-tight text-[#0033A0]">Merry</span>
              <span className="font-headline text-[12px] font-bold tracking-[0.12em] text-[#FFB800]">Explorers</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            {NAV_LINKS.map((link) => {
              const isActive = link.href === "/inquire";
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`rounded-full px-6 py-2.5 text-[15px] font-bold transition-all ${
                    isActive
                      ? "text-[#0033A0] bg-[#0033A0]/10"
                      : "text-[#64748b] hover:bg-black/5 hover:text-[#0033A0]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-full bg-white border-2 border-[#f1f5f9] px-6 py-2.5 text-[15px] font-bold text-[#0033A0] shadow-sm hover:border-[#0033A0]/20 hover:bg-[#f8fafc] transition-all hover:-translate-y-0.5"
          >
            Portal Login
          </Link>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-5 py-16 sm:py-24">
        <div className="w-full max-w-[760px]">
          
          {/* Header Text */}
          <div className="text-center mb-12">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-block mb-4">
                <span className="text-4xl">👋</span>
              </span>
              <h1 className="font-headline text-[40px] sm:text-[56px] font-extrabold leading-[1.1] tracking-tight text-[#0f172a] mb-5">
                We'd love to <br className="sm:hidden" /> hear from you.
              </h1>
              <p className="text-[17px] font-medium text-[#64748b] max-w-lg mx-auto leading-relaxed">
                Send us a message below and our friendly admissions team will get back to you within 1–2 business days.
              </p>
            </motion.div>
          </div>

          {/* Floating Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-12 shadow-[0_24px_80px_rgba(0,51,160,0.06)] border border-white"
          >
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="flex flex-col items-center text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#22c55e] to-[#4ade80] text-white flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
                    <CheckIcon />
                  </div>
                  <h3 className="text-[32px] font-extrabold text-[#0f172a] mb-4">Message Sent!</h3>
                  <p className="text-[17px] font-medium text-[#64748b] max-w-sm leading-relaxed mb-10">
                    Thank you for reaching out. We have received your inquiry and will contact you shortly.
                  </p>
                  <div className="flex flex-col w-full sm:w-auto gap-4">
                    <button onClick={() => setSuccess(false)} className="px-8 py-4 rounded-full border-2 border-[#e2e8f0] text-[#475569] text-[16px] font-bold hover:bg-[#f8fafc] transition-colors">
                      Send another message
                    </button>
                    <Link href="/" className="px-8 py-4 rounded-full bg-[#0033A0] text-white text-[16px] font-bold hover:bg-[#002080] transition-colors shadow-lg shadow-[#0033A0]/20">
                      Back to Home
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={handleSubmit} className="space-y-6">
                  
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <input type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Parent's Name *" className={inputCls} />
                    </div>
                    <div>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address *" className={inputCls} />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number (Optional)" className={inputCls} />
                    </div>
                    <div>
                      <input type="text" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Child's Name (Optional)" className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <AgeDropdown value={childAge} onChange={setChildAge} />
                  </div>

                  <div>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      placeholder="What would you like to know? *"
                      className={`${inputCls} resize-none`}
                    />
                  </div>

                  {error && (
                    <div className="bg-[#fef2f2] text-[#e11d48] px-5 py-4 rounded-2xl text-[15px] font-bold flex items-center gap-3">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {error}
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-5 rounded-2xl bg-gradient-to-r from-[#0033A0] to-[#0047df] text-white text-[17px] font-extrabold hover:to-[#0033A0] disabled:opacity-60 transition-all shadow-[0_12px_32px_rgba(0,51,160,0.3)] hover:shadow-[0_16px_40px_rgba(0,51,160,0.4)] hover:-translate-y-1 flex items-center justify-center gap-3"
                    >
                      {submitting ? (
                        <>
                          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Sending...
                        </>
                      ) : (
                        "Send Message"
                      )}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Quick Contact Pills below form */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }} className="mt-12 flex flex-wrap items-center justify-center gap-4 text-[#64748b]">
            <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-black/5 text-[14px] font-bold">
              <span className="text-xl leading-none">📧</span> info@merryexplorers.ph
            </div>
            <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-black/5 text-[14px] font-bold">
              <span className="text-xl leading-none">📞</span> +63 917 123 4567
            </div>
          </motion.div>

        </div>
      </main>
    </motion.div>
  );
}
