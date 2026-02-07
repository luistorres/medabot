import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type TabType = "chat" | "medicine" | "pdf";

interface PDFContextType {
  currentPage: number;
  totalPages: number;
  pdfData: string | null;
  isPdfViewerOpen: boolean;
  activeTab: TabType;
  cameFromChat: boolean;
  lastJumpedPage: number | null;
  setCurrentPage: (page: number) => void;
  setPdfData: (data: string | null) => void;
  setTotalPages: (total: number) => void;
  jumpToPage: (page: number) => void;
  setIsPdfViewerOpen: (open: boolean) => void;
  setActiveTab: (tab: TabType) => void;
  setCameFromChat: (value: boolean) => void;
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

  const jumpToPage = useCallback((page: number) => {
    setIsPdfViewerOpen(true);
    setActiveTab("pdf");
    setCameFromChat(true);
    setLastJumpedPage(page);

    if (page >= 1 && (totalPages === 0 || page <= totalPages)) {
      setCurrentPage(page);
    }
  }, [totalPages]);

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
        setCurrentPage,
        setPdfData,
        setTotalPages,
        jumpToPage,
        setIsPdfViewerOpen,
        setActiveTab,
        setCameFromChat,
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
