// Libs for third party
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names with Tailwind-aware conflict resolution.
 *
 * @param inputs - Any number of clsx-compatible class values.
 * @returns A single, de-duplicated className string.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
