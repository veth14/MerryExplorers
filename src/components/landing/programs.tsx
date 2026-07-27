"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PROGRAMS } from "@/data/landing";

// Program configuration matching the design
const PROGRAM_THEMES = {
  "Little Explorers": {
    bgTop: "#0066CC", // blue top
    bgBottom: "white",
    borderColor: "#0066CC",
    titleColor: "white",
    subtitleColor: "white",
    pillBg: "#FFC107", // yellow pill
    pillText: "#0033A0",
    iconLeft: "🎨",
    iconRight: "🧩",
  },
  "Tiny Explorers": {
    bgTop: "#FFC107", // yellow top
    bgBottom: "white",
    borderColor: "#FFC107",
    titleColor: "#0033A0",
    subtitleColor: "white",
    pillBg: "#0066CC", // blue pill
    pillText: "white",
    iconLeft: "🧸",
    iconRight: "🖍️",
  },
};

export function ProgramsSection() {
  return (
    <section id="programs" className="relative py-16 sm:py-24">
      <div className="relative mx-auto w-full max-w-5xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <motion.span
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mb-3 inline-block text-3xl"
          >
            🚀
          </motion.span>
          <h2 className="font-headline text-[32px] font-extrabold tracking-tight text-[#0033A0] sm:text-[40px]">
            Our Programs
          </h2>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2">
          {PROGRAMS.map((program, i) => {
            const theme = PROGRAM_THEMES[program.name as keyof typeof PROGRAM_THEMES] ?? PROGRAM_THEMES["Little Explorers"];
            
            // Define schedules based on program
            const schedules = program.name === "Little Explorers" 
              ? [
                  { icon: "☀️", label: "MORNING", symbol: "⚡", times: ["9:00 am to 10:15 am", "10:30 am to 11:45 am"] },
                  { icon: "🌙", label: "AFTERNOON", symbol: "✨", times: ["12:45 pm to 2:00 pm", "2:15 pm to 3:30 pm"] }
                ]
              : [
                  { icon: "☀️", label: "MORNING", symbol: "⚡", times: ["9:30 to 10:30 am"] },
                  { icon: "☁️", label: "AFTERNOON", symbol: "✨", times: ["1:30 to 2:30 pm"] },
                  { icon: "🌙", label: "LATE AFTERNOON", symbol: "💤", times: ["4:00 to 5:00 pm"] }
                ];

            return (
              <motion.article
                key={program.name}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.65, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4, transition: { duration: 0.25 } }}
                className="relative flex flex-col h-full overflow-hidden rounded-[2.5rem] bg-white/80 backdrop-blur-2xl border border-white text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_24px_80px_-10px_rgba(0,51,160,0.08)]"
              >
                {/* Top Half */}
                <div 
                  className="relative px-6 pb-7 pt-8"
                  style={{ backgroundColor: theme.bgTop }}
                >
                  <span className="absolute left-6 top-6 text-2xl">{theme.iconLeft}</span>
                  <span className="absolute right-6 top-6 text-2xl">{theme.iconRight}</span>
                  
                  <h3 
                    className="font-headline text-[24px] font-extrabold uppercase tracking-wider"
                    style={{ color: theme.titleColor }}
                  >
                    {program.name}
                  </h3>
                  <p 
                    className="mt-1 text-[13px] font-bold uppercase tracking-[0.15em]"
                    style={{ color: theme.subtitleColor }}
                  >
                    PLAYGROUP
                  </p>
                </div>

                {/* Overlapping Pill container */}
                <div className="relative z-10 -mt-3.5 flex justify-center">
                  <span 
                    className="whitespace-nowrap rounded-full px-5 py-1.5 text-[12px] font-bold uppercase tracking-wider shadow-sm"
                    style={{ backgroundColor: theme.pillBg, color: theme.pillText }}
                  >
                    AGES {program.name === 'Little Explorers' ? '2.6 TO 4.11 YEARS' : '1.6 TO 2.5 YEARS'} ✨
                  </span>
                </div>

                {/* Bottom Half */}
                <div className="space-y-4 p-6 pt-5 flex-1 flex flex-col">
                  {schedules.map((schedule, j) => (
                    <div 
                      key={j} 
                      className="rounded-3xl border border-black/5 p-4 text-left shadow-sm"
                      style={{ backgroundColor: "#F8FAFC" }}
                    >
                      <div className="mb-3 flex items-center gap-2 pl-1">
                        <span className="text-lg">{schedule.icon}</span>
                        <span className="text-[13px] font-bold uppercase tracking-wider text-[#0066CC]">
                          {schedule.label} <span className={j === 0 ? "text-[#FF4D6D]" : "text-[#339933]"}>{schedule.symbol}</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pl-8">
                        {schedule.times.map((time, k) => (
                          <span 
                            key={k} 
                            className="rounded-full bg-white px-3 py-1.5 text-[13px] font-bold text-[#475569] shadow-sm ring-1 ring-black/5"
                          >
                            {time}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Days/Sessions Footer */}
                <div className="bg-[#f0f5ff]/80 py-4 text-[13px] font-extrabold text-[#0033A0] tracking-wider border-t border-black/5 mt-auto">
                  {program.name === "Little Explorers" ? "12 SESSIONS - TUESDAY, THURSDAY & FRIDAY" : "8 SESSIONS - MONDAY & WEDNESDAY"}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
