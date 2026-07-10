import type { A2UITheme } from '@copilotkit/react-core/v2';

/**
 * A2UI renderer theme aligned with the app's shadcn tokens in globals.css.
 * Passed to CopilotKit so generative surfaces match the chat shell.
 */
export const COPILOT_A2UI_THEME: A2UITheme = {
  colors: {
    primary: '#18181b',
    accent: '#71717a',
    background: '#ffffff',
    foreground: '#09090b',
    border: '#e4e4e7',
  },
};

/** Client-side A2UI options forwarded to the CopilotKit provider. */
export const COPILOT_A2UI_CONFIG = {
  theme: COPILOT_A2UI_THEME,
} as const;
