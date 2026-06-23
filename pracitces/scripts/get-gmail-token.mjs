#!/usr/bin/env node
/**
 * One-time helper to mint a Gmail refresh token for the email agent.
 *
 * Prerequisites:
 *   1. In Google Cloud Console, enable the Gmail API.
 *   2. Create an OAuth 2.0 Client ID of type "Desktop app".
 *   3. Put GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.
 *
 * Run:
 *   npm run gmail:token
 *
 * It starts a tiny local server, opens the consent screen, captures the code,
 * and prints GOOGLE_REFRESH_TOKEN for you to paste into .env.
 */
import "dotenv/config";
import http from "node:http";
import { URL } from "node:url";
import { google } from "googleapis";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first.");
  process.exit(1);
}

const PORT = 53682;
const redirectUri = `http://localhost:${PORT}/oauth2callback`;

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
];

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith("/oauth2callback")) {
    res.writeHead(404).end();
    return;
  }
  const code = new URL(req.url, redirectUri).searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("Missing code");
    return;
  }
  try {
    const { tokens } = await oauth2.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h2>Authorized. You can close this tab and return to the terminal.</h2>");
    console.log("\nAdd this to your .env:\n");
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    if (!tokens.refresh_token) {
      console.warn(
        "No refresh token returned. Remove this app's access at " +
          "https://myaccount.google.com/permissions and run again.",
      );
    }
  } catch (err) {
    res.writeHead(500).end("Token exchange failed");
    console.error(err);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log("Open this URL in your browser to authorize:\n");
  console.log(authUrl, "\n");
});
