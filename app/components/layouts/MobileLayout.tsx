import { ReactNode } from "react";
import PDFViewer from "../PDFViewer";

interface MobileLayoutProps {
  medicineInfoPanel: ReactNode;
  chat: ReactNode;
}

const MobileLayout = ({ medicineInfoPanel, chat }: MobileLayoutProps) => {
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="h-14 bg-blue-600 text-white flex items-center px-4 flex-shrink-0 shadow-md">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🤖</span>
          <h1 className="text-lg font-bold">MedaBot</h1>
        </div>
      </header>

      {/* Medicine Info Panel - Collapsible */}
      <section className="flex-shrink-0 bg-white border-b border-gray-200">
        {medicineInfoPanel}
      </section>

      {/* Chat - Takes remaining space */}
      <main className="flex-1 min-h-0 overflow-hidden">{chat}</main>

      {/* PDF Viewer Modal - Rendered as overlay when open */}
      <PDFViewer />
    </div>
  );
};

export default MobileLayout;
