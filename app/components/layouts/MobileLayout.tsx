import { ReactNode } from "react";
import TabLayout from "./TabLayout";

interface MobileLayoutProps {
  medicineInfoPanel: ReactNode;
  chat: ReactNode;
  showPdfViewer: boolean;
}

const MobileLayout = ({
  medicineInfoPanel,
  chat,
  showPdfViewer,
}: MobileLayoutProps) => {
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="h-14 bg-blue-600 text-white flex items-center px-4 flex-shrink-0 shadow-md">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🤖</span>
          <h1 className="text-lg font-bold">MedaBot</h1>
        </div>
      </header>

      {/* Tab-based content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <TabLayout
          medicineInfoPanel={medicineInfoPanel}
          chat={chat}
          showPdfViewer={showPdfViewer}
        />
      </div>
    </div>
  );
};

export default MobileLayout;
