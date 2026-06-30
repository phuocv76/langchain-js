export const COPILOT_RUNTIME_URL =
  typeof __COPILOT_RUNTIME_URL__ !== 'undefined'
    ? __COPILOT_RUNTIME_URL__
    : '/api/copilotkit';
export { AGENT_ID } from '@/lib/constants/messages';

declare global {
  const __USER_API_URL__: string;
  const __COPILOT_RUNTIME_URL__: string;
}

export const USER_API_URL =
  typeof __USER_API_URL__ !== 'undefined'
    ? __USER_API_URL__
    : 'http://localhost:4000';
