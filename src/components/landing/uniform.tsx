"use client";

import Image from "next/image";
import { m, useReducedMotion } from "framer-motion";
import { UNIFORM } from "@/data/landing";

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SparkleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[#FFB800]">
    <path d="M12 2C12 7.52285 16.4772 12 22 12C16.4772 12 12 16.4772 12 22C12 16.4772 7.52285 12 2 12C7.52285 12 12 7.52285 12 2Z" fill="currentColor" />
  </svg>
);

export function UniformSection() {
  const reduce = useReducedMotion();

  return (
    <section id="uniform" className="relative py-20 sm:py-32 overflow-hidden bg-[#fafcff]">
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230033A0' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6">
        {/* Header */}
        <m.div
          initial={reduce ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-16 text-center"
        >
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf0fe] text-[#0066CC] shadow-inner">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
              <path d="M21.53 5.47a1.5 1.5 0 0 0-1.6-.33l-5.4 2-2.53-2.53a1.5 1.5 0 0 0-2.12 0L7.35 7.14l-5.4-2a1.5 1.5 0 0 0-1.92 1.92l1.6 5.34a1.5 1.5 0 0 0 .58.82l6.23 4.67a1.5 1.5 0 0 0 1.8 0l6.23-4.67a1.5 1.5 0 0 0 .58-.82l1.6-5.34a1.5 1.5 0 0 0-.12-1.6z" />
            </svg>
          </div>
          <h2 className="font-headline text-[36px] sm:text-[44px] font-extrabold tracking-tight text-[#0a1835]">
            School Uniform
          </h2>
          <p className="mt-4 text-[17px] font-medium text-[#64748b]">
            Look the part while exploring the world!
          </p>
        </m.div>

        {/* Card */}
        <m.div
          initial={reduce ? false : { opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-[960px] overflow-hidden rounded-[2.5rem] bg-white shadow-[0_32px_80px_-20px_rgba(0,51,160,0.12)] border border-[#eaf0fe] flex flex-col sm:flex-row"
        >
          {/* Left Content */}
          <div className="relative flex flex-1 flex-col justify-between p-10 sm:p-14 lg:p-16 z-20">
            <div>
              <m.div
                initial={reduce ? false : { opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
                className="mb-8 inline-flex items-center gap-2 rounded-full bg-[#FFF8E1] px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.15em] text-[#B8860B] shadow-sm ring-1 ring-[#FFB800]/20"
              >
                <SparkleIcon />
                <span>{UNIFORM.note}</span>
              </m.div>

              <m.div
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.22, ease: "easeOut" }}
                className="mb-10"
              >
                <h3 className="mb-2 text-[12px] font-extrabold uppercase tracking-widest text-[#94a3b8]">
                  Price per Set
                </h3>
                <div className="flex items-start">
                  <span className="mt-1.5 text-[28px] font-bold text-[#0066CC]">₱</span>
                  <span className="font-headline text-[64px] font-black leading-none tracking-tight text-[#0033A0]">
                    {UNIFORM.price.replace("₱", "")}
                  </span>
                  <span className="ml-2 mt-auto pb-2 text-[18px] font-bold text-[#64748b]">
                    {UNIFORM.unit}
                  </span>
                </div>
              </m.div>

              <m.div
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
              >
                <h3 className="mb-5 text-[12px] font-extrabold uppercase tracking-widest text-[#94a3b8]">
                  Includes
                </h3>
                <ul className="flex flex-col gap-4">
                  {UNIFORM.items.map((item) => (
                    <li key={item} className="flex items-center gap-4 text-[16px] font-bold text-[#0a1835]">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0066CC] text-white shadow-md shadow-[#0066CC]/20">
                        <CheckIcon />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </m.div>
            </div>

            <div className="mt-12 pt-8 border-t border-[#f0f4fc]">
              <p className="text-[15px] font-semibold italic text-[#64748b]">
                Dress them up for their next great adventure! 🌟
              </p>
            </div>
          </div>

          {/* Right Image */}
          <m.div
            initial={reduce ? false : { opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.1, ease: "easeOut" }}
            className="relative sm:w-[400px] lg:w-[480px] bg-[#f5f7ff] overflow-hidden flex items-center justify-center"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl opacity-60 translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#eaf0fe] rounded-full blur-3xl opacity-80 -translate-x-1/3 translate-y-1/3" />
            <div className="relative h-[400px] sm:h-[500px] lg:h-full w-full">
              <Image
                src={UNIFORM.image}
                alt="Merry Explorers Uniform"
                fill
                sizes="(max-width: 640px) 100vw, 480px"
                className="object-contain p-8 lg:p-12"
                priority
              />
            </div>
          </m.div>
        </m.div>
      </div>
    </section>
  );
}