import { useState, useEffect, useRef, useCallback } from "react";
import { usePDF } from "../context/PDFContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { usePinchZoom } from "../hooks/usePinchZoom";
import { useSwipeNavigation } from "../hooks/useSwipeNavigation";
import FloatingBackButton from "./ui/FloatingBackButton";

interface PDFViewerProps {
  onClose?: () => void;
  width?: number;
  isTabMode?: boolean;
}

const PDFViewer = ({ onClose, width = 40, isTabMode = false }: PDFViewerProps) => {
  const [isClient, setIsClient] = useState(false);
  const [pdfComponents, setPdfComponents] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const loadPdfComponents = async () => {
      try {
        const reactPdf = await import("react-pdf");
        reactPdf.pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

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
    setCurrentPage,
    setTotalPages,
    isPdfViewerOpen,
    setIsPdfViewerOpen,
  } = usePDF();

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

  // Pulse highlight when jumping from chat
  useEffect(() => {
    if (lastJumpedPage !== null) {
      setIsHighlighting(true);
      const timer = setTimeout(() => setIsHighlighting(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [lastJumpedPage]);

  const pdfDataUrl = pdfData ? `data:application/pdf;base64,${pdfData}` : null;

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setTotalPages(numPages);
    setLoading(false);
  };

  const handleDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setLoading(false);
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

  const pdfContent = (
    <div
      ref={pdfContentRef}
      className={`flex-1 overflow-auto bg-gray-100 flex flex-col items-center p-4 scrollbar-thin min-h-0 ${
        isHighlighting ? "animate-pulse-highlight" : ""
      }`}
    >
      {loading && (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-600"></div>
        </div>
      )}

      <Document
        file={pdfDataUrl}
        onLoadSuccess={handleDocumentLoadSuccess}
        onLoadError={handleDocumentLoadError}
        loading={null}
        className="max-w-full"
      >
        <Page
          pageNumber={currentPage}
          scale={scale}
          width={isDesktop ? (width * 16) - 32 : undefined}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="shadow-lg rounded-lg overflow-hidden"
        />
      </Document>
    </div>
  );

  const controls = (
    <div className="h-14 border-t border-gray-200 flex items-center justify-between px-4 bg-white flex-shrink-0">
      <button
        onClick={goToPreviousPage}
        disabled={currentPage <= 1}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded-xl disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
        aria-label="Página anterior"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      <div className="flex items-center gap-3">
        {isEditingPage ? (
          <input
            type="number"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={handlePageInputSubmit}
            onKeyDown={(e) => e.key === "Enter" && handlePageInputSubmit()}
            className="w-12 text-center text-sm border border-gray-300 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
          >
            {currentPage} / {totalPages}
          </button>
        )}

        {/* Zoom slider */}
        <div className="flex items-center gap-1.5">
          <input
            type="range"
            min={50}
            max={300}
            value={Math.round(scale * 100)}
            onChange={(e) => setScale(parseInt(e.target.value) / 100)}
            className="w-16 h-1 accent-primary-600"
          />
          <span className="text-xs text-gray-500 w-8">{Math.round(scale * 100)}%</span>
        </div>
      </div>

      <button
        onClick={goToNextPage}
        disabled={currentPage >= totalPages}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded-xl disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
        aria-label="Próxima página"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  );

  // Tab mode (mobile, embedded in tab)
  if (!isDesktop && isTabMode) {
    return (
      <div className="h-full bg-white flex flex-col relative">
        {pdfContent}
        {controls}
        <FloatingBackButton />
      </div>
    );
  }

  // Mobile modal mode
  if (!isDesktop) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
          <h3 className="text-lg font-semibold text-gray-800">Folheto Informativo</h3>
          <button
            onClick={handleClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-gray-800 rounded-xl"
            aria-label="Fechar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {pdfContent}
        {controls}
      </div>
    );
  }

  // Desktop sidebar
  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
        <h3 className="text-base font-semibold text-gray-800">Folheto Informativo</h3>
        <button
          onClick={handleClose}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Fechar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {pdfContent}
      {controls}
    </div>
  );
};

export default PDFViewer;
