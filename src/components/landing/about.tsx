"use client";

import Image from "next/image";
import { m, useReducedMotion } from "framer-motion";

const MOMENTS = [
  { id: "storytelling",    title: "Creative Playtime", image: "/IMAGE3.jpg" },
  { id: "learning-sunset", title: "Building Dreams",   image: "/IMAGE2.jpg" },
  { id: "team-learning",   title: "Happy Hearts",      image: "/IMAGE1.jpg" },
];

const ROTATIONS = [-3, 3, -3];

export function AboutSection() {
  const reduce = useReducedMotion();

  return (
    <section id="about" className="relative overflow-hidden py-16 sm:py-24">
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230033A0' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />

      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
        <m.div
          initial={reduce ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12 text-center"
        >
          <m.span
            animate={reduce ? {} : { rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mb-3 inline-block text-3xl"
          >
            📸
          </m.span>
          <h2 className="font-headline text-[32px] font-extrabold tracking-tight text-[#0033A0] sm:text-[40px]">
            Joyful Moments
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] font-medium leading-relaxed text-[#0066CC]">
            Glimpses of everyday magic and learning.
          </p>
        </m.div>

        <div className="grid gap-8 sm:grid-cols-3">
          {MOMENTS.map((moment, i) => (
            <m.div
              key={moment.id}
              initial={reduce ? false : { opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: "easeOut" }}
              className="group relative flex flex-col bg-white/95 p-3 pb-5 rounded-md shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-white cursor-pointer transition-transform duration-300 hover:-translate-y-2"
              style={{ rotate: ROTATIONS[i] }}
            >
              <div className="relative w-full overflow-hidden rounded-sm" style={{ aspectRatio: "4/3" }}>
                <Image
                  src={moment.image}
                  alt={moment.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="mt-4 text-center">
                <p className="font-headline text-[14px] font-bold text-[#0033A0]">{moment.title}</p>
              </div>
              <div className="absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 bg-white/40 shadow-sm ring-1 ring-black/5" />
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
}
