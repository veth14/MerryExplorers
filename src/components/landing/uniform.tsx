"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { UNIFORM } from "@/data/landing";

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-4 w-4 flex-shrink-0"
  >
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
      clipRule="evenodd"
    />
  </svg>
);

export function UniformSection() {
  return (
    <section id="uniform" className="relative py-16 sm:py-24 overflow-hidden">
      {/* Background accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#f0f5ff]/60 via-white to-white"
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <motion.span
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="mb-3 inline-block text-4xl"
          >
            👕
          </motion.span>
          <h2 className="font-headline text-[32px] font-extrabold tracking-tight text-[#0033A0] sm:text-[40px]">
            School Uniform
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] font-medium leading-relaxed text-[#0066CC]">
            Look the part while exploring the world!
          </p>
        </motion.div>

        {/* Card */}
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[2.5rem] bg-white/90 backdrop-blur-xl border border-white shadow-[0_24px_72px_-16px_rgba(0,51,160,0.10)] flex flex-col sm:flex-row"
          >
            {/* Left — Image */}
            <div className="relative flex-shrink-0 sm:w-72 lg:w-80">
              <div className="relative h-80 w-full sm:h-full">
                <Image
                  src="/Uniform.jpg"
                  alt="Merry Explorers optional uniform — white polo shirt and navy jogging pants"
                  fill
                  sizes="(max-width: 640px) 100vw, 320px"
                  className="object-contain object-top"
                  onError={(e) => {
                    // Graceful fallback: hide broken img
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                {/* Gradient overlay on the right edge to blend into card */}
                <div className="absolute inset-y-0 right-0 hidden w-12 bg-gradient-to-r from-transparent to-white/80 sm:block" />
              </div>
            </div>

            {/* Right — Details */}
            <div className="flex flex-1 flex-col justify-center gap-6 p-8 sm:pl-10">
              {/* Optional badge */}
              <span className="inline-flex w-fit items-center rounded-full border border-[#FFB800]/40 bg-[#FFF8E1] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#B8860B]">
                {UNIFORM.note}
              </span>

              {/* Price */}
              <div>
                <p className="text-[13px] font-bold uppercase tracking-widest text-[#94a3b8]">
                  Price per Set
                </p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-headline text-[52px] font-extrabold leading-none text-[#0033A0]">
                    {UNIFORM.price}
                  </span>
                  <span className="text-[18px] font-bold text-[#64748b]">
                    {UNIFORM.unit}
                  </span>
                </div>
              </div>

              {/* Items list */}
              <div>
                <p className="mb-3 text-[13px] font-bold uppercase tracking-widest text-[#94a3b8]">
                  Includes
                </p>
                <ul className="flex flex-col gap-2.5">
                  {UNIFORM.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2.5 text-[15px] font-semibold text-[#0033A0]"
                    >
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#E1ECFF] text-[#0033A0]">
                        <CheckIcon />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Decorative tagline */}
              <p className="text-[13px] font-medium italic text-[#94a3b8]">
                Dress them up for their next great adventure! 🌟
              </p>
            </div>

            {/* Corner glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-[#FFB800] opacity-10 blur-3xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}