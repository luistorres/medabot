import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";

interface PDFContextType {
  currentPage: number;
  totalPages: number;
  pdfData: string | null;
  isPdfViewerOpen: boolean;
  setCurrentPage: (page: number) => void;
  setPdfData: (data: string | null) => void;
  setTotalPages: (total: number) => void;
  jumpToPage: (page: number) => void;
  setIsPdfViewerOpen: (open: boolean) => void;
}

const PDFContext = createContext<PDFContextType | undefined>(undefined);

export const PDFProvider = ({ children }: { children: ReactNode }) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState<boolean>(false);
  const isDesktop = useMediaQuery("(min-width: 64rem)");

  // Auto-open PDF viewer on desktop when PDF data is available
  useEffect(() => {
    if (isDesktop && pdfData) {
      setIsPdfViewerOpen(true);
    }
  }, [isDesktop, pdfData]);

  const jumpToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Auto-open PDF viewer when jumping to a page
      setIsPdfViewerOpen(true);
    }
  };

  return (
    <PDFContext.Provider
      value={{
        currentPage,
        totalPages,
        pdfData,
        isPdfViewerOpen,
        setCurrentPage,
        setPdfData,
        setTotalPages,
        jumpToPage,
        setIsPdfViewerOpen,
      }}
    >
      {children}
    </PDFContext.Provider>
  );
};

export const usePDF = () => {
  const context = useContext(PDFContext);
  if (context === undefined) {
    throw new Error("usePDF must be used within a PDFProvider");
  }
  return context;
};
