import type { PDFHighlightTargets } from "../../context/PDFContext";

// Citation / CitationRow — amber page-reference chips shown below assistant messages.
// Clicking jumps to that page in the PDF panel AND passes the source passages for
// that page so the viewer can wash the cited text (consumer supplies onJump).
// This is the product's identity: page references are first-class, not footnotes.

export interface CitationSource {
  page: number;
  text: string;
}

interface CitationProps {
  page: number;
  onJump: (page: number, highlightTexts?: PDFHighlightTargets) => void;
  highlightTexts?: PDFHighlightTargets;
}

export function Citation({ page, onJump, highlightTexts }: CitationProps) {
  return (
    <button
      onClick={() => onJump(page, highlightTexts)}
      aria-label={`Ir para página ${page} do folheto`}
      className="inline-flex items-baseline gap-1 px-2 py-0.5 bg-accent-soft text-accent-ink rounded text-[12px] font-medium hover:brightness-95"
    >
      <span className="font-mono text-[11px] opacity-70">p.</span>
      <span>{page}</span>
    </button>
  );
}

interface CitationRowProps {
  pages: number[];
  onJump: (page: number, highlightTexts?: PDFHighlightTargets) => void;
  /** Source chunks (text + page) the answer was grounded on, for passage highlighting. */
  sources?: CitationSource[];
  sourceQuote?: string | null;
  sourceQuotePage?: number | null;
}

export function CitationRow({
  pages,
  onJump,
  sources,
  sourceQuote,
  sourceQuotePage,
}: CitationRowProps) {
  if (!pages || pages.length === 0) return null;

  return (
    <div className="mt-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-muted tracking-wider uppercase">
          FONTE
        </span>
        {pages.map((p) => (
          // Wash every retrieved source passage on this page. The model cites a
          // page, not a specific chunk, and the relevant passage isn't always the
          // top-similarity one — so highlighting all grounded chunks on the page
          // reliably includes the one the answer drew from.
          <Citation
            key={p}
            page={p}
            onJump={onJump}
            highlightTexts={{
              primary: sourceQuotePage === p ? (sourceQuote ?? null) : null,
              fallbacks:
                sources
                  ?.filter((s) => s.page === p)
                  .map((s) => s.text) ?? [],
            }}
          />
        ))}
      </div>
    </div>
  );
}
