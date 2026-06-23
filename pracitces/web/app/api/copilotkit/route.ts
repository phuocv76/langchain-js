import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

// The graph runs on the local `langgraphjs dev` server. CopilotKit speaks to it
// over the AG-UI protocol and bridges events to the React UI.
const serviceAdapter = new ExperimentalEmptyAdapter();

const copilotRuntime = new CopilotRuntime({
  agents: {
    emailAgent: new LangGraphAgent({
      deploymentUrl: process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:2024",
      graphId: "emailAgent",
    }),
  },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime: copilotRuntime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
