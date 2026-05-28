// Helpers for highlighting a cited passage inside the PDF.js text layer.
//
// The challenge (per design §8.8/§10): we have the source chunk text the RAG
// answer was grounded on, and we want to wash exactly those words on the
// rendered page. pdf.js exposes the page as an ordered array of text items
// (roughly word/segment fragments). We map our target passage to the set of
// item indices it spans, then `customTextRenderer` washes those items.
//
// pdf-parse (used at ingest) and pdf.js (used at render) don't segment text
// identically — spacing, ligatures, hyphenation and order can differ — so we
// match at the normalized-word level with an anchor + span rather than an
// exact substring, and fall back to a page-level wash when nothing matches.

/** Lowercase, decompose ligatures/accents, drop diacritics, keep alphanumerics. */
export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // combining marks (accents)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

interface PageToken {
  word: string;
  itemIndex: number;
}

/** Flatten ordered text items into normalized words tagged with their item index. */
function tokenizePage(items: { str: string }[]): PageToken[] {
  const tokens: PageToken[] = [];
  items.forEach((item, itemIndex) => {
    const norm = normalizeForMatch(item.str);
    if (!norm) return;
    for (const word of norm.split(" ")) {
      if (word) tokens.push({ word, itemIndex });
    }
  });
  return tokens;
}

/**
 * Compute the set of text-item indices that the given target passages span on
 * a page. For each target we anchor on its first few words, then highlight the
 * run of page tokens covering the target's word length. Returns an empty set
 * when nothing anchors (caller should fall back to a page-level wash).
 */
export function computeHighlightItemIndices(
  items: { str: string }[],
  targets: string[]
): Set<number> {
  const result = new Set<number>();
  if (!items?.length || !targets?.length) return result;

  const pageTokens = tokenizePage(items);
  if (!pageTokens.length) return result;
  const pageWords = pageTokens.map((t) => t.word);

  for (const target of targets) {
    const targetWords = normalizeForMatch(target).split(" ").filter(Boolean);
    if (targetWords.length === 0) continue;

    // Anchor on the first few words (full target if it's short). A longer
    // anchor avoids false matches on common words.
    const anchorLen = Math.min(
      targetWords.length,
      Math.max(4, Math.min(8, targetWords.length))
    );
    const anchor = targetWords.slice(0, anchorLen);

    let anchorAt = -1;
    for (let i = 0; i + anchorLen <= pageWords.length; i++) {
      let ok = true;
      for (let j = 0; j < anchorLen; j++) {
        if (pageWords[i + j] !== anchor[j]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        anchorAt = i;
        break;
      }
    }
    if (anchorAt === -1) continue;

    // Highlight from the anchor across roughly the target's word length,
    // clamped to the page. Tolerates mid-passage segmentation differences.
    const end = Math.min(pageTokens.length, anchorAt + targetWords.length);
    for (let k = anchorAt; k < end; k++) {
      result.add(pageTokens[k].itemIndex);
    }
  }

  return result;
}

/** Escape a raw text-item string for safe HTML insertion via customTextRenderer. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
