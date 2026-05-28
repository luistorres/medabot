import { ReactNode } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import DesktopLayout from "./DesktopLayout";
import MobileLayout from "./MobileLayout";

interface ResponsiveContainerProps {
  medicineInfoPanel: ReactNode;
  chat: ReactNode;
  showPdfViewer?: boolean;
  onReset?: () => void;
  medicineName?: string;
}

const ResponsiveContainer = ({
  medicineInfoPanel,
  chat,
  showPdfViewer = true,
  onReset,
  medicineName,
}: ResponsiveContainerProps) => {
  const isDesktop = useMediaQuery("(min-width: 64rem)");

  if (isDesktop) {
    return (
      <DesktopLayout
        medicineInfoPanel={medicineInfoPanel}
        chat={chat}
        showPdfViewer={showPdfViewer}
        onReset={onReset}
        medicineName={medicineName}
      />
    );
  }

  return (
    <MobileLayout
      medicineInfoPanel={medicineInfoPanel}
      chat={chat}
      showPdfViewer={showPdfViewer}
    />
  );
};

export default ResponsiveContainer;
