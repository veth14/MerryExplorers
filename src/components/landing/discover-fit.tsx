"use client";

import Link from "next/link";
import Image from "next/image";
import { m } from "framer-motion";

export function DiscoverFitSection() {
  return (
    <section className="relative overflow-hidden bg-white py-16 px-4">
      {/* Decorative Background Blob (consistent with other sections) */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[600px] h-[600px] bg-[#7DD3FC] opacity-10 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[500px] h-[500px] bg-[#FDE261] opacity-15 blur-[100px] pointer-events-none rounded-full" />

      <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">

        {/* Left Side: Text and CTA */}
        <div className="flex-1 text-center md:text-left">
          <m.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#F0F9FF] border border-[#7DD3FC]/50 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-[#0F006E]">
              🗺️ Play & Learning Fit Score
            </div>

            <h2 className="font-headline text-4xl sm:text-5xl font-extrabold text-[#0F006E] leading-tight mb-4">
              Take a Discovery
            </h2>

            <p className="text-base text-[#64748B] max-w-md mx-auto md:mx-0 leading-relaxed mb-8 font-medium">
              Not sure which program fits your little explorer? Take our quick interactive quiz to find the perfect learning path for your child.
            </p>

            <Link
              href="/discovery-day"
              className="inline-flex items-center gap-3 rounded-2xl bg-[#FDE261] px-8 py-4 text-lg font-extrabold text-[#0F006E] shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 active:scale-95"
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
