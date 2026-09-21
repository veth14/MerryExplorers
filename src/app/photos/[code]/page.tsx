"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";

interface Photo {
  url: string;
  caption: string;
}

interface AlbumData {
  accessCode: string;
  childFirstName: string;
  childNickname: string;
  programName: string;
  classTime: string;
  sessionLabel: string;
  sessionDate: string;
  note: string;
  photos: Photo[];
  expiresAt: string;
  createdAt: string;
}

function timeUntilExpiry(expiresAt: string): { label: string; hoursLeft: number } {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { label: "Expired", hoursLeft: 0 };
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  if (days > 0) return { label: `${days}d ${remH}h left`, hoursLeft: hours };
  return { label: `${hours}h left`, hoursLeft: hours };
}

export default function PublicPhotoAlbumPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [data, setData] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/photo-albums/${code}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error || "Failed to load album");
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [code]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxIndex !== null) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [lightboxIndex]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null || !data) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") setLightboxIndex(prev => prev! > 0 ? prev! - 1 : data.photos.length - 1);
      if (e.key === "ArrowRight") setLightboxIndex(prev => prev! < data.photos.length - 1 ? prev! + 1 : 0);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f6ff] flex items-center justify-center flex-col gap-4">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#0033A0]/20 border-t-[#0033A0]" />
        <p className="text-[14px] font-bold text-[#0033A0]">Loading photos…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f0f6ff] flex items-center justify-center p-6">
        <m.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl p-8 text-center shadow-xl shadow-[#0033A0]/5"
        >
          <div className="text-5xl mb-4">🕐</div>
          <h1 className="font-headline text-[22px] font-extrabold text-[#0f172a] mb-2">Link Unavailable</h1>
          <p className="text-[14px] text-[#64748b] leading-relaxed">
            {error || "This photo link may have expired or is invalid. Albums are automatically removed after 3 days to protect student privacy."}
          </p>
        </m.div>
      </div>
    );
  }

  const displayName = data.childNickname || data.childFirstName;
  const expiry = timeUntilExpiry(data.expiresAt);

  return (
    <div className="min-h-screen bg-[#f0f6ff] font-sans pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0033A0] via-[#005cc8] to-[#1a75ff] overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent" />
        
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-16 relative z-10 text-center">
          <m.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 mb-6 border border-white/20 shadow-xl">
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0">
               <Image src="/LOGO.jpg" alt="Logo" width={24} height={24} className="object-contain" />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white">Merry Explorers</span>
          </m.div>

          <m.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="font-headline text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4 drop-shadow-sm"
          >
            📸 {displayName}'s<br className="sm:hidden" /> Highlights
          </m.h1>
          
          <m.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-[15px] sm:text-[17px] font-medium text-blue-100 max-w-xl mx-auto drop-shadow-sm"
          >
            {data.sessionLabel} · {data.programName}
          </m.p>

          <m.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <div className="inline-flex items-center gap-2 bg-[#FFC107] text-[#003399] px-5 py-2.5 rounded-full font-extrabold text-[13px] shadow-lg shadow-[#FFC107]/20">
              <span>✨</span> {data.photos.length} special moment{data.photos.length !== 1 ? "s" : ""}
            </div>
            <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-[12px] shadow-lg ${
              expiry.hoursLeft < 24 ? "bg-red-500/90 text-white backdrop-blur-md" : "bg-black/20 text-white backdrop-blur-md"
            }`}>
              ⏰ Available for {expiry.label}
            </div>
          </m.div>
        </div>
        
        {/* Curvy bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-8 sm:h-12 bg-[#f0f6ff]" style={{ borderTopLeftRadius: "50% 100%", borderTopRightRadius: "50% 100%" }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 sm:mt-12 space-y-12">
        
        {/* Note from Teacher */}
        {data.note && (
          <m.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-[#0033A0]/5 border border-slate-100 relative">
              <div className="absolute -top-4 -left-2 text-4xl transform -rotate-12">📝</div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#0033A0]/50 mb-3 ml-6 sm:ml-8">Note from Teacher</p>
              <p className="text-[15px] sm:text-[17px] text-[#334155] leading-relaxed font-medium ml-0 sm:ml-8">"{data.note}"</p>
            </div>
          </m.div>
        )}

        {/* Photo Grid (Masonry style) */}
        <div>
          <div className="text-center mb-8">
            <h2 className="font-headline text-[24px] font-extrabold text-[#0033A0]">Photo Gallery</h2>
            <p className="text-[14px] text-[#64748b] mt-1">Tap any photo to view full size</p>
          </div>
          
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-6 space-y-4 sm:space-y-6">
            {data.photos.map((photo, i) => (
              <m.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="break-inside-avoid"
              >
                <div
                  className="group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-200 cursor-zoom-in shadow-lg shadow-black/5"
                  onClick={() => setLightboxIndex(i)}
                >
                  <Image
                    src={photo.url}
                    alt={photo.caption || `Photo ${i + 1}`}
                    width={800}
                    height={800}
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-[13px] font-medium leading-snug drop-shadow-md">{photo.caption}</p>
                    </div>
                  )}
                </div>
              </m.div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <m.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center"
          >
            <div className="absolute inset-0" onClick={() => setLightboxIndex(null)} />
            
            {/* Close */}
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md"
            >
              ✕
            </button>

            {/* Prev */}
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev! > 0 ? prev! - 1 : data.photos.length - 1); }}
              className="absolute left-2 sm:left-6 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors backdrop-blur-md"
            >
              ←
            </button>

            {/* Next */}
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev! < data.photos.length - 1 ? prev! + 1 : 0); }}
              className="absolute right-2 sm:right-6 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors backdrop-blur-md"
            >
              →
            </button>

            {/* Main Image */}
            <m.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-0 max-w-5xl max-h-[85vh] w-full h-full p-4 sm:p-12 flex flex-col items-center justify-center pointer-events-none"
            >
              <div className="relative w-full h-full flex items-center justify-center pointer-events-auto">
                <Image
                  src={data.photos[lightboxIndex].url}
                  alt={data.photos[lightboxIndex].caption || `Photo ${lightboxIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  quality={90}
                  priority
                />
              </div>
              
              {/* Caption */}
              {data.photos[lightboxIndex].caption && (
                <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md rounded-2xl px-6 py-3 max-w-xl text-center pointer-events-auto border border-white/10">
                  <p className="text-white text-[14px] sm:text-[15px] font-medium leading-relaxed shadow-sm">
                    {data.photos[lightboxIndex].caption}
                  </p>
                </div>
              )}
              
              {/* Counter */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md rounded-full px-4 py-1.5 pointer-events-auto border border-white/10">
                <p className="text-white/80 text-[12px] font-bold tracking-widest uppercase">
                  {lightboxIndex + 1} / {data.photos.length}
                </p>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="text-center mt-20 px-6">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-lg shadow-[#0033A0]/5 mx-auto flex items-center justify-center overflow-hidden mb-4">
          <Image src="/LOGO.jpg" alt="Logo" width={32} height={32} className="object-contain" />
        </div>
        <p className="text-[12px] font-extrabold text-[#0f172a] uppercase tracking-widest mb-1">Merry Explorers Playgroup</p>
        <p className="text-[12px] font-medium text-[#94a3b8]">Learning through play, one adventure at a time.</p>
      </div>
    </div>
  );
}
