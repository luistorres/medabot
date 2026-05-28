import pdfParse from "pdf-parse";
import { createHash } from "crypto";

export interface PageText {
  page: number;
  text: string;
}

export interface LeafletDoc {
  pages: PageText[];
  totalPages: number;
}

// pdf-parse joins page texts with "\n\n" and prepends it before page 1, so the
// full text is "\n\n" + page1 + "\n\n" + page2 + ...
export const PAGE_JOINER = "\n\n";

/**
 * Extract per-page text from a base64 PDF (no embeddings). Page numbers are
 * 1-based and ALWAYS preserved: blank pages are kept as `{ page, text: "" }` so
 * downstream page numbering, citation validation and PDF jumps stay correct.
 */
export async function extractPageTexts(pdfBase64: string): Promise<PageText[]> {
  const pdfBuffer = Buffer.from(pdfBase64, "base64");
  const pageTexts: string[] = [];

  const pagerender = (pageData: any): Promise<string> => {
    const renderOptions = { normalizeWhitespace: false, disableCombineTextItems: false };
    return pageData.getTextContent(renderOptions).then((textContent: any) => {
      let lastY: number | undefined;
      let text = "";
      for (const item of textContent.items) {
        if (lastY === item.transform[5] || lastY === undefined) text += item.str;
        else text += "\n" + item.str;
        lastY = item.transform[5];
      }
      pageTexts.push(text);
      return text;
    });
  };

  const pdf = await pdfParse(pdfBuffer, { pagerender });

  let raw: string[];
  if (pageTexts.length === pdf.numpages) {
    // Trust pagerender's per-page capture as long as the page COUNT matches,
    // even if pdf.text's exact join differs (formatting-only mismatches).
    raw = pageTexts;
  } else {
    console.warn(
      `[extractPageTexts] page-count invariant failed (captured ${pageTexts.length}, ` +
        `numpages=${pdf.numpages}); splitting pdf.text on PAGE_JOINER.`,
    );
    // Drop the artificial leading joiner before splitting so page 1 stays page 1.
    const body = pdf.text.startsWith(PAGE_JOINER)
      ? pdf.text.slice(PAGE_JOINER.length)
      : pdf.text;
    const split = body.split(PAGE_JOINER);
    // Reconcile to the true page count so page numbers AND totalPages stay
    // correct: truncate extra segments, pad missing tail pages with "".
    if (split.length > pdf.numpages) {
      console.warn(
        `[extractPageTexts] fallback produced ${split.length} segments > ${pdf.numpages} pages; truncating.`,
      );
      raw = split.slice(0, pdf.numpages);
    } else {
      raw = split;
      while (raw.length < pdf.numpages) raw.push("");
    }
  }

  // One entry per page, real 1-based number, blanks kept for numbering integrity.
  return raw.map((text, i) => ({ page: i + 1, text: text.trim() }));
}

// ~chars/3.5 is a good-enough token estimate for pt-PT; no tokenizer dependency.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

// Generous budget: ~60k tokens of leaflet text is never reached by a ≤50-page
// patient leaflet. The truncation path is a safety valve, not a real code path.
// NOTE: truncation does not shrink LeafletDoc.totalPages — for the product's
// input range it never fires, so the (benign) case of a citation pointing at a
// truncated-away page is out of scope.
const TOKEN_BUDGET = 60_000;

/** Page-tagged context string. Skips blank pages but keeps real page numbers. */
export function assembleLeafletContext(pages: PageText[], budget = TOKEN_BUDGET): string {
  const parts: string[] = [];
  let used = 0;
  for (const p of pages) {
    if (!p.text) continue; // blank page — kept for numbering, not sent to the model
    const block = `[Página ${p.page}]\n${p.text}`;
    const cost = estimateTokens(block);
    if (used + cost > budget && parts.length > 0) {
      console.warn(`[leafletStore] Leaflet exceeds token budget (~${budget}); truncating at page ${p.page}.`);
      break;
    }
    parts.push(block);
    used += cost;
  }
  return parts.join("\n\n---\n\n");
}

/**
 * Validate model-reported cited pages: keep integers in 1..totalPages, dedupe,
 * sort. `ensure` (the page where a verbatim quote was actually found) is always
 * included when valid, so a misreported page number can't drop a real citation.
 */
export function validateCitedPages(
  pages: number[] | null | undefined,
  totalPages: number,
  ensure?: number | null,
): number[] {
  const set = new Set<number>();
  for (const p of pages ?? []) {
    if (Number.isInteger(p) && p >= 1 && p <= totalPages) set.add(p);
  }
  if (ensure != null && Number.isInteger(ensure) && ensure >= 1 && ensure <= totalPages) {
    set.add(ensure);
  }
  return [...set].sort((a, b) => a - b);
}

/** Split a page into matcher-friendly fallback targets (≥3 words each). */
export function pageParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}|\n/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length >= 3);
}

// Module-level cache: PDF hash → parsed page-doc. Replaces the two duplicate
// embedding caches in queryLeaflet.ts and extractMedicineSummary.ts.
const docCache = new Map<string, LeafletDoc>();
// In-flight dedup: the overview + warnings calls fire in parallel on first load
// (App.tsx Promise.all), so a single cold parse must be shared, not run twice.
const inFlight = new Map<string, Promise<LeafletDoc>>();

function hashPdf(pdfBase64: string): string {
  return createHash("sha256").update(pdfBase64).digest("hex");
}

/** PDF hash — exported so callers can reuse it as a per-medicine prompt_cache_key. */
export function leafletCacheKey(pdfBase64: string): string {
  return hashPdf(pdfBase64);
}

export async function getLeafletDoc(pdfBase64: string): Promise<LeafletDoc> {
  const key = hashPdf(pdfBase64);
  const cached = docCache.get(key);
  if (cached) return cached;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const load = (async () => {
    const pages = await extractPageTexts(pdfBase64);
    const doc: LeafletDoc = { pages, totalPages: pages.length }; // length === pdf.numpages
    docCache.set(key, doc);
    return doc;
  })();
  inFlight.set(key, load);
  try {
    return await load;
  } finally {
    inFlight.delete(key); // clear on success or failure so a failed parse can retry
  }
}
