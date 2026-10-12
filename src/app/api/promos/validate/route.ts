import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    const cleanCode = (code || "").trim().toUpperCase();

    if (!cleanCode) {
      return NextResponse.json({ valid: false, error: "Please enter a promo code." }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Check active renewal period promo code or default to A1RENEWAL2026
    const period = await db.collection("renewal_periods").findOne({
      $or: [
        { promoCode: cleanCode },
        { isDefault: true, promoCode: cleanCode }
      ]
    });

    const isMatch = cleanCode === "A1RENEWAL2026" || (period && period.promoCode === cleanCode);

    if (!isMatch) {
      return NextResponse.json({ valid: false, error: "This code is not valid." }, { status: 400 });
    }

    // Check expiry
    const expiry = period?.deadline ? new Date(period.deadline) : new Date("2026-10-15T23:59:59+08:00");
    if (new Date() > expiry) {
      return NextResponse.json({ valid: false, error: "This code is not valid." }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      message: "THIS CODE HAS BEEN ACCEPTED…",
    });
  } catch (error: any) {
    console.error("[validate-promo POST]", error);
    return NextResponse.json({ valid: false, error: "This code is not valid." }, { status: 500 });
  }
}
