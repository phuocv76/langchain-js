// Internal
import { type ActingIdentity, apiRequest } from '@agent/services/api-client.js';

/**
 * Resume document served by the space API (`GET /api/v1/resumes/:resumeId`).
 * Section item shapes stay loose on purpose — the agent summarizes them for
 * the model, it never depends on individual fields.
 */
export interface ResumeDocument {
  readonly id: string;
  readonly info?: Record<string, unknown> | null;
  readonly journeys?: readonly unknown[];
  readonly skills?: readonly unknown[];
  readonly education?: readonly unknown[];
  readonly links?: readonly unknown[];
  readonly certs?: readonly unknown[];
  readonly updatedAt?: string;
}

/** Resume section names, in the order the review discusses them. */
export const RESUME_SECTIONS = [
  'info',
  'journeys',
  'skills',
  'education',
  'links',
  'certs',
] as const;

export type ResumeSection = (typeof RESUME_SECTIONS)[number];

/**
 * Fetches a resume as the verified acting user. Resume ids are employee
 * emails; defaulting to the caller's own email means "review my resume"
 * needs no arguments and can never be steered to another identity by the
 * model.
 */
export const fetchResume = async (
  identity: ActingIdentity,
  resumeId?: string,
): Promise<ResumeDocument> =>
  apiRequest<ResumeDocument>(
    `/api/v1/resumes/${encodeURIComponent(resumeId ?? identity.email)}`,
    { identity },
  );

/**
 * Deterministic completeness check driving the graph's conditional edge:
 * a section counts as missing when it is absent or empty. Pure on purpose —
 * routing decisions stay testable without a model or network.
 */
export const missingResumeSections = (
  resume: ResumeDocument,
): ResumeSection[] =>
  RESUME_SECTIONS.filter((section) => {
    const value = resume[section];
    if (value === undefined || value === null) return true;
    if (Array.isArray(value)) return value.length === 0;
    return Object.keys(value).length === 0;
  });
