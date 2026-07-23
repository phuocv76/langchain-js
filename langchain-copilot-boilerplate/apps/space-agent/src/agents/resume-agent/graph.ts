/**
 * Resume review agent — the hand-built StateGraph counterpart to the
 * `createAgent` workspace agent, demonstrating the LangGraph primitives
 * directly: custom state channels, plain edges, and data-driven conditional
 * edges. Visualize it in LangGraph Studio (`pnpm studio`) or via
 * `GET /langgraph/assistants/resumeAgent/graph`.
 *
 *   START → loadResume ─┬→ reportUnavailable ────────────→ END
 *                       └→ assess ─┬→ suggestImprovements → END
 *                                  └→ summarizeStrengths ─→ END
 *
 * Routing is deterministic (fetch outcome, then section completeness) so
 * the branches are testable without a model; only the two leaf review nodes
 * call the LLM, and they construct it lazily so importing this module never
 * requires a configured provider.
 */

// Libs for third party
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';

// Internal
import { AGENT_HEADER_ACCESS_TOKEN } from '@repo/shared';
import { getChatModel, resolveTrustedContext } from '@repo/agent-runtime';
import {
  IMPROVEMENT_INSTRUCTION,
  RESUME_REVIEWER_SYSTEM_PROMPT,
  STRENGTHS_INSTRUCTION,
} from '@agent/agents/resume-agent/prompt.js';
import { type ActingIdentity, ApiClientError, isApiConfigured } from '@agent/services/api-client.js';
import {
  type ResumeDocument,
  type ResumeSection,
  fetchResume,
  missingResumeSections,
} from '@agent/services/resume-api.js';

/** Bound resume JSON fed to the model so a huge resume cannot flood the prompt. */
const MAX_RESUME_JSON_CHARS = 6_000;

/**
 * Graph state: the chat `messages` channel (required for the platform/chat
 * transports) plus the review's own working data. Channels not returned by
 * a node keep their previous value.
 */
const ResumeReviewState = Annotation.Root({
  ...MessagesAnnotation.spec,
  resume: Annotation<ResumeDocument | undefined>,
  missingSections: Annotation<readonly ResumeSection[] | undefined>,
  loadError: Annotation<string | undefined>,
});

type State = typeof ResumeReviewState.State;

/**
 * Builds the acting identity from the verified claims the embed app injects
 * into the run config — the same trust chain the workspace tools use; the
 * model never chooses whose resume is loaded.
 */
const identityFrom = (config: RunnableConfig): ActingIdentity | undefined => {
  const trusted = resolveTrustedContext(config);
  const accessToken = config.configurable?.[AGENT_HEADER_ACCESS_TOKEN] as unknown;
  if (!trusted || typeof accessToken !== 'string' || !accessToken) return undefined;
  return {
    requestId: trusted.requestId,
    userId: trusted.userId,
    email: trusted.email,
    accessToken,
  };
};

const resumeAsPromptJson = (resume: ResumeDocument): string => {
  const text = JSON.stringify(resume);
  return text.length > MAX_RESUME_JSON_CHARS
    ? `${text.slice(0, MAX_RESUME_JSON_CHARS)}… (truncated)`
    : text;
};

/** Fetches the signed-in user's resume; failures become routable state. */
const loadResume = async (
  _state: State,
  config: RunnableConfig,
): Promise<Partial<State>> => {
  if (!isApiConfigured()) {
    return { loadError: 'The workspace API is not configured on this deployment.' };
  }
  const identity = identityFrom(config);
  if (!identity) {
    throw new Error('Trusted agent context is unavailable');
  }
  try {
    const resume = await fetchResume(identity);
    return { resume, loadError: undefined };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return { loadError: `No resume exists yet for ${identity.email}.` };
    }
    return {
      loadError:
        error instanceof ApiClientError
          ? `The resume service is currently unavailable${error.status ? ` (${error.status})` : ''}.`
          : 'The resume service is currently unavailable.',
    };
  }
};

/** Deterministic completeness check — the data behind the second branch. */
const assess = (state: State): Partial<State> => {
  if (!state.resume) {
    throw new Error('assess requires a loaded resume');
  }
  return { missingSections: missingResumeSections(state.resume) };
};

/** Terminal node for the failure branch — deterministic, no model call. */
const reportUnavailable = (state: State): Partial<State> => ({
  messages: [
    new AIMessage(
      `${state.loadError ?? 'The resume could not be loaded.'} ` +
        'Once your resume exists in the workspace, ask me again and I will review it.',
    ),
  ],
});

const review = async (
  state: State,
  instruction: string,
  detail: string,
): Promise<Partial<State>> => {
  const model = getChatModel('resume-agent-v1');
  const reply = await model.invoke([
    new SystemMessage(RESUME_REVIEWER_SYSTEM_PROMPT),
    new HumanMessage(
      `${instruction}\n\n${detail}\n\nResume JSON:\n${resumeAsPromptJson(state.resume!)}`,
    ),
  ]);
  return { messages: [reply] };
};

const suggestImprovements = (state: State): Promise<Partial<State>> =>
  review(
    state,
    IMPROVEMENT_INSTRUCTION,
    `Missing sections: ${(state.missingSections ?? []).join(', ')}`,
  );

const summarizeStrengths = (state: State): Promise<Partial<State>> =>
  review(state, STRENGTHS_INSTRUCTION, 'Missing sections: none');

export const resumeGraph = new StateGraph(ResumeReviewState)
  .addNode('loadResume', loadResume)
  .addNode('assess', assess)
  .addNode('reportUnavailable', reportUnavailable)
  .addNode('suggestImprovements', suggestImprovements)
  .addNode('summarizeStrengths', summarizeStrengths)
  .addEdge(START, 'loadResume')
  // Branch 1 — fetch outcome: a loaded resume goes on to assessment, any
  // failure ends in the deterministic explanation node.
  .addConditionalEdges(
    'loadResume',
    (state: State) => (state.resume && !state.loadError ? 'assess' : 'reportUnavailable'),
    ['assess', 'reportUnavailable'],
  )
  // Branch 2 — completeness: empty sections get an improvement plan, a full
  // resume gets a strengths summary.
  .addConditionalEdges(
    'assess',
    (state: State) =>
      (state.missingSections ?? []).length > 0
        ? 'suggestImprovements'
        : 'summarizeStrengths',
    ['suggestImprovements', 'summarizeStrengths'],
  )
  .addEdge('reportUnavailable', END)
  .addEdge('suggestImprovements', END)
  .addEdge('summarizeStrengths', END)
  // Compiled WITHOUT a checkpointer: the embedded platform app injects the
  // shared (D1 or in-memory) checkpointer at load time, same as every graph.
  .compile();

/** Alias matching the registry/langgraph.json export convention. */
export const graph = resumeGraph;
