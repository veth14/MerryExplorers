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

    return NextResponse.json({ valid: false, error: "This code is not valid." }, { status: 400 });
  } catch (error: any) {
    console.error("[validate-promo POST]", error);
    return NextResponse.json({ valid: false, error: "This code is not valid." }, { status: 500 });
  }
}
