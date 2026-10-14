"use client";

import { m, useReducedMotion } from "framer-motion";
import { HIGHLIGHTS } from "@/data/landing";
import { HighlightIcon } from "./icons";
import { WashiTape } from "./playful-decorations";

const ICON_CONFIG: Record<string, { color: string; bg: string; tape: string }> = {
  book:   { color: "#0066CC", bg: "#E8F0FF", tape: "#ffd23f" },
  heart:  { color: "#FFB800", bg: "#FFF8E1", tape: "#8fd3f7" },
  puzzle: { color: "#339933", bg: "#E8F5E8", tape: "#fed7aa" },
  shield: { color: "#FFC107", bg: "#FFF5CC", tape: "#fbcfe8" },
};

export function HighlightsSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative py-12 sm:py-20 bg-gradient-to-b from-white via-[#fcfdff] to-[#f8fbfe]">
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230033A0' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />

      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 relative z-10">
        {/* Playgroup Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <span className="font-fredoka text-[13px] font-semibold uppercase tracking-wider text-[#0050d5] bg-[#edf5ff] px-4 py-1.5 rounded-full inline-block mb-3 border border-[#d6e7ff] shadow-sm">
            ✨ Hands-on · Sensory · Social
          </span>
          <h2 className="font-fredoka text-[32px] sm:text-[42px] font-bold text-[#002f76] tracking-normal">
            Why Little Explorers Love It Here
          </h2>
          <p className="mt-2 text-[15px] sm:text-[16px] text-[#5b7294] max-w-xl mx-auto font-medium">
            Where guided sensory play and gentle structure come together to build happy, confident learners.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((item, i) => {
            const cfg = ICON_CONFIG[item.icon] ?? { color: "#0066CC", bg: "#E8F0FF", tape: "#ffd23f" };
            return (
              <m.div
                key={item.title}
                initial={reduce ? false : { opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                whileHover={{ y: -6, transition: { duration: 0.2, ease: "easeOut" } }}
                className="group relative flex flex-col items-center gap-4 rounded-[2.2rem] bg-white border-2 border-[#e8f1fa] px-6 py-9 text-center shadow-[0_16px_40px_-15px_rgba(0,51,160,0.08)] hover:border-[#bfe0fb] hover:shadow-[0_20px_50px_-10px_rgba(0,51,160,0.14)] transition-all cursor-default"
              >
                {/* Washi tape pin on card top */}
                <WashiTape
                  color={cfg.tape}
                  width={68}
                  tilt={i % 2 === 0 ? -4 : 4}
                  className="-top-3 left-1/2 -translate-x-1/2"
                />

                <div
                  className="flex h-16 w-16 items-center justify-center rounded-3xl transition-transform duration-300 group-hover:scale-110 shadow-sm ring-4 ring-white"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                >
                  <HighlightIcon name={item.icon} className="h-8 w-8" />
                </div>
                <h3 className="font-fredoka text-[18px] font-semibold text-[#0033A0] leading-snug">
                  {item.title}
                </h3>
                <p className="text-[13.5px] font-medium leading-relaxed text-[#64748b]">
                  {item.description}
                </p>
              </m.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}