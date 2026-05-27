// Citation / CitationRow — amber page-reference chips shown below assistant messages.
// Clicking jumps to that page in the PDF panel (consumer supplies onJump handler).
// This is the product's identity: page references are first-class, not footnotes.

interface CitationProps {
  page: number;
  onJump: (page: number) => void;
}

export function Citation({ page, onJump }: CitationProps) {
  return (
    <button
      onClick={() => onJump(page)}
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
  onJump: (p: number) => void;
}

export function CitationRow({ pages, onJump }: CitationRowProps) {
  if (!pages || pages.length === 0) return null;

  return (
    <div className="mt-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-muted tracking-wider uppercase">
          FONTE
        </span>
        {pages.map((p) => (
          <Citation key={p} page={p} onJump={onJump} />
        ))}
      </div>
    </div>
  );
}
