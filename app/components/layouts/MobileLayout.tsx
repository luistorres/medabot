import { ReactNode } from "react";
import TabLayout from "./TabLayout";
import { Wordmark } from "../ui/Wordmark";

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
    <div className="h-dvh w-full flex flex-col overflow-hidden bg-bg">
      {/* Header */}
      <header className="h-12 bg-bg border-b border-rule flex items-center px-4 flex-shrink-0">
        <button onClick={onReset} className="flex items-center cursor-pointer" aria-label="Início">
          <Wordmark size={17} />
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
