// lib/photo-upload.ts
// iPhone-safe photo prep + Cloudinary upload (resize, HEIC, EXIF, retries, fresh signatures)

const MAX_EDGE = 2400;          // long edge in px — sharp enough for any screen/print at 4x6
const JPEG_QUALITY = 0.9;
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024; // small JPEG/PNG/WebP files are left untouched
const CLOUDINARY_MAX_BYTES = 10 * 1024 * 1024; // free-plan per-image limit
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

// ─── Client-side resize / normalize ─────────────────────────────────────────────

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

/**
 * Resizes to MAX_EDGE and re-encodes as JPEG (this also converts HEIC → JPEG on Safari
 * and bakes in EXIF rotation). Falls back to the original file if decoding fails.
 */
export async function prepareImage(file: File): Promise<File> {
    const heic = isHeic(file);
    const smallAndSafe =
        !heic && file.size <= SKIP_BELOW_BYTES && /^image\/(jpeg|png|webp)$/i.test(file.type);
    if (smallAndSafe) return file;

    try {
        const { source, width, height, close } = await decode(file);
        const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
        const w = Math.round(width * scale);
        const h = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas context");
        ctx.fillStyle = "#fff"; // JPEG has no alpha
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(source, 0, 0, w, h);
        close?.();

        const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", JPEG_QUALITY));
        // release canvas memory (important on iOS)
        canvas.width = canvas.height = 0;
        if (!blob) throw new Error("toBlob failed");

        const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
    } catch {
        // Couldn't decode (e.g. HEIC on a non-Safari browser). Let the caller decide.
        if (heic) throw new Error(`"${file.name}" is a HEIC photo this browser can't convert. Please use Safari or export it as JPEG.`);
        return file;
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

/* LATEST BRANCH */