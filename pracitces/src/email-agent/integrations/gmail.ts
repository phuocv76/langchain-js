import { google, type gmail_v1 } from "googleapis";
import { requireEnv } from "../../lib/env.js";
import type { ParsedEmail } from "../types.js";

let cached: gmail_v1.Gmail | undefined;

/** Build an authenticated Gmail client from the OAuth refresh token in .env. */
export function getGmailClient(): gmail_v1.Gmail {
  if (cached) return cached;

  const oauth2 = new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
  );
  oauth2.setCredentials({ refresh_token: requireEnv("GOOGLE_REFRESH_TOKEN") });

  cached = google.gmail({ version: "v1", auth: oauth2 });
  return cached;
}

function header(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  const match = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return match?.value ?? "";
}

/** Recursively pull the first text/plain (fallback text/html) body out of a payload. */
function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";

  const decode = (data?: string | null) =>
    data ? Buffer.from(data, "base64url").toString("utf8") : "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decode(payload.body.data);
  }

  if (payload.parts?.length) {
    const plain = payload.parts.find((p) => p.mimeType === "text/plain");
    if (plain?.body?.data) return decode(plain.body.data);
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  if (payload.body?.data) return decode(payload.body.data);
  return "";
}

function toParsedEmail(message: gmail_v1.Schema$Message): ParsedEmail {
  const headers = message.payload?.headers;
  return {
    id: message.id ?? "",
    threadId: message.threadId ?? "",
    rfcMessageId: header(headers, "Message-Id"),
    from: header(headers, "From"),
    to: header(headers, "To"),
    subject: header(headers, "Subject"),
    body: extractBody(message.payload).trim(),
    snippet: message.snippet ?? "",
  };
}

/** Fetch the most recent unread message from the inbox, or null if none. */
export async function fetchLatestUnread(): Promise<ParsedEmail | null> {
  const gmail = getGmailClient();
  const userId = process.env.GMAIL_USER || "me";

  const list = await gmail.users.messages.list({
    userId,
    q: "is:unread in:inbox",
    maxResults: 1,
  });

  const id = list.data.messages?.[0]?.id;
  if (!id) return null;

  const full = await gmail.users.messages.get({ userId, id, format: "full" });
  return toParsedEmail(full.data);
}

/** Fetch a specific message by id. */
export async function fetchEmailById(id: string): Promise<ParsedEmail> {
  const gmail = getGmailClient();
  const userId = process.env.GMAIL_USER || "me";
  const full = await gmail.users.messages.get({ userId, id, format: "full" });
  return toParsedEmail(full.data);
}

/** Mark a message as read (remove the UNREAD label). */
export async function markAsRead(id: string): Promise<void> {
  const gmail = getGmailClient();
  const userId = process.env.GMAIL_USER || "me";
  await gmail.users.messages.modify({
    userId,
    id,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}

export interface SendReplyInput {
  original: ParsedEmail;
  body: string;
}

/** Send a plain-text reply on the same thread as the original email. */
export async function sendReply({ original, body }: SendReplyInput): Promise<string> {
  const gmail = getGmailClient();
  const userId = process.env.GMAIL_USER || "me";

  const to = original.from;
  const subject = original.subject.startsWith("Re:")
    ? original.subject
    : `Re: ${original.subject}`;

  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
  ];
  if (original.rfcMessageId) {
    headers.push(`In-Reply-To: ${original.rfcMessageId}`);
    headers.push(`References: ${original.rfcMessageId}`);
  }

  const raw = Buffer.from(`${headers.join("\r\n")}\r\n\r\n${body}`)
    .toString("base64url");

  const res = await gmail.users.messages.send({
    userId,
    requestBody: { raw, threadId: original.threadId },
  });

  return res.data.id ?? "";
}
