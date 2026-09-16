"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { m, useReducedMotion } from "framer-motion";

interface GalleryPhoto {
  id: string;
  imageUrl: string;
  caption: string;
  isPortrait?: boolean;
}

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
    const rotations = [-2, 1.5, -1.5, 2, -1, 1];
    return rotations[index % rotations.length];
  };

  return (
    <section id="gallery" className="relative overflow-hidden py-16 sm:py-24 bg-[#f8fafc]">
      <span id="about" className="absolute -top-24" />
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230033A0' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />

      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
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
            className="mb-3 inline-block text-3xl"
          >
            🧭
          </m.span>
          <h2 className="font-headline text-[32px] font-extrabold tracking-tight text-[#0033A0] sm:text-[42px]">
            Adventure Moments
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] sm:text-[16px] font-medium leading-relaxed text-[#0066CC]">
            Snapshots and special events from our little explorers&apos; everyday journeys.
          </p>
        </m.div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <span className="text-[#64748b] animate-pulse">Loading adventure moments...</span>
          </div>
        ) : displayPhotos.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-[#e2e8f4] bg-white/70 p-8 text-center">
            <span className="text-4xl mb-3">📸</span>
            <p className="text-[16px] font-bold text-[#0033A0]">Exciting Adventures Coming Soon!</p>
            <p className="mt-1 text-[13px] font-medium text-[#64748b]">Our newest event memories and classroom moments will appear right here.</p>
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
                className="group relative flex flex-col rounded-[2rem] bg-white p-4 pb-6 shadow-[0_15px_40px_-15px_rgba(0,51,160,0.08)] border border-slate-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_25px_50px_-12px_rgba(0,51,160,0.15)] break-inside-avoid"
                style={{ rotate: reduce ? 0 : getRotation(i) }}
              >
                {/* Washi tape aesthetic pin */}
                <div 
                  className="absolute -top-3 left-1/2 h-5 w-20 -translate-x-1/2 rounded-sm bg-[#FFC107]/40 shadow-xs backdrop-blur-xs border-x border-[#FFB800]/50" 
                  aria-hidden 
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

                {/* Event title — the caption the admin typed */}
                <div className="mt-4 px-1">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-[18px]">🎒</span>
                    <div className="min-w-0">
                      <p className="font-headline text-[15px] font-extrabold text-[#0033A0] leading-snug">
                        {photo.caption && photo.caption.trim() !== ""
                          ? photo.caption
                          : "Adventure Moment"}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">
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
    </section>
  );
}
