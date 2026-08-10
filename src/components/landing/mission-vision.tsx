"use client";

import { m, useReducedMotion } from "framer-motion";
import { MISSION_VISION_PURPOSE } from "@/data/landing";

export function MissionVisionSection() {
  const reduce = useReducedMotion();

  return (
    <section id="mission" className="relative py-16 sm:py-24 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230033A0' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-[400px] w-[400px] rounded-full bg-[#0033A0] opacity-[0.04] blur-[100px]" />
        <div className="absolute -right-32 bottom-1/4 h-[400px] w-[400px] rounded-full bg-[#FFB800] opacity-[0.06] blur-[100px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
        <m.div
          initial={reduce ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-14 text-center"
        >
          <m.span
            animate={reduce ? {} : { scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="mb-3 inline-block text-4xl"
          >
            🕊️
          </m.span>
          <h2 className="font-headline text-[32px] font-extrabold tracking-tight text-[#0033A0] sm:text-[42px]">
            Who We Are
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] font-medium leading-relaxed text-[#0066CC]">
            Rooted in faith, driven by love — our promise to every child and family.
          </p>
        </m.div>

        <div className="grid gap-6 sm:grid-cols-3">
          {MISSION_VISION_PURPOSE.map((item, i) => (
            <m.div
              key={item.id}
              initial={reduce ? false : { opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: "easeOut" }}
              className="group relative flex flex-col overflow-hidden rounded-[2rem] bg-white/80 backdrop-blur-xl border border-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.07)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_64px_-10px_rgba(0,51,160,0.10)]"
            >
              <div className="h-2 w-full" style={{ backgroundColor: item.accent }} />
              <div className="flex flex-1 flex-col p-7">
                <div className="mb-5 flex items-center gap-3">
                  <m.span
                    animate={reduce ? {} : { rotate: [0, 12, -12, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                    className="text-3xl"
                  >
                    {item.emoji}
                  </m.span>
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em]"
                    style={{ backgroundColor: item.accentSoft, color: item.accent }}
                  >
                    {item.label}
                  </span>
                </div>
                <h3 className="mb-3 font-headline text-[20px] font-extrabold leading-tight tracking-tight" style={{ color: item.accent }}>
                  {item.title}
                </h3>
                <p className="text-[14px] font-medium leading-[1.75] text-[#475569]">{item.body}</p>
              </div>
              <div aria-hidden className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-30" style={{ backgroundColor: item.accent }} />
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
}
