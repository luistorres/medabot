import { useRef, useState, useEffect, useCallback } from "react";
import Card from "./ui/Card";
import Button from "./ui/Button";

export interface Candidate {
  name: string;
  activeSubstance: string;
  similarity: number;
  pharmaceuticalForm?: string;
  dosage?: string;
  titular?: string;
}

interface DisambiguationCardProps {
  candidates: Candidate[];
  onSelect: (candidate: Candidate) => void;
  onNoneMatch: () => void;
}

const DisambiguationCard = ({ candidates, onSelect, onNoneMatch }: DisambiguationCardProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);

  const checkScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;

    const isScrollable = el.scrollHeight > el.clientHeight;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 12;
    setCanScrollDown(isScrollable && !isAtBottom);

    // Count items not fully visible
    if (isScrollable && !isAtBottom) {
      const listBottom = el.getBoundingClientRect().bottom;
      let count = 0;
      for (const child of el.children) {
        if (child.getBoundingClientRect().top >= listBottom - 8) count++;
      }
      setHiddenCount(count);
    } else {
      setHiddenCount(0);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const el = listRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, candidates]);

  return (
    <Card padding="lg" className="animate-fade-in max-h-[calc(100dvh-2rem)] flex flex-col">
      <div className="flex items-start gap-3 mb-5 flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-warning-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">Encontrámos várias opções</h4>
          <p className="text-sm text-gray-500 mt-0.5">Selecione o medicamento correto:</p>
        </div>
      </div>

      <div className="relative min-h-0">
        <div ref={listRef} className="space-y-2.5 overflow-y-auto min-h-0 max-h-[calc(100dvh-16rem)]">
        {candidates.map((candidate, i) => (
          <button
            key={i}
            onClick={() => onSelect(candidate)}
            className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 group-hover:text-primary-700 leading-snug">
                  {candidate.name}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{candidate.activeSubstance}</p>

                {(candidate.pharmaceuticalForm || candidate.dosage || candidate.titular) && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {candidate.pharmaceuticalForm && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                        </svg>
                        {candidate.pharmaceuticalForm}
                      </span>
                    )}
                    {candidate.dosage && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
                        </svg>
                        {candidate.dosage}
                      </span>
                    )}
                    {candidate.titular && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
                        </svg>
                        {candidate.titular}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full flex-shrink-0 mt-0.5">
                {Math.round(candidate.similarity * 100)}%
              </span>
            </div>
          </button>
        ))}
        </div>

        {/* Fade gradient overlay — signals more content below */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent rounded-b-xl transition-opacity duration-300"
          style={{ opacity: canScrollDown ? 1 : 0 }}
        />

        {/* Scroll hint pill */}
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 transition-all duration-300"
          style={{
            opacity: canScrollDown ? 1 : 0,
            transform: `translateX(-50%) translateY(${canScrollDown ? "0" : "8px"})`,
            pointerEvents: canScrollDown ? "auto" : "none",
          }}
        >
          <button
            type="button"
            onClick={() => listRef.current?.scrollBy({ top: 200, behavior: "smooth" })}
            className="flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-gray-200/60 hover:bg-gray-200/90 transition-colors"
          >
            <svg className="w-3 h-3 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
            </svg>
            {hiddenCount > 0 ? `${hiddenCount} mais abaixo` : "Mais opções"}
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 mt-4">
        <Button variant="ghost" fullWidth onClick={onNoneMatch}>
          Nenhum destes - pesquisar manualmente
        </Button>
      </div>
    </Card>
  );
};

export default DisambiguationCard;
