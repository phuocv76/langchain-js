import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { handleCopilotKitRequest } from "./copilotkit.js";

const app = new Hono();

app.all("/api/copilotkit", (c) => handleCopilotKitRequest(c.req.raw));
app.all("/api/copilotkit/*", (c) => handleCopilotKitRequest(c.req.raw));

const port = Number(process.env.PORT) || 4000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`BFF ready at http://localhost:${port}`);
});
