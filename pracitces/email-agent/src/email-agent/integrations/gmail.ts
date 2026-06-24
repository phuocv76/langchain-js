// Libs for third party
import { google } from "googleapis";

// Internal
import {
  ERRORS,
  INTEGRATIONS,
  PLACEHOLDERS,
} from "../../constants/messages";

// Types
import type { EmailMessage } from "../types";

let gmailClient: ReturnType<typeof google.gmail> | undefined;

/** Returns a lazily constructed Gmail API client. */
const getGmailClient = () => {
  if (gmailClient) {
    return gmailClient;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(ERRORS.GMAIL_CREDENTIALS);
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  gmailClient = google.gmail({ version: "v1", auth: oauth2 });
  return gmailClient;
};

/** Decodes a Gmail API message body part. */
const decodeBody = (data?: string | null): string => {
  if (!data) {
    return "";
  }
  return Buffer.from(data, "base64url").toString("utf8");
};

/** Extracts plain-text content from a Gmail message payload. */
const extractPlainText = (payload: {
  body?: { data?: string | null };
  parts?: Array<{
    mimeType?: string | null;
    body?: { data?: string | null };
    parts?: unknown[];
  }>;
}): string => {
  if (payload.body?.data) {
    return decodeBody(payload.body.data);
  }

  for (const part of payload.parts ?? []) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBody(part.body.data);
    }
    if (part.parts?.length) {
      const nested = extractPlainText(part as typeof payload);
      if (nested) {
        return nested;
      }
    }
  }

  return "";
};

/** Reads a header value from a Gmail message. */
const getHeader = (
  headers: Array<{ name?: string | null; value?: string | null }> | undefined,
  name: string,
): string =>
  headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())
    ?.value ?? "";

/**
 * Fetches an email by ID or the latest unread message.
 *
 * @param emailId - Gmail message ID; when omitted, uses the latest unread.
 * @returns Parsed email payload, or null if none found.
 */
export const fetchTargetEmail = async (
  emailId?: string,
): Promise<EmailMessage | null> => {
  const gmail = getGmailClient();
  const userId = process.env.GMAIL_USER ?? "me";

  let messageId = emailId;
  if (!messageId) {
    const list = await gmail.users.messages.list({
      userId,
      maxResults: 1,
      q: "is:unread in:inbox",
    });
    messageId = list.data.messages?.[0]?.id ?? undefined;
  }

  if (!messageId) {
    return null;
  }

  const message = await gmail.users.messages.get({
    userId,
    id: messageId,
    format: "full",
  });

  const headers = message.data.payload?.headers;
  const body = extractPlainText(message.data.payload ?? {});

  return {
    id: message.data.id ?? messageId,
    threadId: message.data.threadId ?? messageId,
    from: getHeader(headers, "From"),
    subject: getHeader(headers, "Subject") || PLACEHOLDERS.NO_SUBJECT,
    body: body.trim() || PLACEHOLDERS.EMPTY_BODY,
  };
};

/**
 * Sends a reply in the same Gmail thread.
 *
 * @param params - Reply content and thread metadata.
 */
export const sendEmailReply = async (params: {
  readonly threadId: string;
  readonly to: string;
  readonly subject: string;
  readonly body: string;
}): Promise<void> => {
  const gmail = getGmailClient();
  const userId = process.env.GMAIL_USER ?? "me";

  const subject = params.subject.startsWith(INTEGRATIONS.GMAIL_REPLY_PREFIX)
    ? params.subject
    : `${INTEGRATIONS.GMAIL_REPLY_PREFIX} ${params.subject}`;

  const raw = [
    `To: ${params.to}`,
    `Subject: ${subject}`,
    INTEGRATIONS.GMAIL_CONTENT_TYPE,
    "",
    params.body,
  ].join("\r\n");

  const encoded = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId,
    requestBody: {
      raw: encoded,
      threadId: params.threadId,
    },
  });
};

/**
 * Marks a Gmail message as read.
 *
 * @param emailId - Gmail message ID.
 */
export const markEmailAsRead = async (emailId: string): Promise<void> => {
  const gmail = getGmailClient();
  const userId = process.env.GMAIL_USER ?? "me";

  await gmail.users.messages.modify({
    userId,
    id: emailId,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
};
