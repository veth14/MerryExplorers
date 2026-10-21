import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    const rawCode = (code || "").trim();

    if (!rawCode) {
      return NextResponse.json({ valid: false, error: "Please enter a promo code." }, { status: 400 });
    }

    // Clean any accidental surrounding/trailing quotes or colons from copy-pasting (e.g. A1JesusLovesMe2026:”)
    const cleanCode = rawCode.replace(/^[“"']+|[”"':]+$/g, "").trim();

    // Special scholar promo code — does not expire, 100% scholarship, no payment required
    if (
      cleanCode === "A1JesusLovesMe2026" ||
      rawCode === "A1JesusLovesMe2026" ||
      rawCode === "A1JesusLovesMe2026:”" ||
      rawCode === 'A1JesusLovesMe2026:"'
    ) {
      return NextResponse.json({
        valid: true,
        isScholar: true,
        promoCode: "A1JesusLovesMe2026",
        message: "Scholar Code applied — 100% Tuition Waived! No payment needed.",
      });
    }

    if (cleanCode.toUpperCase() === "A1RENEWAL2026") {
      const expiresAt = new Date("2026-10-16T13:00:00+08:00");
      if (Date.now() > expiresAt.getTime()) {
        return NextResponse.json({
          valid: false,
          expired: true,
          promoCode: "A1RENEWAL2026",
          expiresAt: expiresAt.toISOString(),
          error: "A1RENEWAL2026 expired on October 16, 2026 at 1:00 PM (Manila time). If you already registered, open your existing payment page to renew your reservation for 1 hour if a slot is available.",
        }, { status: 410 });
      }
      return NextResponse.json({
        valid: true,
        isReservationCode: true,
        promoCode: "A1RENEWAL2026",
        message: "Priority reservation code applied. Payment is still required within 1 hour.",
      });
    }

    // Trailblazer → Creative Explorer pioneer price override
    // Allows one pioneer family registering for brave-explorer to pay ₱4,820 (Creative Explorer pioneer rate).
    if (cleanCode.toUpperCase() === "TRAILBLAZER2CREATIVE") {
      return NextResponse.json({
        valid: true,
        isCustomRate: true,
        customRate: 4820,
        promoCode: "TRAILBLAZER2CREATIVE",
        message: "Special rate applied — Trailblazer slot at Creative Explorer Pioneer Price (₱4,820).",
      });
    }

    return NextResponse.json({ valid: false, error: "This code is not valid." }, { status: 400 });
  } catch (error: any) {
    console.error("[validate-promo POST]", error);
    return NextResponse.json({ valid: false, error: "This code is not valid." }, { status: 500 });
  }
}
