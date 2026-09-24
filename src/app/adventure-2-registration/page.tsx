"use client";

import Link from "next/link";
import { m } from "framer-motion";
import { SiteFooter } from "@/components/landing/site-footer";

export default function Adventure2RegistrationPage() {
  return (
    <div className="min-h-screen bg-[#F0F5FF] flex flex-col font-sans">
      
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/5 shadow-sm">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl transition-transform group-hover:scale-110">⛺</span>
            <span className="font-headline text-[22px] font-extrabold text-[#0033A0] tracking-tight">
              MerryExplorers
            </span>
          </Link>
          <div className="flex gap-4">
            <Link
              href="/"
              className="rounded-full px-5 py-2.5 text-[15px] font-bold text-[#475569] hover:bg-black/5 hover:text-[#0033A0] transition-colors"
            >
              Back to Home
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[#0033A0] px-6 py-2.5 text-[15px] font-bold text-white shadow-md hover:bg-[#002277] transition-all hover:-translate-y-0.5"
            >
              Register Now
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-16">
        
        {/* Header Section */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#E0E7FF] px-4 py-1.5 border border-[#818CF8]/30">
            <span className="text-[12px] font-extrabold uppercase tracking-widest text-[#4338CA]">
              Adventure 2 Registration Guide
            </span>
            <span className="text-lg">🧭</span>
          </div>
          <h1 className="font-headline text-[40px] sm:text-[52px] font-extrabold text-[#0033A0] leading-tight mb-5">
            Get Ready for the Next <span className="text-[#FFC107]">Adventure</span>
          </h1>
          <p className="text-[#475569] text-lg font-medium max-w-2xl mx-auto leading-relaxed">
            Whether your little explorer is continuing their journey with us or just joining our camp for the first time, here is everything you need to know about registering for Adventure 2.
          </p>
        </m.div>

        <div className="grid md:grid-cols-2 gap-10">
          
          {/* ── Renewing Explorers Column ── */}
          <m.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col"
          >
            <div className="bg-white rounded-[2rem] p-8 shadow-[0_20px_50px_-15px_rgba(0,51,160,0.1)] border-2 border-[#0033A0]/10 flex-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#0033A0]/5 to-transparent rounded-bl-full pointer-events-none" />
              
              <div className="flex items-center gap-4 mb-8 relative z-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0033A0] shadow-lg shadow-[#0033A0]/30 transform group-hover:scale-105 transition-transform">
                  <span className="text-3xl">🔄</span>
                </div>
                <div>
                  <h2 className="font-headline text-2xl font-extrabold text-[#0F006E]">Renewing Explorers</h2>
                  <p className="text-[14px] font-bold text-[#0066CC] uppercase tracking-wider">Currently Enrolled</p>
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E0E7FF] text-[#4338CA] font-black text-sm ring-4 ring-white">1</div>
                    <div className="w-0.5 h-full bg-[#E0E7FF] mt-2 rounded-full" />
                  </div>
                  <div className="pb-4 pt-1">
                    <h3 className="font-bold text-[#1E293B] text-lg mb-1">Secure Your Slot</h3>
                    <p className="text-[#64748B] text-[15px] leading-relaxed">
                      Confirm your child's continuation into Adventure 2 by submitting the renewal form. Your slot is guaranteed!
                    </p>
                  </div>
                </div>
                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E0E7FF] text-[#4338CA] font-black text-sm ring-4 ring-white">2</div>
                    <div className="w-0.5 h-full bg-[#E0E7FF] mt-2 rounded-full" />
                  </div>
                  <div className="pb-4 pt-1">
                    <h3 className="font-bold text-[#1E293B] text-lg mb-1">Pay the Downpayment</h3>
                    <p className="text-[#64748B] text-[15px] leading-relaxed">
                      Settle the minimum downpayment of ₱1,500 to officially lock in the spot for the upcoming adventure.
                    </p>
                  </div>
                </div>
                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E0E7FF] text-[#4338CA] font-black text-sm ring-4 ring-white">3</div>
                  </div>
                  <div className="pt-1">
                    <h3 className="font-bold text-[#1E293B] text-lg mb-1">Adventure Awaits!</h3>
                    <p className="text-[#64748B] text-[15px] leading-relaxed">
                      Receive your new schedule and prepare your child's explorer kit for the next big milestone.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <Link
                  href="/register?type=renewal"
                  className="block w-full rounded-2xl bg-[#0033A0] py-4 text-center text-[16px] font-extrabold text-white shadow-lg transition-all hover:bg-[#002277] hover:-translate-y-1"
                >
                  Start Renewal Process
                </Link>
              </div>
            </div>
          </m.div>

          {/* ── New Explorers Column ── */}
          <m.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col"
          >
            <div className="bg-white rounded-[2rem] p-8 shadow-[0_20px_50px_-15px_rgba(255,193,7,0.15)] border-2 border-[#FFC107]/20 flex-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#FFC107]/10 to-transparent rounded-bl-full pointer-events-none" />

              <div className="flex items-center gap-4 mb-8 relative z-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFC107] shadow-lg shadow-[#FFC107]/30 transform group-hover:scale-105 transition-transform">
                  <span className="text-3xl">✨</span>
                </div>
                <div>
                  <h2 className="font-headline text-2xl font-extrabold text-[#7A4F00]">New Explorers</h2>
                  <p className="text-[14px] font-bold text-[#D97706] uppercase tracking-wider">Joining the Camp</p>
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309] font-black text-sm ring-4 ring-white">1</div>
                    <div className="w-0.5 h-full bg-[#FEF3C7] mt-2 rounded-full" />
                  </div>
                  <div className="pb-4 pt-1">
                    <h3 className="font-bold text-[#1E293B] text-lg mb-1">Submit Application</h3>
                    <p className="text-[#64748B] text-[15px] leading-relaxed">
                      Fill out the full registration form with your child's details to apply for an available slot in Adventure 2.
                    </p>
                  </div>
                </div>
                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309] font-black text-sm ring-4 ring-white">2</div>
                    <div className="w-0.5 h-full bg-[#FEF3C7] mt-2 rounded-full" />
                  </div>
                  <div className="pb-4 pt-1">
                    <h3 className="font-bold text-[#1E293B] text-lg mb-1">Wait for Confirmation</h3>
                    <p className="text-[#64748B] text-[15px] leading-relaxed">
                      Our team will review your application and confirm if there are open slots in your preferred schedule.
                    </p>
                  </div>
                </div>
                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309] font-black text-sm ring-4 ring-white">3</div>
                  </div>
                  <div className="pt-1">
                    <h3 className="font-bold text-[#1E293B] text-lg mb-1">Complete Enrollment</h3>
                    <p className="text-[#64748B] text-[15px] leading-relaxed">
                      Once approved, proceed with the enrollment fee payment and claim your child's official MerryExplorers uniform!
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <Link
                  href="/register"
                  className="block w-full rounded-2xl bg-[#FFC107] py-4 text-center text-[16px] font-extrabold text-[#7A4F00] shadow-lg transition-all hover:bg-[#FDE047] hover:-translate-y-1"
                >
                  Register as New Student
                </Link>
              </div>
            </div>
          </m.div>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
