import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { usePDF } from "../context/PDFContext";
import { useMediaQuery } from "../hooks/useMediaQuery";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  onClose?: () => void;
}

const PDFViewer = ({ onClose }: PDFViewerProps) => {
  const {
    pdfData,
    currentPage,
    totalPages,
    setCurrentPage,
    setTotalPages,
    isPdfViewerOpen,
    setIsPdfViewerOpen,
  } = usePDF();

  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const isDesktop = useMediaQuery("(min-width: 64rem)");

  // Convert base64 to data URL
  const pdfDataUrl = pdfData
    ? `data:application/pdf;base64,${pdfData}`
    : null;

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setTotalPages(numPages);
    setLoading(false);
  };

  const handleDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setLoading(false);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleClose = () => {
    setIsPdfViewerOpen(false);
    onClose?.();
  };

  const zoomLevels = [0.75, 1.0, 1.25, 1.5];

  const cycleZoom = () => {
    const currentIndex = zoomLevels.indexOf(scale);
    const nextIndex = (currentIndex + 1) % zoomLevels.length;
    setScale(zoomLevels[nextIndex]);
  };

  if (!pdfDataUrl || !isPdfViewerOpen) {
    return null;
  }

  // Mobile: Full-screen modal
  if (!isDesktop) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Folheto Informativo
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-600 hover:text-gray-800 text-2xl leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto bg-gray-100 flex flex-col items-center p-4 scrollbar-thin">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-lg"
            />
          </Document>
        </div>

        {/* Controls */}
        <div className="h-16 border-t border-gray-200 flex items-center justify-between px-4 bg-white">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
          >
            ◀ Anterior
          </button>

          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={cycleZoom}
              className="px-3 py-2 bg-gray-200 text-gray-800 rounded text-sm font-medium hover:bg-gray-300"
            >
              {Math.round(scale * 100)}%
            </button>
          </div>

          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
          >
            Próxima ▶
          </button>
        </div>
      </div>
    );
  }

  // Desktop: Sidebar panel
  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
        <h3 className="text-base font-semibold text-gray-800">
          Folheto Informativo
        </h3>
        <button
          onClick={handleClose}
          className="text-gray-600 hover:text-gray-800 text-xl leading-none"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto bg-gray-50 flex flex-col items-center p-4 min-h-0 scrollbar-thin">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        <Document
          file={pdfDataUrl}
          onLoadSuccess={handleDocumentLoadSuccess}
          onLoadError={handleDocumentLoadError}
          loading={null}
          className="w-full"
        >
          <Page
            pageNumber={currentPage}
            width={360}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-md"
          />
        </Document>
      </div>

      {/* Controls */}
      <div className="h-16 border-t border-gray-200 flex items-center justify-between px-4 flex-shrink-0 bg-white">
        <button
          onClick={goToPreviousPage}
          disabled={currentPage <= 1}
          className="p-2 text-gray-700 hover:bg-gray-100 rounded disabled:text-gray-300 disabled:cursor-not-allowed"
          aria-label="Página anterior"
        >
          ◀
        </button>

        <div className="flex flex-col items-center">
          <span className="text-xs font-medium text-gray-700">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={cycleZoom}
            className="text-xs text-blue-600 hover:text-blue-700 mt-1"
          >
            🔍 {Math.round(scale * 100)}%
          </button>
        </div>

        <button
          onClick={goToNextPage}
          disabled={currentPage >= totalPages}
          className="p-2 text-gray-700 hover:bg-gray-100 rounded disabled:text-gray-300 disabled:cursor-not-allowed"
          aria-label="Próxima página"
        >
          ▶
        </button>
      </div>
    </div>
  );
};

export default PDFViewer;
