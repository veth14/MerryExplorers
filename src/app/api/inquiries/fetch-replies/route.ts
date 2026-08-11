import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";
import { getGmailClient, extractTextBody, stripQuotedReply } from "@/lib/gmail-client";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

/**
 * GET /api/inquiries/fetch-replies
 *
 * Polls the Gmail inbox for emails whose subject starts with "Re: Your Inquiry"
 * and whose In-Reply-To header matches a stored gmailMessageId on an inquiry.
 * Any new client messages found are appended to the inquiry's thread[] and
 * the status is set to "Awaiting Reply".
 *
 * Returns: { success, newReplies: number, checked: number }
 */
export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;

  try {
    const gmail = getGmailClient();
    const { db } = await connectToDatabase();

    // 1. Find all inquiries that have a gmailMessageId (i.e. we've replied to them)
    //    and are NOT closed.
    const inquiries = await db
      .collection("inquiries")
      .find({
        gmailMessageId: { $exists: true, $ne: null },
        status: { $ne: "Closed" },
      })
      .toArray();

    if (inquiries.length === 0) {
      return NextResponse.json({ success: true, newReplies: 0, checked: 0 });
    }

    // Build a map: gmailMessageId -> inquiry
    const messageIdMap = new Map<string, any>();
    for (const inq of inquiries) {
      if (inq.gmailMessageId) {
        messageIdMap.set(inq.gmailMessageId, inq);
      }
    }

    // 2. Search Gmail inbox for reply emails from the last 30 days
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: 'subject:"Re: Your Inquiry" newer_than:30d',
      maxResults: 50,
    });

    const messageList = listRes.data.messages ?? [];
    let newReplies = 0;

    for (const msg of messageList) {
      if (!msg.id) continue;

      // Fetch the full message with headers
      const fullMsg = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const headers: Record<string, string> = {};
      for (const h of fullMsg.data.payload?.headers ?? []) {
        if (h.name) headers[h.name.toLowerCase()] = h.value ?? "";
      }

      const inReplyTo = headers["in-reply-to"]?.trim() || "";
      const references = headers["references"]?.trim() || "";
      const fromHeader = headers["from"] ?? "";
      const emailUser = process.env.EMAIL_USER ?? "";

      // Skip emails sent BY our own address (we don't want to log our own outgoing)
      if (fromHeader.includes(emailUser)) continue;

      // Match against a stored inquiry by checking if our stored Message-ID is in In-Reply-To or References
      let matchedInquiry = null;
      for (const [msgId, inq] of messageIdMap.entries()) {
        if (inReplyTo.includes(msgId) || references.includes(msgId)) {
          matchedInquiry = inq;
          break;
        }
      }
      
      if (!matchedInquiry) continue;

      // Check if we already stored this gmail message id to avoid duplicates
      const alreadyStored = (matchedInquiry.thread ?? []).some(
        (t: any) => t.gmailId === msg.id
      );
      if (alreadyStored) continue;

      // Extract and clean the reply body
      const rawBody = extractTextBody(fullMsg.data.payload);
      const cleanBody = stripQuotedReply(rawBody);
      if (!cleanBody) continue;

      const sentAt = new Date(parseInt(fullMsg.data.internalDate ?? "0")).toISOString();

      const threadEntry = {
        from: "client" as const,
        message: cleanBody,
        sentAt,
        gmailId: msg.id,
      };

      // Append to thread and set status to "Awaiting Reply"
      await db.collection("inquiries").updateOne(
        { _id: new ObjectId(matchedInquiry._id.toString()) },
        {
          $push: { thread: threadEntry } as any,
          $set: { status: "Awaiting Reply", updatedAt: new Date() },
        }
      );

      // Create admin notification
      await db.collection("notifications").insertOne({
        title: "Client Replied to Inquiry",
        message: `${matchedInquiry.parentName} replied to their inquiry.`,
        type: "info",
        read: false,
        time: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "Asia/Manila",
        }),
        createdAt: new Date(),
      });

      newReplies++;
    }

    return NextResponse.json({
      success: true,
      newReplies,
      checked: messageList.length,
    });
  } catch (error: any) {
    console.error("fetch-replies error:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to fetch replies" },
      { status: 500 }
    );
  }
}
