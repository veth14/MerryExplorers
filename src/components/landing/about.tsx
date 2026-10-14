"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { m, useReducedMotion } from "framer-motion";
import { WashiTape, PlayfulStar, PlayfulCloud, CloudPuffsDivider } from "./playful-decorations";

interface GalleryPhoto {
  id: string;
  imageUrl: string;
  caption: string;
  isPortrait?: boolean;
}

const TAPE_COLORS = ["#ffd23f", "#8fd3f7", "#fed7aa", "#fbcfe8", "#bbf7d0"];

export function AboutSection() {
  const reduce = useReducedMotion();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGallery() {
      try {
        const res = await fetch("/api/gallery");
        const data = await res.json();
        if (data.success) {
          setPhotos(data.data);
        }
      } catch (err) {
        console.error("Failed to load gallery");
      } finally {
        setLoading(false);
      }
    }
    fetchGallery();
  }, []);

  // Limit to max 7 photos on the landing page highlights
  const displayPhotos = photos.slice(0, 7);

  // Subtle tilt for polaroid feel
  const getRotation = (index: number) => {
    const rotations = [-2.5, 2, -1.8, 2.2, -1.2, 1.5];
    return rotations[index % rotations.length];
  };

  return (
    <section id="gallery" className="relative overflow-hidden pt-12 pb-16 sm:py-24">
      <span id="about" className="absolute -top-24" />
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230033A0' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />

      {/* Decorative stars & cloud */}
      <div className="absolute top-10 left-8 z-10 pointer-events-none hidden md:block">
        <PlayfulStar size={30} rotate={15} />
      </div>
      <div className="absolute top-14 right-8 z-10 pointer-events-none hidden lg:block opacity-75">
        <PlayfulCloud width={140} />
      </div>
      <div className="absolute top-16 right-10 z-10 pointer-events-none hidden md:block">
        <PlayfulStar size={24} rotate={-20} delay={0.6} />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8 z-10">
        <m.div
          initial={reduce ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12 text-center sm:mb-16"
        >
          <m.span
            animate={reduce ? {} : { rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mb-2 inline-block text-3xl"
          >
            📸
          </m.span>
          <h2 className="font-fredoka text-[34px] sm:text-[44px] font-bold tracking-normal text-[#002f76]">
            Everyday Adventure Moments
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-[15px] sm:text-[16px] font-medium leading-relaxed text-[#5b7294]">
            Joyful smiles, sensory discoveries, and little milestones from our playgroup family.
          </p>
        </m.div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <span className="font-fredoka text-[#64748b] animate-pulse">Loading adventure moments...</span>
          </div>
        ) : displayPhotos.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-[#bfe0fb] bg-white/80 p-8 text-center shadow-sm">
            <span className="text-4xl mb-3">🎨</span>
            <p className="font-fredoka text-[18px] font-bold text-[#0033A0]">Exciting Adventures Coming Soon!</p>
            <p className="mt-1 text-[13.5px] font-medium text-[#64748b]">Our newest event memories and classroom moments will appear right here.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8 pb-8">
            {displayPhotos.map((photo, i) => (
              <m.div
                key={photo.id}
                initial={reduce ? false : { opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.1, ease: "easeOut" }}
                className="group relative flex flex-col rounded-[2rem] bg-white p-4 pb-6 shadow-[0_15px_40px_-15px_rgba(0,51,160,0.1)] border-2 border-white hover:border-[#bfe0fb] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_25px_50px_-12px_rgba(0,51,160,0.18)] break-inside-avoid"
                style={{ rotate: reduce ? 0 : getRotation(i) }}
              >
                {/* Washi tape aesthetic pin */}
                <WashiTape
                  color={TAPE_COLORS[i % TAPE_COLORS.length]}
                  width={75}
                  tilt={i % 2 === 0 ? -5 : 5}
                  className="-top-3 left-1/2 -translate-x-1/2"
                />

                {/* Photo container */}
                <div className={`relative w-full overflow-hidden rounded-2xl bg-slate-100 ${photo.isPortrait ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}>
                  <Image
                    src={photo.imageUrl}
                    alt={photo.caption || "Merry Explorers Event Photo"}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>

                {/* Event title */}
                <div className="mt-4 px-1">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-[18px]">🎒</span>
                    <div className="min-w-0">
                      <p className="font-fredoka text-[16px] font-semibold text-[#0033A0] leading-snug">
                        {photo.caption && photo.caption.trim() !== ""
                          ? photo.caption
                          : "Adventure Moment"}
                      </p>
                      <p className="mt-0.5 text-[11.5px] font-semibold text-[#94a3b8] uppercase tracking-wider font-fredoka">
                        Merry Explorers · #{i + 1}
                      </p>
                    </div>
                  </div>
                </div>
              </m.div>
            ))}
          </div>
        )}
      </div>

      {/* Cloud Puffs Transition Divider at the bottom */}
      <div className="mt-8 w-full">
        <CloudPuffsDivider fill="#ffffff" />
      </div>
    </section>
  );
}
