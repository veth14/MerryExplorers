"use client";

import { motion } from "framer-motion";
import { HIGHLIGHTS } from "@/data/landing";
import { HighlightIcon } from "./icons";

const ICON_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  book: { color: "#0066CC", bg: "#E8F0FF", border: "#B3D4FF" },
  heart: { color: "#FFB800", bg: "#FFF8E1", border: "#FFE082" },
  puzzle: { color: "#339933", bg: "#E8F5E8", border: "#A5D6A7" },
  shield: { color: "#FFC107", bg: "#FFF5CC", border: "#FFE082" },
};

const DISPLAY_TITLES: Record<string, string> = {
  book: "Small Group Setting",
  heart: "Caring Teachers",
  puzzle: "Fun Activities",
  shield: "Safe Environment",
};

export function HighlightsSection() {
  return (
    <section className="relative bg-white py-14 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        {/* Highlight cards row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((item, i) => {
            const cfg = ICON_CONFIG[item.icon] ?? {
              color: "#0066CC",
              bg: "#E8F0FF",
              border: "#B3D4FF",
            };
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group flex flex-col items-center gap-4 rounded-[32px] border-2 bg-white px-5 py-8 text-center transition-shadow hover:shadow-lg"
                style={{ borderColor: cfg.border }}
              >
                {/* Icon */}
                <motion.span
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                  className="flex h-16 w-16 items-center justify-center rounded-3xl"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                >
                  <HighlightIcon name={item.icon} className="h-8 w-8" />
                </motion.span>
                <h3
                  className="font-headline text-[16px] font-bold text-[#0033A0]"
                >
                  {DISPLAY_TITLES[item.icon] ?? item.title}
                </h3>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
