import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePDF } from "../context/PDFContext";
import { computeHighlightItemIndices, escapeHtml } from "../utils/pdfHighlight";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { usePinchZoom } from "../hooks/usePinchZoom";
import { useSwipeNavigation } from "../hooks/useSwipeNavigation";
import FloatingBackButton from "./ui/FloatingBackButton";
import { Icon } from "./ui/Icon";

interface PDFViewerProps {
  onClose?: () => void;
  width?: number;
  isTabMode?: boolean;
}

const PDFViewer = ({ onClose, width = 40, isTabMode = false }: PDFViewerProps) => {
  const [isClient, setIsClient] = useState(false);
  const [pdfComponents, setPdfComponents] = useState<any>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadPdfComponents = async () => {
      try {
        const reactPdf = await import("react-pdf");
        reactPdf.pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        // Text layer CSS is required for customTextRenderer highlighting; loaded
        // here (client-only) to stay SSR-safe like the rest of react-pdf.
        await import("react-pdf/dist/Page/TextLayer.css");

        if (mounted) {
          setPdfComponents({
            Document: reactPdf.Document,
            Page: reactPdf.Page,
          });
          setIsClient(true);
        }
      } catch (error) {
        console.error("Failed to load PDF components:", error);
      }
    };

    loadPdfComponents();
    return () => { mounted = false; };
  }, []);

  const {
    pdfData,
    currentPage,
    totalPages,
    lastJumpedPage,
    highlightTexts,
    setCurrentPage,
    setTotalPages,
    isPdfViewerOpen,
    setIsPdfViewerOpen,
  } = usePDF();

  // Text items of the currently-rendered page (from react-pdf onGetTextSuccess),
  // used to map cited passages to the text-layer item indices we wash amber.
  const [pageTextItems, setPageTextItems] = useState<{ str: string }[]>([]);

  const highlightItemSet = useMemo(
    () => computeHighlightItemIndices(pageTextItems, highlightTexts),
    [pageTextItems, highlightTexts]
  );

  const customTextRenderer = useCallback(
    ({ str, itemIndex }: { str: string; itemIndex: number }) =>
      highlightItemSet.has(itemIndex)
        ? `<mark class="mb-pdf-hl">${escapeHtml(str)}</mark>`
        : escapeHtml(str),
    [highlightItemSet]
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [pageInput, setPageInput] = useState<string>("");
  const [isEditingPage, setIsEditingPage] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 64rem)");

  const pdfContentRef = useRef<HTMLDivElement>(null);
  const { scale, setScale } = usePinchZoom(pdfContentRef as React.RefObject<HTMLElement>, {
    initialScale: 1.0,
    minScale: 0.5,
    maxScale: 3.0,
  });

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  }, [currentPage, totalPages, setCurrentPage]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  }, [currentPage, setCurrentPage]);

  useSwipeNavigation(pdfContentRef as React.RefObject<HTMLElement>, {
    onSwipeLeft: goToNextPage,
    onSwipeRight: goToPreviousPage,
  });

  // Amber wash highlight when jumping from chat (brief page-level cue; the
  // precise passage highlight is applied via customTextRenderer below).
  useEffect(() => {
    if (lastJumpedPage !== null) {
      setIsHighlighting(true);
      const timer = setTimeout(() => setIsHighlighting(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastJumpedPage]);

  // Clear stale text items when the page changes; onGetTextSuccess repopulates
  // for the new page, so the passage highlight only applies to matching pages.
  useEffect(() => {
    setPageTextItems([]);
  }, [currentPage]);

  const pdfDataUrl = pdfData ? `data:application/pdf;base64,${pdfData}` : null;

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setTotalPages(numPages);
    setLoading(false);
    setLoadError(false);
  };

  const handleDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setLoading(false);
    setLoadError(true);
  };

  const handleClose = () => {
    setIsPdfViewerOpen(false);
    onClose?.();
  };

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInput, 10);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
    setIsEditingPage(false);
  };

  if (!isClient || !pdfComponents || !pdfDataUrl || (!isTabMode && !isPdfViewerOpen)) {
    return null;
  }

  const { Document, Page } = pdfComponents;

  // Error state — centered block
  const errorState = (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted mb-2">
          FOLHETO NÃO DISPONÍVEL
        </p>
        <p className="font-serif text-[16px] text-ink leading-snug">
          Não foi possível carregar o folheto agora.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={handleClose}
          className="text-[13px] text-brand underline underline-offset-4 hover:text-brand-deep transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );

  // Header strip (§8.8)
  const headerStrip = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-rule bg-bg flex-shrink-0">
      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted leading-none mb-0.5">
          FOLHETO INFORMATIVO
        </p>
        <p className="text-[12px] text-ink-2 leading-none">
          Página{" "}
          <span className="font-mono">{currentPage}</span>
          {" "}de{" "}
          <span className="font-mono">{totalPages || "—"}</span>
        </p>
      </div>
      <div className="flex items-center gap-1">
        {/* Prev button — 28×28 square, border-ink rounded-sm */}
        <button
          onClick={goToPreviousPage}
          disabled={currentPage <= 1}
          className="w-7 h-7 flex items-center justify-center border border-ink rounded-sm text-ink disabled:text-muted disabled:border-muted disabled:cursor-not-allowed transition-colors hover:bg-tint"
          aria-label="Página anterior"
        >
          <Icon.chevron className="w-3.5 h-3.5 rotate-180" />
        </button>
        {/* Next button */}
        <button
          onClick={goToNextPage}
          disabled={currentPage >= totalPages}
          className="w-7 h-7 flex items-center justify-center border border-ink rounded-sm text-ink disabled:text-muted disabled:border-muted disabled:cursor-not-allowed transition-colors hover:bg-tint"
          aria-label="Próxima página"
        >
          <Icon.chevron className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  const pdfContent = (
    <div
      ref={pdfContentRef}
      className={`flex-1 overflow-auto bg-bg flex flex-col items-center p-4 scrollbar-thin min-h-0 ${
        isHighlighting ? "animate-amber-wash" : ""
      }`}
    >
      {loading && (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-soft border-t-brand"></div>
        </div>
      )}

      {loadError ? errorState : (
        <Document
          file={pdfDataUrl}
          onLoadSuccess={handleDocumentLoadSuccess}
          onLoadError={handleDocumentLoadError}
          loading={null}
          className="max-w-full"
        >
          {/* Page wrapper: warm paper bg + hairline border + shadow-1 */}
          <div className="bg-[#FEFCF7] border border-border shadow-1 rounded-sm overflow-hidden">
            <Page
              pageNumber={currentPage}
              scale={scale}
              width={isDesktop ? (width * 16) - 32 : undefined}
              renderTextLayer={true}
              renderAnnotationLayer={false}
              onGetTextSuccess={({ items }: { items: { str: string }[] }) =>
                setPageTextItems(items)
              }
              customTextRenderer={customTextRenderer}
            />
          </div>
        </Document>
      )}
    </div>
  );

  // Zoom controls strip (bottom)
  const zoomStrip = (
    <div className="h-10 border-t border-rule flex items-center justify-center gap-2 px-4 bg-bg flex-shrink-0">
      {isEditingPage ? (
        <input
          type="number"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onBlur={handlePageInputSubmit}
          onKeyDown={(e) => e.key === "Enter" && handlePageInputSubmit()}
          className="w-12 text-center text-sm border border-border rounded-sm py-1 bg-paper text-ink focus:outline-none focus:ring-1 focus:ring-brand"
          min={1}
          max={totalPages}
          autoFocus
        />
      ) : (
        <button
          onClick={() => {
            setPageInput(currentPage.toString());
            setIsEditingPage(true);
          }}
          className="text-xs text-muted hover:text-ink transition-colors font-mono"
        >
          {currentPage} / {totalPages}
        </button>
      )}
      <span className="text-muted text-[10px]">·</span>
      <div className="flex items-center gap-1.5">
        <input
          type="range"
          min={50}
          max={300}
          value={Math.round(scale * 100)}
          onChange={(e) => setScale(parseInt(e.target.value) / 100)}
          className="w-16 h-1 accent-brand"
        />
        <span className="text-[11px] text-muted font-mono w-8">{Math.round(scale * 100)}%</span>
      </div>
    </div>
  );

  // Tab mode (mobile, embedded in tab)
  if (!isDesktop && isTabMode) {
    return (
      <div className="h-full bg-bg flex flex-col relative">
        {headerStrip}
        {pdfContent}
        {zoomStrip}
        <FloatingBackButton />
      </div>
    );
  }

  // Mobile modal mode
  if (!isDesktop) {
    return (
      <div className="fixed inset-0 z-50 bg-bg flex flex-col">
        {headerStrip}
        {pdfContent}
        {zoomStrip}
      </div>
    );
  }

  // Desktop sidebar
  return (
    <div className="h-full flex flex-col bg-bg border-l border-rule">
      {headerStrip}
      {pdfContent}
      {zoomStrip}
    </div>
  );
};

export default PDFViewer;
