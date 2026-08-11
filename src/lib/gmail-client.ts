/**
 * gmail-client.ts
 *
 * Reusable Gmail API client using OAuth2.
 * Reads credentials from environment variables — never hardcode.
 *
 * Scopes used: gmail.readonly (read inbox to detect client replies)
 */

import { google } from "googleapis";

export function getGmailClient() {
  const clientId     = process.env.GMAIL_CLIENT_ID!;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET!;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN!;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Gmail OAuth credentials in environment variables.");
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  return google.gmail({ version: "v1", auth });
}

/**
 * Decodes a base64url-encoded Gmail message part body.
 */
export function decodeBase64(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Extracts the plain-text body from a Gmail message payload.
 * Walks through parts to find text/plain content.
 */
export function extractTextBody(payload: any): string {
  if (!payload) return "";

  // Direct body (non-multipart)
  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  // Multipart — walk parts
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64(part.body.data);
      }
      // Recurse into nested parts
      if (part.parts) {
        const nested = extractTextBody(part);
        if (nested) return nested;
      }
    }
  }

  return "";
}

/**
 * Strips the quoted original message from a reply body.
 * Removes everything after the first "On ... wrote:" line or "> " quote block.
 */
export function stripQuotedReply(body: string): string {
  // Gmail reply headers often span multiple lines and can look like:
  // "On Tue, Aug 11, 2026 at 9:14 PM Merry Explorers <\nmerrystoryeventservices@gmail.com> wrote:"
  // Using [\s\S] allows us to find this block across multiple lines without needing the 's' (dotAll) regex flag.
  const match = body.match(/On\s+(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)[\s\S]*?wrote:/i);
  if (match && match.index !== undefined) {
    body = body.substring(0, match.index);
  }

  const lines = body.split("\n");
  const cleanLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Stop at quoted block
    if (trimmed.startsWith(">")) break;
    // Also stop at common horizontal rules separating replies
    if (trimmed.startsWith("____") || trimmed.startsWith("----")) break;
    cleanLines.push(line);
  }

  return cleanLines.join("\n").trim();
}
