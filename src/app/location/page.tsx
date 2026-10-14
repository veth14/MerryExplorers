"use client";

import { m } from "framer-motion";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { WashiTape, PlayfulSun, PlayfulStar } from "@/components/landing/playful-decorations";

export default function LocationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf6ff]/50 via-[#fcfdff] to-[#f8fafc] flex flex-col relative overflow-hidden">
      {/* Universal Floating Pill Header */}
      <SiteHeader />

      {/* Playgroup Background Accents */}
      <div className="absolute top-20 right-6 sm:top-24 sm:right-16 z-0 pointer-events-none opacity-85">
        <PlayfulSun size={110} />
      </div>
      <div className="absolute top-52 left-8 z-0 pointer-events-none hidden md:block">
        <PlayfulStar size={26} rotate={15} />
      </div>

      {/* Main */}
      <main className="relative z-10 flex-grow px-5 pt-32 pb-16 sm:pt-40 sm:pb-24">
        <div className="mx-auto w-full max-w-5xl">
          {/* Header */}
          <m.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="font-fredoka text-[13px] font-semibold uppercase tracking-wider text-[#0050d5] bg-[#edf5ff] px-4 py-1.5 rounded-full inline-block mb-3 border border-[#d6e7ff] shadow-sm">
              📍 Finding Your Way to Play
            </span>
            <h1 className="font-fredoka text-[42px] sm:text-[54px] font-bold leading-[1.1] tracking-normal text-[#002f76] mb-3">
              Our Learning Center
            </h1>
            <p className="text-[16px] sm:text-[17px] font-medium text-[#5b7294] max-w-lg mx-auto leading-relaxed">
              Come visit our vibrant classrooms and sensory play spaces in Camarin, Caloocan!
            </p>
          </m.div>

          {/* Map + Info Grid */}
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="grid gap-6 lg:grid-cols-3"
          >
            {/* Google Map embed */}
            <div className="lg:col-span-2 bg-white/90 backdrop-blur-2xl rounded-[2.2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,51,160,0.08)] border-2 border-white p-2">
              <iframe
                title="Merry Explorers Playgroup & Learning Center - Camarin Branch"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241.14338103979125!2d121.03912380245823!3d14.752453760449407!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b167ed97ca21%3A0xd5340892863a5e4d!2sMerry%20Explorers%20Playgroup%20%26%20Learning%20Center-%20Camarin%20Branch!5e0!3m2!1sen!2sph!4v1785136891760!5m2!1sen!2sph"
                width="100%"
                height="420"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                className="w-full rounded-[1.8rem]"
              />
            </div>

            {/* Info Panel */}
            <div className="flex flex-col gap-5">
              <div className="relative bg-white/90 backdrop-blur-2xl rounded-[2.2rem] p-7 shadow-[0_20px_50px_rgba(0,51,160,0.08)] border-2 border-white flex-1 flex flex-col justify-between">
                <WashiTape color="#ffd23f" width={70} tilt={-3} className="-top-3 left-1/2 -translate-x-1/2" />
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#e8f0fe] flex items-center justify-center text-2xl mb-4 shadow-inner">🎪</div>
                  <h3 className="font-fredoka text-[22px] font-bold text-[#0033A0] mb-1">Merry Explorers</h3>
                  <p className="font-fredoka text-[13px] font-semibold text-[#FFB800] uppercase tracking-wider mb-4">Camarin Center</p>
                  <p className="text-[14.5px] font-semibold text-[#475569] leading-relaxed">
                    Unit C, 2nd Floor, B13 L33<br />
                    Camarin Rd., North, Caloocan<br />
                    1421 Metro Manila<br />
                    <span className="text-[12.5px] text-[#94a3b8]">(Near Camarin Doctors Hospital)</span>
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🕘</span>
                    <div>
                      <p className="font-fredoka text-[13.5px] font-semibold text-[#0033A0]">Center &amp; Playgroup Hours</p>
                      <p className="text-[13px] font-medium text-[#64748b]">Mon–Fri, 10AM–5PM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📱</span>
                    <div>
                      <p className="font-fredoka text-[13.5px] font-semibold text-[#0033A0]">Phone &amp; Inquiries</p>
                      <a href="tel:+639477820606" className="text-[13px] font-bold text-[#0066CC] hover:text-[#FFC107] transition-colors">
                        (0947) 782 0606
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Open in Maps button */}
              <a
                href="https://www.google.com/maps/search/Unit+C,+2nd+floor,+B13+L33+Camarin+Rd,+North,+Caloocan,+1421+Metro+Manila"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 rounded-full bg-[#0033A0] px-8 py-4 font-fredoka text-[16px] font-bold text-white shadow-[0_12px_32px_rgba(0,51,160,0.3)] hover:bg-[#002880] hover:shadow-[0_16px_40px_rgba(0,51,160,0.4)] transition-all hover:-translate-y-1 ring-4 ring-white"
              >
                🗺️ Open in Google Maps
              </a>
            </div>
          </m.div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
