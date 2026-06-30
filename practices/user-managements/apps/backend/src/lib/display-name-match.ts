/** Normalizes display names for duplicate detection. */
export const normalizeDirectoryDisplayNameKey = (name: string): string =>
  name.trim().replace(/\s+/g, ' ').toLowerCase();
