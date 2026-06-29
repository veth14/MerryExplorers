"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const MOMENTS = [
  {
    id: "storytelling",
    title: "Creative Playtime",
    image: "/joyful-storytelling.png",
  },
  {
    id: "learning-sunset",
    title: "Building Dreams",
    image: "/golden-sunset.png",
  },
  {
    id: "team-learning",
    title: "Happy Hearts",
    image: "/learning-concept.png",
  },
];

export function AboutSection() {
  return (
    <section id="about" className="relative overflow-hidden bg-white py-16 sm:py-24">
      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mb-3 inline-block text-3xl text-[#0b1a3d]"
          >
            📸
          </motion.span>
          <h2 className="font-headline text-[32px] font-extrabold tracking-tight text-[#0033A0] sm:text-[40px]">
            Joyful Moments
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] font-medium leading-relaxed text-[#0066CC]">
            Glimpses of everyday magic and learning.
          </p>
        </motion.div>

        {/* Photo cards */}
        <div className="grid gap-8 sm:grid-cols-3">
          {MOMENTS.map((moment, i) => {
            // Apply slight tilt to cards: left tilts left, middle tilts right, right tilts left
            const rotation = i === 1 ? 3 : -3;
            return (
              <motion.div
                key={moment.id}
                initial={{ opacity: 0, y: 32, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, rotate: 0, scale: 1.02, transition: { duration: 0.25 } }}
                className="group relative flex flex-col bg-white p-3 pb-5 rounded-md shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] ring-1 ring-black/5"
                style={{ rotate: rotation }}
              >
                {/* Polaroid Image */}
                <div 
                  className="relative w-full overflow-hidden rounded-sm"
                  style={{ aspectRatio: "4/3" }}
                >
                  <Image
                    src={moment.image}
                    alt={moment.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                {/* Caption */}
                <div className="mt-4 text-center">
                  <p className="font-headline text-[14px] font-bold text-[#0033A0]">
                    {moment.title}
                  </p>
                </div>
                
                {/* Tape accent */}
                <div className="absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 bg-white/40 backdrop-blur-sm shadow-sm ring-1 ring-black/5" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
