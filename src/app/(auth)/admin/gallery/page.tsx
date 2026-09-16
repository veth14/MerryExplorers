"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";
import imageCompression from "browser-image-compression";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";

interface GalleryPhoto {
  id: string;
  imageUrl: string;
  cloudinaryPublicId: string;
  caption: string;
  order: number;
  uploadedAt: string;
}

interface UploadItem {
  id: string;
  name: string;
  status: "compressing" | "uploading" | "done" | "error";
  error?: string;
}

const MAX_PHOTOS = 30;

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

// ── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteModal({
  isOpen, photoUrl, onConfirm, onCancel, isDeleting,
}: {
  isOpen: boolean; photoUrl: string; onConfirm: () => void; onCancel: () => void; isDeleting: boolean;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <m.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-sm rounded-[2rem] bg-white shadow-[0_30px_80px_-15px_rgba(0,0,0,0.25)] overflow-hidden">
              {photoUrl && (
                <div className="relative h-36 w-full bg-slate-100">
                  <Image src={photoUrl} alt="Photo to delete" fill className="object-cover opacity-60" sizes="400px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/40 ring-4 ring-white">
                    <TrashIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}
              <div className="px-6 pb-6 pt-8 text-center">
                <h3 className="font-headline text-[18px] font-extrabold text-[#0f172a]">Delete this photo?</h3>
                <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#64748b]">
                  It will be <span className="font-bold text-red-500">permanently removed</span> from your gallery and the public landing page. This cannot be undone.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={onCancel} disabled={isDeleting}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-[14px] font-bold text-[#334155] transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    Keep it
                  </button>
                  <button
                    onClick={onConfirm} disabled={isDeleting}
                    className="flex-1 rounded-xl bg-red-500 py-2.5 text-[14px] font-bold text-white shadow-md shadow-red-500/25 transition-all hover:bg-red-600 disabled:opacity-60"
                  >
                    {isDeleting ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                        Deleting…
                      </span>
                    ) : "Yes, delete"}
                  </button>
                </div>
              </div>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Upload Progress Toast ────────────────────────────────────────────────────
function UploadToast({ items }: { items: UploadItem[] }) {
  if (items.length === 0) return null;
  const done = items.filter((i) => i.status === "done").length;
  const errors = items.filter((i) => i.status === "error").length;
  const total = items.length;
  const allDone = done + errors === total;
  return (
    <m.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
      className="fixed bottom-6 right-6 z-40 w-72 rounded-2xl bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] ring-1 ring-black/5 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <span className="text-[13px] font-bold text-[#0f172a]">
          {allDone ? (errors > 0 ? "Done (with errors)" : "All uploaded! 🎉") : `Uploading ${done + 1}/${total}…`}
        </span>
        {!allDone && <span className="text-[11px] font-semibold text-[#64748b]">{Math.round(((done + errors) / total) * 100)}%</span>}
      </div>
      <div className="max-h-44 overflow-y-auto divide-y divide-slate-50">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="shrink-0 text-base">
              {item.status === "done" && <span className="text-green-500">✓</span>}
              {item.status === "error" && <span className="text-red-500">✕</span>}
              {(item.status === "compressing" || item.status === "uploading") && (
                <svg className="h-4 w-4 animate-spin text-[#005cc8]" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-[#334155]">{item.name}</p>
              <p className="text-[11px] text-[#94a3b8] capitalize">{item.status === "error" ? item.error || "Failed" : item.status}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="h-1 bg-slate-100">
        <m.div
          className={`h-full ${errors > 0 && allDone ? "bg-amber-400" : "bg-[#005cc8]"}`}
          initial={{ width: 0 }}
          animate={{ width: `${((done + errors) / total) * 100}%` }}
          transition={{ ease: "easeOut" }}
        />
      </div>
    </m.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminGalleryPage() {
  const { user, userProfile } = useAuth();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<GalleryPhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchPhotos(); }, []);

  // Auto-clear upload toast 4s after completion
  useEffect(() => {
    const allDone = uploadItems.length > 0 && uploadItems.every((i) => i.status === "done" || i.status === "error");
    if (!allDone) return;
    const t = setTimeout(() => setUploadItems([]), 4000);
    return () => clearTimeout(t);
  }, [uploadItems]);

  // Auto-clear success message after 3s
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(""), 3000);
    return () => clearTimeout(t);
  }, [successMsg]);

  async function fetchPhotos() {
    try {
      const res = await fetch("/api/gallery");
      const data = await res.json();
      if (data.success) setPhotos(data.data);
      else setError(data.error || "Failed to load photos");
    } catch { setError("Network error loading photos"); }
    finally { setIsLoading(false); }
  }

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  async function uploadSingleFile(file: File, currentCount: number, itemId: string) {
    const updateItem = (patch: Partial<UploadItem>) =>
      setUploadItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
    try {
      updateItem({ status: "compressing" });
      const compressed = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 1080, useWebWorker: true });
      updateItem({ status: "uploading" });
      const base64Image = await toBase64(compressed);
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image, caption: "", order: currentCount, actorUid: user?.uid, actorName: userProfile?.fullName || user?.email, actorRole: userProfile?.role }),
      });
      const data = await res.json();
      if (data.success) { setPhotos((prev) => [...prev, data.data]); updateItem({ status: "done" }); return true; }
      else { updateItem({ status: "error", error: data.error || "Upload failed" }); return false; }
    } catch (err: any) { updateItem({ status: "error", error: err.message || "Failed" }); return false; }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const available = MAX_PHOTOS - photos.length;
    if (available <= 0) { setError(`Gallery is full (${MAX_PHOTOS}/${MAX_PHOTOS}). Delete some photos first.`); return; }
    const toUpload = files.slice(0, available);
    if (files.length > available) setError(`Only ${available} slot(s) remaining — uploading first ${available} of ${files.length}.`);
    else setError("");
    const items: UploadItem[] = toUpload.map((f) => ({ id: `${f.name}-${Date.now()}-${Math.random()}`, name: f.name, status: "compressing" as const }));
    setUploadItems(items);
    setIsUploading(true);
    let count = photos.length;
    for (let i = 0; i < toUpload.length; i++) { await uploadSingleFile(toUpload[i], count, items[i].id); count++; }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function confirmDelete(photo: GalleryPhoto) { setDeleteTarget(photo); }

  async function executeDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const id = deleteTarget.id;
    try {
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      const res = await fetch(`/api/gallery?id=${id}&actorUid=${user?.uid}&actorName=${userProfile?.fullName || user?.email}&actorRole=${userProfile?.role}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) { 
        fetchPhotos(); 
        setError(data.error || "Failed to delete"); 
      } else {
        setSuccessMsg("Photo successfully deleted! 🗑️");
      }
    } catch { 
      fetchPhotos(); 
      setError("Network error during deletion"); 
    }
    finally { setIsDeleting(false); setDeleteTarget(null); }
  }

  async function updateCaption(id: string, newCaption: string) {
    try {
      const res = await fetch("/api/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          caption: newCaption,
          actorUid: user?.uid,
          actorName: userProfile?.fullName || user?.email,
          actorRole: userProfile?.role,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to update caption");
      }
    } catch (err) {
      setError("Network error updating caption");
    }
  }

  // Reorder UI helper
  async function movePhoto(index: number, direction: "up" | "down") {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === photos.length - 1) return;

    const newPhotos = [...photos];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    
    // Swap order values
    const tempOrder = newPhotos[index].order;
    newPhotos[index].order = newPhotos[swapIndex].order;
    newPhotos[swapIndex].order = tempOrder;

    // Sort array
    newPhotos.sort((a, b) => a.order - b.order);
    setPhotos(newPhotos); // Optimistic UI update

    // API calls
    try {
      await Promise.all([
        fetch("/api/gallery", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: newPhotos[index].id, order: newPhotos[index].order }),
        }),
        fetch("/api/gallery", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: newPhotos[swapIndex].id, order: newPhotos[swapIndex].order }),
        })
      ]);
    } catch (err) {
      setError("Failed to save new order");
      fetchPhotos(); // Revert
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-[#64748b]">Loading gallery...</div>;
  }

  const isFull = photos.length >= MAX_PHOTOS;
  const slotsLeft = MAX_PHOTOS - photos.length;

  return (
    <>
    <AppShell
      title="Gallery Management"
      description="Manage the Adventure Moments gallery. Photos uploaded here instantly appear on the public landing page."
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <a href="/#gallery" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#005cc8] hover:underline"
        >
          <span>👀 View on Public Landing Page</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h4a.75.75 0 0 1 0 1.5h-4Z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.81L7.247 11.693a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
          </svg>
        </a>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ${
            isFull ? "bg-red-50 text-red-500" : "bg-[#E8F0FF] text-[#005cc8]"
          }`}>
            <span>{photos.length}/{MAX_PHOTOS}</span>
            <span className="font-normal opacity-70">photos</span>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isFull}
            className="flex items-center gap-2 rounded-xl bg-[#005cc8] px-5 py-2.5 text-[14px] font-bold text-white shadow-md shadow-[#005cc8]/20 transition-all hover:bg-[#004bb0] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Uploading…</>
            ) : (<><UploadIcon className="h-4 w-4" />Upload Photos</>)}
          </button>
          <input type="file" accept="image/jpeg, image/png, image/webp" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
        </div>
      </div>
      {!isFull && (
        <p className="mb-5 text-[12px] font-medium text-[#94a3b8]">
          💡 Select multiple photos at once — up to <strong>{slotsLeft}</strong> more allowed. Each is auto-compressed to under 200 KB.
        </p>
      )}

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 p-4 text-[13px] text-red-600">
          <span className="shrink-0">⚠️</span>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} className="shrink-0 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {photos.length === 0 ? (
        <button onClick={() => fileInputRef.current?.click()}
          className="group w-full flex h-64 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-[#c7d7f5] bg-[#f8fafc] transition-colors hover:border-[#005cc8] hover:bg-[#EEF4FF]"
        >
          <span className="text-4xl mb-3 transition-transform group-hover:scale-110">📸</span>
          <p className="text-[15px] font-bold text-[#0033A0]">No photos yet</p>
          <p className="text-[13px] text-[#94a3b8] mt-1">Click here or the Upload button to get started</p>
        </button>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {photos.map((photo, index) => (
              <m.div
                layout
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
              >
                <div className="relative aspect-[4/3] w-full bg-slate-100">
                  <Image
                    src={photo.imageUrl}
                    alt={photo.caption || "Gallery photo"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {/* Overlay controls */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-start justify-between p-3">
                    <div className="flex bg-white/20 backdrop-blur-md rounded-lg p-1 gap-1">
                      <button
                        onClick={() => movePhoto(index, "up")}
                        disabled={index === 0}
                        className="p-1 text-white hover:bg-white/20 rounded disabled:opacity-30"
                        title="Move Up"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button
                        onClick={() => movePhoto(index, "down")}
                        disabled={index === photos.length - 1}
                        className="p-1 text-white hover:bg-white/20 rounded disabled:opacity-30"
                        title="Move Down"
                      >
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>
                    <button
                      onClick={() => confirmDelete(photo)}
                      className="p-2 text-white bg-red-500/80 hover:bg-red-500 rounded-xl backdrop-blur-md transition-colors shadow-md"
                      title="Delete Photo"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <input
                    type="text"
                    defaultValue={photo.caption}
                    placeholder="Add a caption..."
                    onBlur={(e) => {
                      if (e.target.value !== photo.caption) {
                        updateCaption(photo.id, e.target.value);
                      }
                    }}
                    className="w-full bg-transparent text-[13px] font-medium text-[#334155] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 rounded px-1 py-0.5 transition-shadow"
                  />
                </div>
              </m.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </AppShell>

    {/* Delete modal — outside AppShell so it covers everything */}
    <DeleteModal
      isOpen={!!deleteTarget}
      photoUrl={deleteTarget?.imageUrl || ""}
      onConfirm={executeDelete}
      onCancel={() => setDeleteTarget(null)}
      isDeleting={isDeleting}
    />

    {/* Upload progress toast */}
    <AnimatePresence>
      {uploadItems.length > 0 && <UploadToast items={uploadItems} />}
    </AnimatePresence>

    {/* Success Toast */}
    <AnimatePresence>
      {successMsg && (
        <m.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-green-500 px-6 py-3 text-white shadow-xl shadow-green-500/20"
        >
          <span className="text-[14px] font-bold">{successMsg}</span>
        </m.div>
      )}
    </AnimatePresence>
    </>
  );
}
