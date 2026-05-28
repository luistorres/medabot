import { normalizeForMatch } from "../utils/pdfHighlight";

// The model returns two short anchors — the first words (`quoteStart`) and last
// words (`quoteEnd`) of the grounding span — instead of the whole quote, which
// would burn premium output tokens on text we already hold server-side. We
// locate both anchors in a retrieved chunk and slice the RAW text between them.
// This avoids any dependency on sentence segmentation (abbreviations, decimals,
// and pdf-parse's mid-sentence newlines make that unreliable).
const MIN_ANCHOR_WORDS = 3; // specific enough to anchor; mirrors the PDF matcher
const MIN_QUOTE_CHARS = 20; // a substantive span, not a fragment
const MAX_QUOTE_CHARS = 400; // a sentence/span, not a whole chunk

interface RawWord {
  word: string; // normalized
  start: number; // raw offset (inclusive)
  end: number; // raw offset (exclusive)
}

/**
 * Tokenize raw text into normalized words tagged with their raw offset range.
 * A raw token that normalizes to several words (e.g. "0.5mg" → "0", "5mg")
 * tags each with the whole token's offsets — fine for slicing raw spans.
 */
function tokenize(raw: string): RawWord[] {
  const out: RawWord[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const start = m.index;
    const end = m.index + m[0].length;
    for (const word of normalizeForMatch(m[0]).split(" ")) {
      if (word) out.push({ word, start, end });
    }
  }
  return out;
}

/** Index where the consecutive `anchor` word-run begins in `words`, or -1. */
function findRun(words: RawWord[], anchor: string[], from = 0): number {
  for (let i = from; i + anchor.length <= words.length; i++) {
    let ok = true;
    for (let j = 0; j < anchor.length; j++) {
      if (words[i + j].word !== anchor[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

const clean = (s: string | null): string =>
  s
    ?.trim()
    .replace(/==/g, "")
    .replace(/^\s*\[P[áa]gina\s+\d+\]\s*/i, "")
    .trim() ?? "";

/**
 * Resolve the model's start/end anchors into the full span to highlight in the
 * PDF: find the `quoteStart` word-run and, at or after it, the `quoteEnd`
 * word-run within one chunk, then return the raw text spanning them. Matching
 * uses the same normalization as the PDF text-layer matcher, but the RAW span is
 * returned so pdf.js can anchor on displayed text.
 *
 * Returns null — caller falls back to the chunk-level wash — when either anchor
 * is missing/too short, not found in order within a single chunk, resolves to an
 * out-of-bounds span, or is ambiguous (different pages or different spans).
 */
export function resolveSourceQuote(
  quoteStart: string | null,
  quoteEnd: string | null,
  chunks: { text: string; page: number }[],
): { quote: string; page: number } | null {
  const startWords = normalizeForMatch(clean(quoteStart)).split(" ").filter(Boolean);
  const endWords = normalizeForMatch(clean(quoteEnd)).split(" ").filter(Boolean);
  if (startWords.length < MIN_ANCHOR_WORDS || endWords.length < MIN_ANCHOR_WORDS) {
    return null;
  }

  const candidates: { quote: string; page: number }[] = [];
  for (const chunk of chunks) {
    const words = tokenize(chunk.text);
    const startAt = findRun(words, startWords);
    if (startAt === -1) continue;
    // Allow the end-run to overlap the start-run (short spans), but its end must
    // reach at least as far as the start-run's end.
    const endAt = findRun(words, endWords, startAt);
    if (endAt === -1) continue;

    const rawStart = words[startAt].start;
    const rawEnd = Math.max(
      words[startAt + startWords.length - 1].end,
      words[endAt + endWords.length - 1].end,
    );
    if (rawEnd <= rawStart) continue;

    const quote = chunk.text.slice(rawStart, rawEnd).trim();
    if (quote.length < MIN_QUOTE_CHARS || quote.length > MAX_QUOTE_CHARS) continue;
    candidates.push({ quote, page: chunk.page });
  }
  if (candidates.length === 0) return null;

  // Same span repeated across overlapping same-page chunks is fine; different
  // pages or different spans are ambiguous → fall back.
  if (new Set(candidates.map((c) => c.page)).size > 1) return null;
  if (new Set(candidates.map((c) => normalizeForMatch(c.quote))).size > 1) return null;
  return candidates[0];
}
