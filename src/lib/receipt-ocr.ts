// Reads a payment receipt screenshot (GCash, GoTyme / InstaPay, MariBank, BPI ...) and pulls out
// the reference number, the total amount, the date and the bank the money was sent to.
//
// The text parsing (parseReceiptText) is a plain function with no browser code in it, so it can be
// tested on its own. readReceipt() is the browser part: it runs OCR (tesseract.js) and feeds the text in.

export type ReceiptMethod = "gcash" | "bpi" | "mari-bank"; // same ids as PAYMENT_METHODS on the payments page

export type ReceiptData = {
    reference: string;
    amount: number | null;
    date: string | null; // "YYYY-MM-DD", exactly as printed on the receipt
    method: ReceiptMethod | null;
};

export const EMPTY_RECEIPT: ReceiptData = { reference: "", amount: null, date: null, method: null };

// ───────────────────────── Reference number ─────────────────────────

// OCR mixes up some characters inside long numbers, so repair the common cases.
function fixOcrDigits(token: string): string {
    // GoTyme / InstaPay references start with "ITO" and the "I" is often read as "1", "l" or "|"
    const ito = token.match(/^[1IL|]TO(\d{12,20})$/i);
    if (ito) return "ITO" + ito[1];

    // PNB / BancNet InstaPay references start with MBS (or MB5/M8S)
    // Structure: MBS + YYYYMMDD (8 digits) + Sender BIC (e.g. PNBMPHMM, 8 chars) + Channel (e.g. TODB, 4 chars) + Sequence (8-22 digits)
    const mbs = token.match(/^(?:MBS|MB5|M8S)([0-9OIL]{8})([A-Z0-9]{8,12})([0-9OIL|]{8,22})$/i);
    if (mbs) {
        const datePart = mbs[1].replace(/O/gi, "0").replace(/[IL|]/gi, "1");
        const bankPart = mbs[2].toUpperCase().replace(/0/g, "O");
        const seqPart = mbs[3].replace(/O/gi, "0").replace(/[IL|]/gi, "1");
        return "MBS" + datePart + bankPart + seqPart;
    }

    // a reference made of numbers only, where O / I / L were read instead of 0 / 1
    if (/^[0-9OIL|]{9,}$/.test(token) && (token.match(/\d/g) || []).length >= 6) {
        return token.replace(/O/g, "0").replace(/[IL|]/g, "1");
    }
    return token;
}

const cleanRef = (raw: string) => fixOcrDigits(raw.replace(/[\s\-]+/g, "").toUpperCase());
const validRef = (t: string) => t.length >= 8 && t.length <= 45 && (t.match(/\d/g) || []).length >= 6;

export function parseReference(text: string): string {
    // InstaPay receipts from some wallet apps use `BN-YYYYMMDD-########`.
    // The generic labelled-reference parser needs at least 3 characters in
    // its first token, so it misses the two-character `BN` prefix before `-`.
    // Read this known shape first and normalize common OCR digit substitutions.
    const bnMatch = text.match(/\b([B8]N[\s-]*[0-9OIL|]{8}[\s-]*[0-9OIL|]{8})\b/i);
    if (bnMatch) {
        const compact = bnMatch[1]
            .replace(/[\s-]+/g, "")
            .toUpperCase()
            .replace(/^8N/, "BN")
            .replace(/O/g, "0")
            .replace(/[IL|]/g, "1");
        if (/^BN\d{16}$/.test(compact)) {
            return `BN-${compact.slice(2, 10)}-${compact.slice(10)}`;
        }
    }

    // 0) Specific known shapes that might be multi-line (e.g. PNB InstaPay MBS format wrapped across lines)
    const mbsMatch = text.match(/\b(MB[S58][0-9OIL]{8}[A-Z]{8,12}(?:[\s\r\n]*[0-9OIL|]{3,22})+)/i);
    if (mbsMatch) {
        const value = cleanRef(mbsMatch[1]);
        if (validRef(value)) return value;
    }

    // 1) The value printed next to a "Reference No." / "Ref No." / "Trace ID" / "Confirmation No." label.
    //    Supports multi-token references and wrapped reference lines (like PNB receipts where the 38-char ref wraps).
    const labelRe =
        /\b(ref(?:erence)?\.?\s*(?:no\.?|number|num\.?|id|#)?|trace\s*(?:no\.?|number|id)|confirmation\s*(?:no\.?|number|code))\s*[:#.\-]*\s*([A-Z0-9|]{3,45}(?:[ \t\-]+[A-Z0-9|]{3,20}){0,4})/gi;
    let best = "";
    let bestRank = 0;
    for (const m of text.matchAll(labelRe)) {
        let rawVal = m[2];
        const matchEndIndex = (m.index ?? 0) + m[0].length;
        const remainder = text.slice(matchEndIndex);

        // Check if the next line is a wrapped continuation of the reference number (like PNB receipts)
        const nextLines = remainder.split(/\r?\n/);
        for (let i = 0; i < nextLines.length; i++) {
            const line = nextLines[i].trim();
            if (!line) continue;
            // Stop if the next line looks like a separate labelled field, currency, or metadata
            if (
                /:|[₱$]|\b(php|invoice|date|time|amount|total|fee|source|dest|bank|status|purpose|account|payment)\b/i.test(
                    line
                )
            ) {
                break;
            }
            // Continuation line must look like an ID segment (alphanumeric/digits without spaces)
            const cleanLine = line.replace(/[\s\-]+/g, "");
            if (/^[A-Z0-9|]{3,20}$/i.test(cleanLine) && (rawVal + cleanLine).length <= 45) {
                rawVal += cleanLine;
                break;
            }
            break;
        }

        const value = cleanRef(rawVal);
        if (!validRef(value)) continue; // e.g. the short GoTyme "Trace ID 257010"
        const rank = /^ref/i.test(m[1]) ? 2 : 1; // "Reference" beats "Trace ID"
        if (rank > bestRank) {
            best = value;
            bestRank = rank;
        }
    }
    if (best) return best;

    // 2) No label was read: look for the known shapes of reference numbers.
    const shapes = [
        /\b([1IL]TO\d{12,20})\b/i, // GoTyme / InstaPay
        /\b(MB[S58][0-9OIL]{8}[A-Z]{8,12}[0-9OIL|]{8,22})\b/i, // PNB / InstaPay MBS
        /\b([A-Z]{2}\d{16,20})\b/, // MariBank (BC + 18 digits)
        /\b(\d{4}\s\d{3}\s\d{3}\s\d{3})\b/, // GCash printed in groups
        /\b(\d{13})\b/, // GCash
        /\b([A-Z0-9]{4}\s+[A-Z0-9]{4}\s+[A-Z0-9]{4})\b/i,
        /\b(\d{10,20})\b/,
    ];
    for (const shape of shapes) {
        const hit = text.match(shape);
        if (hit) {
            const value = cleanRef(hit[1]);
            if (validRef(value)) return value;
        }
    }
    return "";
}

// ───────────────────────── Amount ─────────────────────────

// Reads the amount that was actually sent. Receipts repeat the amount several times
// (headline, "Amount", "Total Amount"), so every line votes and the "Total" lines count the most.
// Fee lines are ignored.
export function parseAmount(text: string): number | null {
    // 1,234.56 or 1234.56. Not when it is glued to another number ("2,/60.00" is a misread headline).
    const NUM = /(?<![\d,/.])(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(?!\d)/g;
    const toNum = (m: RegExpMatchArray) => parseFloat(m[1].replace(/,/g, "") + "." + m[2]);

    const votes = new Map<number, number>();
    const vote = (n: number, weight: number) => {
        if (n > 0 && n < 1_000_000) votes.set(n, (votes.get(n) || 0) + weight);
    };

    for (const line of text.split(/\r?\n/)) {
        if (/\bfee\b/i.test(line) && !/total|amount/i.test(line)) continue;
        let weight = 0;
        if (/total\s*amount|^\s*total\b/i.test(line)) weight = 3; // "Total Amount", "Total Amount Sent", "Total"
        else if (/amount|sent/i.test(line)) weight = 2; // "Amount", "Transfer Amount"
        else if (/php|₱/i.test(line)) weight = 1; // the big headline amount
        if (!weight) continue;
        for (const m of line.matchAll(NUM)) vote(toNum(m), weight);
    }

    // The label and the number can end up on different lines when OCR splits a row: use any amount then.
    if (votes.size === 0) {
        for (const m of text.matchAll(NUM)) vote(toNum(m), 1);
    }

    let best: number | null = null;
    let bestScore = 0;
    for (const [n, score] of votes) {
        if (score > bestScore || (score === bestScore && best !== null && n > best)) {
            best = n;
            bestScore = score;
        }
    }
    return best;
}

// ───────────────────────── Date ─────────────────────────

const MONTH_RE =
    "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const monthNo = (name: string) => MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;

// Returns the date on the receipt as "YYYY-MM-DD" (as printed, no time zone conversion).
// Understands "08 Oct 2026", "11 Oct 2026 at 12:43 PM", "Oct 6, 2026" and "2026-10-11".
export function parseDate(text: string, today: Date = new Date()): string | null {
    const t = text.replace(/\b0ct\b/gi, "Oct"); // OCR reads the "O" of Oct as a zero
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const found: { at: number; iso: string }[] = [];

    const add = (at: number, y: number, mo: number, d: number) => {
        if (y < 2020 || y > today.getFullYear() + 1 || mo < 1 || d < 1 || d > 31) return;
        if (new Date(y, mo - 1, d).getMonth() !== mo - 1) return; // e.g. 31 Feb
        const iso = `${y}-${pad(mo)}-${pad(d)}`;
        if (iso > todayIso) return; // a receipt can't be from the future, so it was misread
        found.push({ at, iso });
    };

    for (const m of t.matchAll(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_RE})\\.?,?\\s+(\\d{4})\\b`, "gi")))
        add(m.index ?? 0, +m[3], monthNo(m[2]), +m[1]); // 08 Oct 2026
    for (const m of t.matchAll(new RegExp(`\\b(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "gi")))
        add(m.index ?? 0, +m[3], monthNo(m[1]), +m[2]); // Oct 6, 2026
    for (const m of t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) add(m.index ?? 0, +m[1], +m[2], +m[3]); // 2026-10-11

    found.sort((a, b) => a.at - b.at);
    return found[0]?.iso ?? null;
}

// ───────────────────────── Payment method ─────────────────────────

// Which account was the money sent TO? Only answered when the receipt makes it clear.
export function guessMethod(text: string): ReceiptMethod | null {
    const t = text.toLowerCase();
    // GCash is the receiving side on these layouts (InstaPay to "G-Xchange", GCash "Express Send")
    if (/g-?xchange|sent via gcash|express send/.test(t)) return "gcash";

    // If destination / recipient section is clearly marked, prioritize the destination bank
    const destMatch = t.match(/\b(?:destination|transferred to|transfer to|receiver|payee|recipient)\b[\s\S]{1,200}/i);
    if (destMatch) {
        const destText = destMatch[0];
        const destMari = /mari\s?bank/.test(destText);
        const destBpi = /\bbpi\b|bank of the philippine islands/.test(destText);
        const destGcash = /gcash|g-?xchange/.test(destText);
        if (destMari && !destBpi && !destGcash) return "mari-bank";
        if (destBpi && !destMari && !destGcash) return "bpi";
        if (destGcash && !destMari && !destBpi) return "gcash";
    }

    const mari = /mari\s?bank/.test(t);
    const bpi = /\bbpi\b|bank of the philippine islands/.test(t);
    if (mari && !bpi) return "mari-bank";
    if (bpi && !mari) return "bpi";
    return null; // both banks appear (sender and receiver): don't guess
}

// ───────────────────────── Putting it together ─────────────────────────

export function parseReceiptText(text: string, today: Date = new Date()): ReceiptData {
    return {
        reference: parseReference(text),
        amount: parseAmount(text),
        date: parseDate(text, today),
        method: guessMethod(text),
    };
}

const hasEssentials = (r: ReceiptData) => !!r.reference && r.amount != null;
const merge = (a: ReceiptData, b: ReceiptData): ReceiptData => ({
    reference: a.reference || b.reference,
    amount: a.amount ?? b.amount,
    date: a.date ?? b.date,
    method: a.method ?? b.method,
});

// Phone screenshots read best when they are a bit larger and in grey tones.
async function prepareImage(file: File): Promise<HTMLCanvasElement> {
    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("image could not be opened"));
            el.src = url;
        });
        const targetWidth = Math.min(Math.max(img.width, 1400), 2200);
        const scale = targetWidth / img.width;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.filter = "grayscale(1) contrast(1.2)"; // ignored by browsers that don't support it
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas;
    } finally {
        URL.revokeObjectURL(url);
    }
}

// Browser only. `file` is the receipt the admin picked; `fallbackImage` is the compressed copy (data URL).
// Never throws: when nothing could be read the result is simply empty and the admin types it in.
export async function readReceipt(file: File, fallbackImage?: string): Promise<ReceiptData> {
    let result: ReceiptData = { ...EMPTY_RECEIPT };

    let Tesseract: any;
    try {
        Tesseract = (await import("tesseract.js")).default;
    } catch {
        return result;
    }

    const scan = async (image: unknown) => {
        try {
            const { data } = await Tesseract.recognize(image, "eng");
            result = merge(result, parseReceiptText(String(data.text || "")));
        } catch {
            // try the next source
        }
    };

    const prepared = await prepareImage(file).catch(() => null);
    if (prepared) await scan(prepared); // 1) enlarged, grey version
    if (!hasEssentials(result)) await scan(file); // 2) the untouched file
    if (!hasEssentials(result) && fallbackImage) await scan(fallbackImage); // 3) the compressed copy
    return result;
}
