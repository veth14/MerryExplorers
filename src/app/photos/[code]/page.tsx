"use client";

import { useEffect, useState, use, useCallback } from "react";
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
  const [downloading, setDownloading] = useState(false);
  const [downloadedSingle, setDownloadedSingle] = useState<number | null>(null);

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

  // Download helpers
  const downloadImage = useCallback(async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank");
    }
  }, []);

  const handleDownloadAll = useCallback(async () => {
    if (!data) return;
    setDownloading(true);
    const dName = data.childNickname || data.childFirstName;
    for (let i = 0; i < data.photos.length; i++) {
      const photo = data.photos[i];
      const ext = photo.url.split(".").pop()?.split("?")[0] || "jpg";
      await downloadImage(photo.url, `${dName}-photo-${i + 1}.${ext}`);
      await new Promise((r) => setTimeout(r, 300));
    }
    setDownloading(false);
  }, [data, downloadImage]);

  const handleDownloadSingle = useCallback(async (photo: Photo, index: number, dName: string) => {
    setDownloadedSingle(index);
    const ext = photo.url.split(".").pop()?.split("?")[0] || "jpg";
    await downloadImage(photo.url, `${dName}-photo-${index + 1}.${ext}`);
    setTimeout(() => setDownloadedSingle(null), 2000);
  }, [downloadImage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4" style={{ background: "linear-gradient(180deg, #FFF9C4 0%, #E0F4FF 60%, #fff 100%)" }}>
        <span className="text-5xl animate-bounce inline-block">🌟</span>
        <p className="text-[15px] font-extrabold text-[#0033A0]">Loading your special moments…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(180deg, #FFF9C4 0%, #E0F4FF 60%, #fff 100%)" }}>
        <m.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl p-8 text-center shadow-2xl border-4 border-[#FFC107]/30"
        >
          <div className="text-5xl mb-4">🕐</div>
          <h1 className="text-[22px] font-extrabold text-[#0f172a] mb-2">Link Unavailable</h1>
          <p className="text-[14px] text-[#64748b] leading-relaxed">
            {error || "This photo link may have expired or is invalid. Albums are automatically removed after 3 days to protect student privacy."}
          </p>
        </m.div>
      </div>
    );
  }

  const displayName = data.childNickname || data.childFirstName;
  const expiry = timeUntilExpiry(data.expiresAt);
  const shortProgram = data.programName.includes(":") ? data.programName.split(":")[1].trim() : data.programName;

  return (
    <div className="min-h-screen font-sans pb-24" style={{ background: "linear-gradient(180deg, #FFF8C0 0%, #C8E8FF 35%, #EEF6FF 70%, #F8FAFE 100%)" }}>

      {/* ── Hero / Sky ── */}
      <div className="relative overflow-hidden" style={{ minHeight: 340 }}>
        {/* Sun */}
        <div className="absolute top-6 right-8 sm:right-20 w-28 h-28 rounded-full bg-[#FFD600] opacity-75 blur-[2px] shadow-[0_0_60px_20px_rgba(255,214,0,0.30)]" />
        {/* Clouds */}
        <svg viewBox="0 0 200 80" className="absolute top-4 left-4 w-36 text-white opacity-90" fill="currentColor"><ellipse cx="100" cy="60" rx="80" ry="30" /><ellipse cx="70" cy="50" rx="50" ry="35" /><ellipse cx="130" cy="45" rx="45" ry="32" /></svg>
        <svg viewBox="0 0 200 80" className="absolute top-14 right-28 w-24 text-white opacity-70" fill="currentColor"><ellipse cx="100" cy="60" rx="80" ry="30" /><ellipse cx="70" cy="50" rx="50" ry="35" /><ellipse cx="130" cy="45" rx="45" ry="32" /></svg>
        <svg viewBox="0 0 24 24" fill="#FFD600" className="absolute top-8 left-16 w-5 opacity-70"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
        <svg viewBox="0 0 24 24" fill="#FFD600" className="absolute top-20 right-10 w-4 opacity-60"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>

        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-10 pb-20 text-center">
          <m.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md rounded-full px-4 py-1.5 mb-5 shadow-md border border-white"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
              <Image src="/LOGO.jpg" alt="Logo" width={24} height={24} className="object-contain" />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0033A0]">Merry Explorers</span>
          </m.div>

          <m.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-extrabold text-[#0033A0] tracking-tight leading-tight mb-2 drop-shadow-sm"
          >
            🎉 {displayName}'s
            <span className="block text-[#E91E8C]">Special Moments!</span>
          </m.h1>

          <m.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-[14px] sm:text-[16px] font-semibold text-[#1a3a7a] mb-6"
          >
            {data.sessionLabel} · {data.classTime}
          </m.p>

          <m.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <span className="inline-flex items-center gap-1.5 bg-[#FFC107] text-[#003399] px-5 py-2 rounded-full font-extrabold text-[13px] shadow-lg border-2 border-[#FFD600]">
              ✨ {data.photos.length} special moment{data.photos.length !== 1 ? "s" : ""}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-full font-bold text-[12px] border-2 shadow-md ${
              expiry.hoursLeft < 24
                ? "bg-red-500 text-white border-red-400"
                : "bg-white/80 text-[#0033A0] border-[#93c5fd]"
            }`}>
              ⏰ Available for {expiry.label}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-[#E8F0FF] text-[#0033A0] px-4 py-2 rounded-full font-bold text-[12px] border-2 border-[#93c5fd]">
              🎒 {shortProgram}
            </span>
          </m.div>
        </div>

        {/* Rolling hills */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full" style={{ height: 70 }}>
            <path d="M0,80 C360,20 720,60 1080,20 L1440,40 L1440,80 Z" fill="#ffffff" opacity="0.5" />
            <path d="M0,80 C480,40 960,70 1440,30 L1440,80 Z" fill="#EEF6FF" />
          </svg>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 space-y-10">

        {/* Download All Banner */}
        <m.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-3xl overflow-hidden shadow-xl border-4 border-[#FFC107]/30"
          style={{ background: "linear-gradient(135deg, #0033A0 0%, #005cc8 60%, #1a75ff 100%)" }}
        >
          <div className="px-6 py-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="text-4xl shrink-0">💾</div>
            <div className="flex-1">
              <p className="font-extrabold text-white text-[16px] leading-tight">Save these memories forever!</p>
              <p className="text-blue-200 text-[13px] mt-0.5">
                Photos will be <strong className="text-[#FFC107]">automatically deleted in {expiry.label}</strong>. Download now to keep forever!
              </p>
            </div>
            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="shrink-0 flex items-center gap-2 bg-[#FFC107] text-[#003399] px-6 py-3 rounded-2xl font-extrabold text-[14px] shadow-xl hover:bg-[#FFD600] active:scale-95 transition-all disabled:opacity-70 border-2 border-[#FFD600]"
            >
              {downloading ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#003399]/30 border-t-[#003399]" />Downloading…</>
              ) : (
                <>⬇️ Download All {data.photos.length} Photos</>
              )}
            </button>
          </div>
        </m.div>

        {/* Note from Teacher */}
        {data.note && (
          <m.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-[#FFC107]/40 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#FFC107] to-[#FFD600] rounded-t-3xl" />
              <div className="absolute -top-3 left-6 text-4xl transform -rotate-12 mt-3">📝</div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#0033A0]/50 mb-3 mt-2 ml-10">Note from Teacher</p>
              <p className="text-[15px] sm:text-[17px] text-[#334155] leading-relaxed font-medium ml-0 sm:ml-10">"{data.note}"</p>
            </div>
          </m.div>
        )}

        {/* Photo Gallery */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-[26px] sm:text-[30px] font-extrabold text-[#0033A0] mb-1">📸 Photo Gallery</h2>
            <p className="text-[14px] text-[#64748b]">Tap to view full size • Hover and click ⬇ to save individually</p>
          </div>
          
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-5 space-y-4 sm:space-y-5">
            {data.photos.map((photo, i) => (
              <m.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.04 }}
                className="break-inside-avoid"
              >
                <div className="group relative rounded-3xl overflow-hidden bg-slate-100 shadow-lg border-2 border-white hover:border-[#FFC107]/60 transition-all hover:shadow-xl">
                  <div className="cursor-zoom-in" onClick={() => setLightboxIndex(i)}>
                    <Image
                      src={photo.url}
                      alt={photo.caption || `Photo ${i + 1}`}
                      width={800}
                      height={800}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                  </div>
                  {/* Per-photo download button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownloadSingle(photo, i, displayName); }}
                    className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-[#FFC107] text-[#003399] px-3 py-1.5 text-[11px] font-extrabold shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-[#FFD600] active:scale-95 border-2 border-white"
                  >
                    {downloadedSingle === i ? "✓ Saved!" : "⬇ Save"}
                  </button>
                  {/* Photo number */}
                  <div className="absolute top-2.5 left-2.5 bg-[#0033A0]/70 backdrop-blur-sm text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-white/30">
                    {i + 1}
                  </div>
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-[12px] font-medium leading-snug drop-shadow-md">{photo.caption}</p>
                    </div>
                  )}
                </div>
              </m.div>
            ))}
          </div>
        </div>

        {/* Bottom Download CTA */}
        <m.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center py-4"
        >
          <p className="text-[13px] text-[#64748b] mb-3">Don't forget to save your photos before they expire! ⏰</p>
          <button
            onClick={handleDownloadAll}
            disabled={downloading}
            className="inline-flex items-center gap-2 bg-[#0033A0] text-white px-8 py-3.5 rounded-2xl font-extrabold text-[15px] shadow-xl hover:bg-[#002580] active:scale-95 transition-all disabled:opacity-70"
          >
            {downloading ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Downloading…</>
            ) : (
              <>⬇️ Save All Photos</>
            )}
          </button>
        </m.div>
      </div>

      {/* ── Lightbox ── */}
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
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md text-xl"
            >
              ✕
            </button>

            {/* Download in lightbox */}
            <button
              onClick={(e) => { e.stopPropagation(); handleDownloadSingle(data.photos[lightboxIndex], lightboxIndex, displayName); }}
              className="absolute top-4 right-20 sm:top-6 sm:right-24 z-10 flex items-center gap-2 bg-[#FFC107] text-[#003399] px-4 py-2 rounded-full font-extrabold text-[12px] shadow-lg hover:bg-[#FFD600] active:scale-95 transition-all"
            >
              {downloadedSingle === lightboxIndex ? "✓ Saved!" : "⬇ Save photo"}
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

      {/* ── Footer ── */}
      <div className="text-center mt-12 px-6 pb-8">
        <div className="w-14 h-14 rounded-2xl bg-white shadow-xl mx-auto flex items-center justify-center overflow-hidden mb-3 border-2 border-[#FFC107]/30">
          <Image src="/LOGO.jpg" alt="Logo" width={40} height={40} className="object-contain" />
        </div>
        <p className="text-[13px] font-extrabold text-[#0033A0] uppercase tracking-widest mb-1">Merry Explorers Playgroup</p>
        <p className="text-[12px] font-medium text-[#94a3b8]">Dream. Discover. Explore. 🌟</p>
      </div>
    </div>
  );
}
