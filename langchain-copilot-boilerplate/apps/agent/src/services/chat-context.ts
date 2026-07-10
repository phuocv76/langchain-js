const REST_CONTEXT_DESCRIPTION = 'REST API request context';

/** Converts the plain REST context object into CopilotKit-compatible graph state. */
export const buildRestCopilotKitState = (
  context: Readonly<Record<string, unknown>> | undefined,
):
  | {
      copilotkit: {
        actions: never[];
        context: Array<{ description: string; value: string }>;
        interceptedToolCalls: never[];
      };
    }
  | undefined => {
  if (!context || Object.keys(context).length === 0) {
    return undefined;
  }

  return {
    copilotkit: {
      actions: [],
      context: [
        {
          description: REST_CONTEXT_DESCRIPTION,
          value: JSON.stringify(context),
        },
      ],
      interceptedToolCalls: [],
    },
  };
};
