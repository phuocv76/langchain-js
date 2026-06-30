/** Normalizes display names for duplicate detection (trim, lowercase, collapse spaces). */
export const normalizeDirectoryDisplayNameKey = (name: string): string =>
  name.trim().replace(/\s+/g, ' ').toLowerCase();

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** True when latest user text identifies a specific directory row. */
export const userLatestTextIdentifiesDirectoryRecord = (
  latestText: string,
  record: { id: string; email: string; date_of_birth: string | null },
): boolean => {
  const t = latestText.toLowerCase();
  if (t.includes(record.id.toLowerCase())) return true;

  const emailNorm = record.email.trim().toLowerCase();
  for (const raw of latestText.match(EMAIL_PATTERN) ?? []) {
    if (raw.trim().toLowerCase() === emailNorm) return true;
  }

  if (record.date_of_birth?.trim()) {
    if (t.includes(record.date_of_birth.trim().toLowerCase())) return true;
  }

  return false;
};
