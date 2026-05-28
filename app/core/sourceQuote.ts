import { normalizeForMatch } from "../utils/pdfHighlight";

/**
 * Validate the model-provided source quote before it reaches the PDF viewer.
 *
 * The quote must be a single, useful, verbatim span from exactly one retrieved
 * chunk context. Matching uses the same normalization as the PDF text-layer
 * matcher, but the raw quote is returned so pdf.js can anchor on displayed text.
 */
export function validateSourceQuote(
  quote: string | null,
  chunks: { text: string; page: number }[],
): { quote: string; page: number } | null {
  const cleaned = quote
    ?.trim()
    .replace(/==/g, "")
    .replace(/^\s*\[P[áa]gina\s+\d+\]\s*/i, "")
    .trim();

  if (!cleaned) return null;
  if (cleaned.length < 20 || cleaned.length > 400) return null;

  const normalizedQuote = normalizeForMatch(cleaned);
  const quoteWords = normalizedQuote.split(" ").filter(Boolean);
  if (quoteWords.length < 3) return null;

  const matches = chunks
    .map((chunk) => ({
      page: chunk.page,
      normalizedText: normalizeForMatch(chunk.text),
    }))
    .filter((chunk) => chunk.normalizedText.includes(normalizedQuote));

  if (matches.length === 1) {
    return { quote: cleaned, page: matches[0].page };
  }

  if (matches.length > 1) {
    const pages = new Set(matches.map((m) => m.page));
    const texts = new Set(matches.map((m) => m.normalizedText));
    if (pages.size === 1 && texts.size === 1) {
      return { quote: cleaned, page: matches[0].page };
    }
  }

  return null;
}
