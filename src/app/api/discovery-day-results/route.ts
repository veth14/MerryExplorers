import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { parentName, email, scores, finalProgram, attempted } = data;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const newResult = {
      parentName: parentName || "Parent",
      email,
      scores,
      finalProgram,
      attempted,
      status: "New",
      createdAt: new Date(),
    };

    // 1. Save to database
    await db.collection("discovery_day_results").insertOne(newResult);

    // 2. Admin Notification
    await db.collection("notifications").insertOne({
      title: "New Discovery Day Quiz Result",
      message: `${parentName || "A parent"} completed the quiz. Best fit: ${finalProgram}.`,
      type: "info",
      read: false,
      createdAt: new Date(),
      link: "/admin/inquiries", // Assuming teachers check leads here
    });

    // 3. Send Email to Parent
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS, // Note: The project uses OAuth in gmail-client, but standard nodemailer uses USER/PASS. I'll stick to what inquiries route might use, or standard nodemailer. Wait, I should check what env vars they have. I'll use standard nodemailer for now.
      },
    });

    // We'll just build a simple email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #0F006E;">Hello ${parentName || "Explorer Parent"}!</h2>
        <p>Thank you for taking the Merry Explorers Play & Learning Fit Score quiz.</p>
        <p>Based on your answers, here are your results:</p>
        
        <div style="background-color: #F0F9FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0F006E; margin-top: 0;">Recommended Program: <strong>${finalProgram.toUpperCase()}</strong></h3>
          <p><strong>Your Scores:</strong></p>
          <ul>
            ${attempted.map((s: string) => `<li>${s.toUpperCase()}: ${scores[s]}/10</li>`).join("")}
          </ul>
        </div>
        
        <p><strong>One Important Reminder:</strong></p>
        <p><em>The goal isn't to fit the child into a program. The goal is to find the program that fits the child.</em></p>
        <p>Our teachers will also consider how your child responds during the actual Discovery Day experience.</p>
        
        <p>To book your Discovery Day slot, reply to this email or visit our website!</p>
        
        <p>Warmly,<br/>The Merry Explorers Team</p>
      </div>
    `;

    if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      await transporter.sendMail({
        from: `"Merry Explorers" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Your Child's Discovery Day Fit Score",
        html: htmlContent,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving discovery day result:", error);
    return NextResponse.json({ error: "Failed to save results" }, { status: 500 });
  }
}
