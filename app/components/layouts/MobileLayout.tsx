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
    <div className="h-dvh w-full flex flex-col overflow-hidden bg-bg">
      {/* No global top bar on mobile: each screen renders its own header and
          the bottom tab bar handles navigation. The wordmark top bar lives on
          the Landing screen and the desktop layout only (per design). */}
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
