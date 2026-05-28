import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type TabType = "chat" | "medicine" | "pdf";

export interface PDFHighlightTargets {
  primary: string | null;
  fallbacks: string[];
}

interface PDFContextType {
  currentPage: number;
  totalPages: number;
  pdfData: string | null;
  isPdfViewerOpen: boolean;
  activeTab: TabType;
  cameFromChat: boolean;
  lastJumpedPage: number | null;
  /** Source passages to wash on the jumped page (quote first, chunks as fallback). */
  highlightTexts: PDFHighlightTargets;
  setCurrentPage: (page: number) => void;
  setPdfData: (data: string | null) => void;
  setTotalPages: (total: number) => void;
  jumpToPage: (page: number, highlightTexts?: PDFHighlightTargets) => void;
  setIsPdfViewerOpen: (open: boolean) => void;
  setActiveTab: (tab: TabType) => void;
  setCameFromChat: (value: boolean) => void;
  setLastJumpedPage: (page: number | null) => void;
}

const PDFContext = createContext<PDFContextType | undefined>(undefined);

export const PDFProvider = ({ children }: { children: ReactNode }) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [cameFromChat, setCameFromChat] = useState<boolean>(false);
  const [lastJumpedPage, setLastJumpedPage] = useState<number | null>(null);
  const [highlightTexts, setHighlightTexts] = useState<PDFHighlightTargets>({
    primary: null,
    fallbacks: [],
  });

  const jumpToPage = useCallback(
    (page: number, texts: PDFHighlightTargets = { primary: null, fallbacks: [] }) => {
      setIsPdfViewerOpen(true);
      setActiveTab("pdf");
      setCameFromChat(true);
      setLastJumpedPage(page);
      setHighlightTexts(texts);

      if (page >= 1 && (totalPages === 0 || page <= totalPages)) {
        setCurrentPage(page);
      }
    },
    [totalPages]
  );

  return (
    <PDFContext.Provider
      value={{
        currentPage,
        totalPages,
        pdfData,
        isPdfViewerOpen,
        activeTab,
        cameFromChat,
        lastJumpedPage,
        highlightTexts,
        setCurrentPage,
        setPdfData,
        setTotalPages,
        jumpToPage,
        setIsPdfViewerOpen,
        setActiveTab,
        setCameFromChat,
        setLastJumpedPage,
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
