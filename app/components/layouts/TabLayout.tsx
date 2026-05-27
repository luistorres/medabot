import { ReactNode } from "react";
import { usePDF, TabType } from "../../context/PDFContext";
import PDFViewer from "../PDFViewer";
import { Icon } from "../ui/Icon";

interface TabLayoutProps {
  medicineInfoPanel: ReactNode;
  chat: ReactNode;
  showPdfViewer: boolean;
}

const TabLayout = ({
  medicineInfoPanel,
  chat,
  showPdfViewer,
}: TabLayoutProps) => {
  const { activeTab, setActiveTab, setCameFromChat } = usePDF();

  const tabs = [
    { id: "chat" as TabType, label: "Conversa", IconComp: Icon.chat, show: true },
    { id: "medicine" as TabType, label: "Medicamento", IconComp: Icon.info, show: true },
    { id: "pdf" as TabType, label: "Folheto", IconComp: Icon.page, show: showPdfViewer },
  ].filter((tab) => tab.show);

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Tab Content - Keep all mounted to preserve state */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {/* Chat Tab */}
        <div className={`h-full ${activeTab === "chat" ? "block" : "hidden"}`}>
          {chat}
        </div>

        {/* Medicine Info Tab */}
        <div className={`h-full ${activeTab === "medicine" ? "block" : "hidden"}`}>
          {medicineInfoPanel}
        </div>

        {/* PDF Viewer Tab */}
        {showPdfViewer && (
          <div className={`h-full ${activeTab === "pdf" ? "block" : "hidden"}`}>
            <PDFViewer isTabMode={true} />
          </div>
        )}
      </div>

      {/* Bottom Tab Navigation */}
      <div
        className="flex-shrink-0 bg-surface border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex" role="tablist">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "chat") setCameFromChat(false);
                }}
                className={`flex-1 flex flex-col items-center justify-center pt-2.5 pb-2 min-h-[56px] gap-1 transition-colors relative ${
                  isActive ? "text-brand font-medium" : "text-muted font-normal"
                }`}
              >
                <tab.IconComp className="w-5 h-5" />
                <span className="text-xs">{tab.label}</span>
                {/* 16×2px pill underline indicator */}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-brand rounded-sm" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TabLayout;
