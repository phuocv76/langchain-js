'use client';

// Libs for third party
import { useFrontendTool } from '@copilotkit/react-core/v2';
import { useTheme } from 'next-themes';
import { z } from 'zod';

/**
 * Theme Agent.
 *
 * Registers a client-side `setTheme` tool so the assistant can change the app
 * theme in response to prompts like "change theme to dark" or "use light mode".
 * Runs entirely in the browser via next-themes — no round trip to the graph.
 */
export const ThemeAgent = (): null => {
  const { setTheme } = useTheme();

  useFrontendTool(
    {
      name: 'setTheme',
      description:
        'Change the application color theme. Use when the user asks to ' +
        'switch appearance, e.g. "change theme to dark", "use light mode", ' +
        'or "switch back to system theme".',
      parameters: z.object({
        theme: z
          .enum(['light', 'dark', 'system'])
          .describe('The theme to apply.'),
      }),
      handler: async ({ theme }): Promise<string> => {
        setTheme(theme);
        return `Theme changed to ${theme}.`;
      },
    },
    [setTheme],
  );

  return null;
};
