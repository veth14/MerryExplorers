"use client";

import Link from "next/link";
import Image from "next/image";
import { m } from "framer-motion";
import { PlayfulStar, PlayfulCloud, PlayfulRainbow } from "./playful-decorations";

export function DiscoverFitSection() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 px-4">
      {/* Decorative background grid (consistent with other sections) */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230033A0' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      {/* Playful Floating Accents */}
      <div className="absolute top-10 left-6 pointer-events-none z-0 hidden lg:block opacity-90">
        <PlayfulRainbow width={105} />
      </div>
      <div className="absolute top-14 right-10 sm:right-28 pointer-events-none z-0 hidden sm:block">
        <PlayfulStar size={28} rotate={12} />
      </div>
      <div className="absolute bottom-8 left-12 pointer-events-none z-0 hidden md:block opacity-75">
        <PlayfulCloud width={130} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">

        {/* Left Side: Text and CTA */}
        <div className="flex-1 text-center md:text-left">
          <m.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#F0F9FF] border border-[#7DD3FC]/60 px-4 py-1.5 font-fredoka text-xs font-semibold uppercase tracking-wider text-[#0033A0] shadow-sm">
              🗺️ Play &amp; Learning Fit Guide
            </div>

            <h2 className="font-fredoka text-[36px] sm:text-[46px] font-bold text-[#002f76] leading-tight mb-4">
              Find the Perfect Playgroup Fit
            </h2>

            <p className="text-base text-[#64748B] max-w-md mx-auto md:mx-0 leading-relaxed mb-8 font-medium">
              Not sure which program fits your little explorer? Take our quick interactive quiz to discover the ideal learning and play path for your child.
            </p>

            <Link
              href="/discovery-day"
              className="inline-flex items-center gap-3 rounded-2xl bg-[#FFC107] px-8 py-4 font-fredoka text-lg font-bold text-[#0a1835] shadow-[0_8px_20px_rgba(255,193,7,0.3)] transition-all hover:bg-[#ffb800] hover:shadow-[0_12px_24px_rgba(255,193,7,0.4)] hover:-translate-y-1 active:scale-95 ring-4 ring-white"
            >
              <span>Take the Program Fit Quiz</span>
              <span className="text-2xl">&#8594;</span>
            </Link>
          </m.div>
        </div>

        {/* Right Side: Kid Student Image */}
        <div className="flex-1 flex justify-center md:justify-end relative">
          <m.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            animate={{ y: [0, -10, 0] }}
            // @ts-ignore
            transition={{ y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
            className="relative"
          >
            <div className="relative z-10 drop-shadow-2xl pointer-events-none select-none">
              <Image
                src="/images/student_withoutbg.png"
                alt="Realistic kid student"
                width={420}
                height={420}
                className="object-contain mix-blend-multiply"
                priority
              />
            </div>
            {/* Playful accent */}
            <m.div
              animate={{ rotate: [-10, 10, -10] }}
              // @ts-ignore
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-4 -left-4 text-5xl"
            >
              ✨
            </m.div>
            <m.div
              animate={{ scale: [1, 1.1, 1] }}
              // @ts-ignore
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 right-0 text-6xl"
            >
              🔍
            </m.div>
          </m.div>
        </div>

      </div>
    </section>
  );
}
