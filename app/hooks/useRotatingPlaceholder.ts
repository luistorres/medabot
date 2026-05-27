import { useState, useEffect } from "react";

/**
 * Cycles through a list of placeholder strings while `active` is true,
 * adding subtle life to an empty/unfocused input. When `active` is false
 * (input focused or non-empty), rotation pauses and the current value is held.
 *
 * Respects `prefers-reduced-motion: reduce` — when reduced motion is
 * requested, rotation never starts and the first option is returned.
 */
export function useRotatingPlaceholder(
  options: string[],
  active: boolean,
  intervalMs = 4500
): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || options.length <= 1) return;

    // Respect reduced-motion preference: never rotate.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const id = setInterval(() => {
      setIndex((i) => (i + 1) % options.length);
    }, intervalMs);

    return () => clearInterval(id);
  }, [active, options.length, intervalMs]);

  if (options.length === 0) return "";
  return options[index % options.length];
}
