import { ReactNode, useState, useRef, useEffect } from "react";
import { usePDF } from "../../context/PDFContext";
import PDFViewer from "../PDFViewer";
import { Wordmark } from "../ui/Wordmark";
import { SourceBadge } from "../ui/SourceBadge";
import Button from "../ui/Button";

interface DesktopLayoutProps {
  medicineInfoPanel: ReactNode;
  chat: ReactNode;
  showPdfViewer?: boolean;
  onReset?: () => void;
  medicineName?: string;
}

const DesktopLayout = ({
  medicineInfoPanel,
  chat,
  showPdfViewer = true,
  onReset,
  medicineName,
}: DesktopLayoutProps) => {
  const { isPdfViewerOpen } = usePDF();
  const [pdfWidth, setPdfWidth] = useState(60);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;

      // Convert to rem (assuming 16px = 1rem)
      const newWidthRem = newWidth / 16;

      // Constrain between 25rem (400px) and 60rem (960px)
      const constrainedWidth = Math.max(25, Math.min(60, newWidthRem));
      setPdfWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  return (
    <div ref={containerRef} className="h-screen w-full overflow-hidden flex flex-col bg-bg">
      {/* Top bar — single line */}
      <header className="flex items-center justify-between px-6 border-b border-rule bg-bg flex-shrink-0" style={{ minHeight: 56 }}>
        <div className="flex items-center gap-6">
          <Wordmark size={18} />
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted px-2 py-0.5 border border-rule rounded-sm">
            Beta
          </span>
        </div>
        <div className="flex items-center gap-4">
          <SourceBadge medicine={medicineName} />
          {onReset && (
            <Button variant="link" size="sm" onClick={onReset}>
              Nova pesquisa
            </Button>
          )}
        </div>
      </header>

      {/* Three-column grid layout with resizable PDF panel */}
      <div
        className="flex-1 min-h-0 grid transition-all duration-300 ease-in-out"
        style={{
          gridTemplateColumns: isPdfViewerOpen && showPdfViewer
            ? `20rem 1fr ${pdfWidth}rem`
            : "20rem 1fr",
          minWidth: "64rem",
        }}
      >
        {/* Left Sidebar - Medicine Info */}
        <aside className="border-r border-rule bg-bg overflow-hidden">
          {medicineInfoPanel}
        </aside>

        {/* Center - Chat */}
        <main className="flex flex-col overflow-hidden">{chat}</main>

        {/* Right Sidebar - PDF Viewer with Resize Handle */}
        {isPdfViewerOpen && showPdfViewer && (
          <aside className="overflow-hidden relative border-l border-rule">
            {/* Resize Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={`absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10 ${
                isResizing ? "bg-brand" : "bg-transparent hover:bg-brand"
              } transition-colors`}
              style={{ marginLeft: "-2px" }}
            >
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-16 bg-border rounded-full opacity-50 hover:opacity-100 transition-opacity" />
            </div>

            {/* Pass width to PDFViewer */}
            <PDFViewer width={pdfWidth} />
          </aside>
        )}
      </div>
    </div>
  );
};

export default DesktopLayout;
