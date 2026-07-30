"use client";

import { motion } from "framer-motion";
import { MISSION_VISION_PURPOSE } from "@/data/landing";

export function MissionVisionSection() {
  return (
    <section id="mission" className="relative py-16 sm:py-24 overflow-hidden">
      {/* Decorative blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-[400px] w-[400px] rounded-full bg-[#0033A0] opacity-[0.04] blur-[100px]" />
        <div className="absolute -right-32 bottom-1/4 h-[400px] w-[400px] rounded-full bg-[#FFB800] opacity-[0.06] blur-[100px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-14 text-center"
        >
          <motion.span
            animate={{ scale: [1, 1.18, 1], rotate: [0, 8, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="mb-3 inline-block text-4xl"
          >
            🕊️
          </motion.span>
          <h2 className="font-headline text-[32px] font-extrabold tracking-tight text-[#0033A0] sm:text-[42px]">
            Who We Are
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] font-medium leading-relaxed text-[#0066CC]">
            Rooted in faith, driven by love — our promise to every child and family.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-3">
          {MISSION_VISION_PURPOSE.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.65,
                delay: i * 0.14,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ y: -6, transition: { duration: 0.22 } }}
              className="group relative flex flex-col overflow-hidden rounded-[2rem] bg-white/80 backdrop-blur-xl border border-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.07)] hover:shadow-[0_24px_64px_-10px_rgba(0,51,160,0.10)] transition-shadow"
            >
              {/* Coloured top bar */}
              <div
                className="h-2 w-full"
                style={{ backgroundColor: item.accent }}
              />

              {/* Body */}
              <div className="flex flex-1 flex-col p-7">
                {/* Label pill */}
                <div className="mb-5 flex items-center gap-3">
                  <motion.span
                    animate={{ rotate: [0, 12, -12, 0] }}
                    transition={{
                      duration: 3.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.5,
                    }}
                    className="text-3xl"
                  >
                    {item.emoji}
                  </motion.span>
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em]"
                    style={{
                      backgroundColor: item.accentSoft,
                      color: item.accent,
                    }}
                  >
                    {item.label}
                  </span>
                </div>

                <h3
                  className="mb-3 font-headline text-[20px] font-extrabold leading-tight tracking-tight"
                  style={{ color: item.accent }}
                >
                  {item.title}
                </h3>

                <p className="text-[14px] font-medium leading-[1.75] text-[#475569]">
                  {item.body}
                </p>
              </div>

              {/* Soft glow in corner on hover */}
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-30"
                style={{ backgroundColor: item.accent }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
