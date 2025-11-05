import { ReactNode, useState, useRef, useEffect } from "react";
import { usePDF } from "../../context/PDFContext";
import PDFViewer from "../PDFViewer";

interface DesktopLayoutProps {
  medicineInfoPanel: ReactNode;
  chat: ReactNode;
  showPdfViewer?: boolean;
}

const DesktopLayout = ({
  medicineInfoPanel,
  chat,
  showPdfViewer = true,
}: DesktopLayoutProps) => {
  const { isPdfViewerOpen } = usePDF();
  const [pdfWidth, setPdfWidth] = useState(40); // Start at 40rem (640px) - much bigger!
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
    <div ref={containerRef} className="h-screen w-full overflow-hidden bg-gray-50">
      {/* Three-column grid layout with resizable PDF panel */}
      <div
        className="grid h-full transition-all duration-300 ease-in-out"
        style={{
          gridTemplateColumns: isPdfViewerOpen && showPdfViewer
            ? `17.5rem 1fr ${pdfWidth}rem`
            : "17.5rem 1fr",
          minWidth: "64rem",
        }}
      >
        {/* Left Sidebar - Medicine Info */}
        <aside className="border-r border-gray-200 bg-white overflow-hidden">
          {medicineInfoPanel}
        </aside>

        {/* Center - Chat */}
        <main className="flex flex-col overflow-hidden">{chat}</main>

        {/* Right Sidebar - PDF Viewer with Resize Handle */}
        {isPdfViewerOpen && showPdfViewer && (
          <aside className="overflow-hidden relative">
            {/* Resize Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={`absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 z-10 ${
                isResizing ? "bg-blue-500" : "bg-transparent"
              } transition-colors`}
              style={{ marginLeft: "-2px" }}
            >
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-16 bg-gray-300 rounded-full opacity-50 hover:opacity-100 transition-opacity" />
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
