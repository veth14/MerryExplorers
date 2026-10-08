// lib/photo-upload.ts
// iPhone-safe photo prep + Cloudinary upload.
// Quality-first: originals are uploaded untouched. Only HEIC (converted to JPEG at
// near-lossless quality) and files over Cloudinary's size limit are ever re-encoded.

const CLOUDINARY_MAX_BYTES = 10 * 1024 * 1024; // free-plan per-image limit
const TARGET_MAX_BYTES = 9.8 * 1024 * 1024;    // small safety margin under the limit
const QUALITY_STEPS = [0.95, 0.92, 0.88];      // tried in order, only until the file fits
const SCALE_STEP = 0.85;                       // last resort: shrink 15% per round
const MAX_SCALE_ROUNDS = 6;
const MAX_CANVAS_PIXELS = 16_777_216;          // iOS Safari canvas limit (4096 x 4096)
const UPLOAD_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 3;

// ─── Type detection (iOS often gives file.type === "") ──────────────────────────

export function isHeic(file: File): boolean {
    return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

export function isSupportedImage(file: File): boolean {
    if (/^image\/(jpeg|png|webp|hei[cf])$/i.test(file.type)) return true;
    return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

// ─── Decode ─────────────────────────────────────────────────────────────────────

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close?: () => void }> {
    // createImageBitmap honours EXIF orientation and can decode HEIC on iOS Safari
    if (typeof createImageBitmap === "function") {
        try {
            const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as any);
            return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
        } catch {
            /* fall through to <img> */
        }
    }
    const url = URL.createObjectURL(file);
    try {
        const img = new Image();
        img.decoding = "async";
        img.src = url;
        await img.decode();
        return { source: img, width: img.naturalWidth, height: img.naturalHeight };
    } finally {
        URL.revokeObjectURL(url);
    }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
    return new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
}

/**
 * Encodes to JPEG at the highest quality that fits under the Cloudinary limit.
 * Starts at full resolution and 0.95 quality; only steps down if the file is too big.
 */
async function encodeJpegUnderLimit(
    source: CanvasImageSource,
    width: number,
    height: number
): Promise<Blob> {
    // Full resolution, unless the browser can't draw a canvas that large (old iOS)
    let scale = Math.min(1, Math.sqrt(MAX_CANVAS_PIXELS / (width * height)));

    for (let round = 0; round < MAX_SCALE_ROUNDS; round++) {
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas context");
        ctx.fillStyle = "#fff"; // JPEG has no alpha
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(source, 0, 0, w, h);

        try {
            for (const q of QUALITY_STEPS) {
                const blob = await canvasToBlob(canvas, q);
                if (!blob) throw new Error("toBlob failed");
                if (blob.size <= TARGET_MAX_BYTES) return blob;
            }
        } finally {
            // release canvas memory (important on iOS)
            canvas.width = canvas.height = 0;
        }
        scale *= SCALE_STEP; // still too big at 0.88 — shrink a little and try again
    }
    throw new Error("could not fit under size limit");
}

/**
 * Quality-first prep:
 *  - JPEG / PNG / WebP under 10 MB → returned untouched (zero quality loss).
 *  - HEIC → converted to JPEG at full resolution, quality 0.95 (visually lossless).
 *  - Anything over ~10 MB → re-encoded at the highest quality that fits.
 */
export async function prepareImage(file: File): Promise<File> {
    const heic = isHeic(file);

    // Untouched original: best possible quality
    if (!heic && file.size <= TARGET_MAX_BYTES) return file;

    try {
        const { source, width, height, close } = await decode(file);
        let blob: Blob;
        try {
            blob = await encodeJpegUnderLimit(source, width, height);
        } finally {
            close?.();
        }
        const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
    } catch {
        if (heic) {
            throw new Error(`"${file.name}" is a HEIC photo this browser can't convert. Please use Safari or export it as JPEG.`);
        }
        // Too big and couldn't be re-encoded: pass it through so upload reports a clear size error
        return file;
    }
}

/**
 * Small preview image (object URL) for the thumbnail grids. Showing full-size originals
 * in 30 tiles would make iOS Safari decode ~30 huge bitmaps at once and can crash the tab.
 * The uploaded file is NOT affected: this is only for on-screen previews.
 * Remember to URL.revokeObjectURL() the result when the preview is removed.
 */
export async function makeThumbnail(file: File, maxEdge = 480): Promise<string> {
    try {
        const { source, width, height, close } = await decode(file);
        try {
            const scale = Math.min(1, maxEdge / Math.max(width, height));
            const w = Math.max(1, Math.round(width * scale));
            const h = Math.max(1, Math.round(height * scale));
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("no canvas context");
            ctx.drawImage(source, 0, 0, w, h);
            const blob = await canvasToBlob(canvas, 0.8);
            canvas.width = canvas.height = 0;
            if (!blob) throw new Error("toBlob failed");
            return URL.createObjectURL(blob);
        } finally {
            close?.();
        }
    } catch {
        return URL.createObjectURL(file); // preview only; fine if it can't be shrunk
    }
}

// ─── Cloudinary upload ──────────────────────────────────────────────────────────

export interface UploadedPhoto {
    url: string;
    cloudinaryPublicId: string;
}

async function getSignature() {
    const res = await fetch("/api/cloudinary-sign", { cache: "no-store" });
    const data = await res.json();
    if (!data.signature) throw new Error("Failed to get upload signature");
    return data;
}

async function uploadOnce(file: File): Promise<UploadedPhoto> {
    const sign = await getSignature(); // fresh per file → never expires mid-batch

    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", sign.apiKey);
    fd.append("timestamp", String(sign.timestamp));
    fd.append("signature", sign.signature);
    fd.append("folder", "merry_explorers_student_albums");

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);
    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
            method: "POST",
            body: fd,
            signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (data?.error) {
            const err: any = new Error(data.error.message || "Upload rejected");
            err.fatal = true; // bad file / bad signature — retrying won't help
            throw err;
        }
        if (!res.ok || !data.secure_url) throw new Error(`Upload failed (${res.status})`);
        return { url: data.secure_url, cloudinaryPublicId: data.public_id };
    } finally {
        clearTimeout(timer);
    }
}

export async function uploadWithRetry(file: File): Promise<UploadedPhoto> {
    if (file.size > CLOUDINARY_MAX_BYTES) {
        throw new Error(`"${file.name}" is ${(file.size / 1048576).toFixed(1)} MB — over the 10 MB limit.`);
    }
    let lastErr: any;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await uploadOnce(file);
        } catch (e: any) {
            lastErr = e;
            if (e?.fatal || attempt === MAX_RETRIES) break;
            await new Promise((r) => setTimeout(r, 800 * attempt)); // backoff
        }
    }
    const reason = lastErr?.name === "AbortError" ? "timed out" : lastErr?.message || "failed";
    throw new Error(`Could not upload "${file.name}": ${reason}`);
}

/**
 * Uploads files with limited concurrency (2 is gentle on iOS memory + cellular).
 * Order of results matches order of input. onProgress(done, total) fires after each file.
 */
export async function uploadAll(
    files: File[],
    onProgress?: (done: number, total: number) => void,
    concurrency = 2
): Promise<UploadedPhoto[]> {
    const results: UploadedPhoto[] = new Array(files.length);
    let next = 0;
    let done = 0;
    let failure: Error | null = null;

    async function worker() {
        while (!failure) {
            const i = next++;
            if (i >= files.length) return;
            try {
                results[i] = await uploadWithRetry(files[i]);
                onProgress?.(++done, files.length);
            } catch (e: any) {
                failure = e;
            }
        }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker));
    if (failure) throw failure;
    return results;
}

// ─── Screen wake lock (stops iOS from suspending uploads when the screen dims) ───

export async function keepAwake(): Promise<() => void> {
    try {
        const nav: any = navigator;
        if (nav.wakeLock?.request) {
            const lock = await nav.wakeLock.request("screen");
            return () => lock.release().catch(() => { });
        }
    } catch {
        /* not supported / denied — ignore */
    }
    return () => { };
}