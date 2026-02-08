import { distance } from "fastest-levenshtein";

/**
 * String similarity using fastest-levenshtein for fuzzy matching.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Levenshtein distance-based similarity using fastest-levenshtein
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = distance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}
