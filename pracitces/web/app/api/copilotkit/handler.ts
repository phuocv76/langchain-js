// Libs for third party
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";

const deploymentUrl =
  process.env.LANGGRAPH_DEPLOYMENT_URL ?? "http://localhost:2024";

const runtime = new CopilotRuntime({
  agents: {
    emailAgent: new LangGraphAgent({
      deploymentUrl,
      graphId: "emailAgent",
    }),
  },
});

/** Shared CopilotKit handler for `/api/copilotkit` and subpaths. */
export const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
  runtime,
  serviceAdapter: new ExperimentalEmptyAdapter(),
  endpoint: "/api/copilotkit",
});
