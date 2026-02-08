import { ReactNode } from "react";
import TabLayout from "./TabLayout";

interface MobileLayoutProps {
  medicineInfoPanel: ReactNode;
  chat: ReactNode;
  showPdfViewer: boolean;
  onReset?: () => void;
}

const MobileLayout = ({
  medicineInfoPanel,
  chat,
  showPdfViewer,
  onReset,
}: MobileLayoutProps) => {
  return (
    <div className="h-dvh w-full flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 flex-shrink-0">
        <button onClick={onReset} className="flex items-center gap-2 cursor-pointer">
          <img src="/logo.png" alt="MedaBot" className="w-8 h-8 object-contain rounded-lg" />
          <h1 className="text-base font-bold text-gray-900">MedaBot</h1>
        </button>
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
