import { normalizeForMatch } from "../utils/pdfHighlight";

// The model returns only a short ANCHOR (the first few words of the grounding
// sentence), not the whole span — copying a full verbatim quote into the output
// would burn premium output tokens on text we already hold server-side. We
// locate that anchor in a retrieved chunk and expand it to the enclosing
// sentence here, for free.
const MIN_ANCHOR_WORDS = 3; // enough to anchor uniquely; mirrors the PDF matcher
const MIN_QUOTE_CHARS = 20; // a substantive span, not a fragment
const MAX_QUOTE_CHARS = 400; // a sentence, not a whole chunk

/** Split a chunk's raw text into trimmed sentence-ish spans. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Resolve the model's short quote anchor into the full sentence to highlight in
 * the PDF. The anchor is the first ~6-8 words (verbatim) of the single sentence
 * from the retrieved context that grounds the answer; we find the sentence that
 * contains it and return that whole sentence.
 *
 * Matching uses the same normalization as the PDF text-layer matcher
 * (pdfHighlight.normalizeForMatch), but the RAW sentence is returned so pdf.js
 * can anchor on displayed text. Returns null — caller falls back to the
 * chunk-level wash — when the anchor is absent, too short, not found, resolves
 * to an over-long span, or is ambiguous (different pages, or different
 * sentences on the same page).
 */
export function resolveSourceQuote(
  anchor: string | null,
  chunks: { text: string; page: number }[],
): { quote: string; page: number } | null {
  const cleaned = anchor
    ?.trim()
    .replace(/==/g, "")
    .replace(/^\s*\[P[áa]gina\s+\d+\]\s*/i, "")
    .trim();
  if (!cleaned) return null;

  const normalizedAnchor = normalizeForMatch(cleaned);
  if (normalizedAnchor.split(" ").filter(Boolean).length < MIN_ANCHOR_WORDS) {
    return null;
  }

  // Find the sentence containing the anchor in each chunk.
  const matches: { sentence: string; normalized: string; page: number }[] = [];
  for (const chunk of chunks) {
    for (const sentence of splitSentences(chunk.text)) {
      const normalized = normalizeForMatch(sentence);
      if (normalized.includes(normalizedAnchor)) {
        matches.push({ sentence, normalized, page: chunk.page });
      }
    }
  }
  if (matches.length === 0) return null;

  // Ambiguous if the anchor lands on different pages, or on genuinely different
  // sentences within a page. Same sentence repeated across overlapping chunks
  // (the common case — chunks overlap by 150 chars) is fine.
  if (new Set(matches.map((m) => m.page)).size > 1) return null;
  if (new Set(matches.map((m) => m.normalized)).size > 1) return null;

  const quote = matches[0].sentence;
  if (quote.length < MIN_QUOTE_CHARS || quote.length > MAX_QUOTE_CHARS) {
    return null;
  }
  return { quote, page: matches[0].page };
}
