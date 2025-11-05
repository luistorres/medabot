import { ReactNode } from "react";
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

  return (
    <div className="h-screen w-full overflow-hidden bg-gray-50">
      {/* Three-column grid layout */}
      <div
        className={`grid h-full transition-all duration-300 ease-in-out ${
          isPdfViewerOpen && showPdfViewer
            ? "grid-cols-[17.5rem_1fr_25rem]"
            : "grid-cols-[17.5rem_1fr]"
        }`}
        style={{ minWidth: "64rem" }}
      >
        {/* Left Sidebar - Medicine Info */}
        <aside className="border-r border-gray-200 bg-white overflow-hidden">
          {medicineInfoPanel}
        </aside>

        {/* Center - Chat */}
        <main className="flex flex-col overflow-hidden">{chat}</main>

        {/* Right Sidebar - PDF Viewer */}
        {isPdfViewerOpen && showPdfViewer && (
          <aside className="overflow-hidden">
            <PDFViewer />
          </aside>
        )}
      </div>
    </div>
  );
};

export default DesktopLayout;
