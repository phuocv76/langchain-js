/**
 * Normalizes optional profile patch values from tool payloads.
 * undefined/null = unchanged; "" = clear.
 */
export const normalizeProfilePatchValue = (
  raw: unknown,
): string | null | undefined => {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  if (t === '') return null;
  return t;
};

/** Strips mistaken null clears from update tool payloads. */
export const sanitizeUserUpdateToolInput = (
  input: unknown,
): Record<string, unknown> => {
  if (typeof input !== 'object' || input === null) return {};
  const p = { ...(input as Record<string, unknown>) };

  if ('date_of_birth' in p) {
    const v = normalizeProfilePatchValue(p.date_of_birth);
    if (v === undefined) delete p.date_of_birth;
    else p.date_of_birth = v;
  }

  if ('bio' in p) {
    const v = normalizeProfilePatchValue(p.bio);
    if (v === undefined) delete p.bio;
    else p.bio = v;
  }

  return p;
};
