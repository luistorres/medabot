import { KeyboardEvent, ReactNode } from "react";
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

  const selectTab = (id: TabType) => {
    setActiveTab(id);
    if (id === "chat") setCameFromChat(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    switch (e.key) {
      case "ArrowRight":
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case "ArrowLeft":
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    const nextTab = tabs[nextIndex];
    selectTab(nextTab.id);
    document.getElementById(`tab-${nextTab.id}`)?.focus();
  };

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Tab Content - Keep all mounted to preserve state */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {/* Chat Tab */}
        <div
          role="tabpanel"
          id="panel-chat"
          aria-labelledby="tab-chat"
          tabIndex={0}
          hidden={activeTab !== "chat"}
          className={`h-full ${activeTab === "chat" ? "block" : "hidden"}`}
        >
          {chat}
        </div>

        {/* Medicine Info Tab */}
        <div
          role="tabpanel"
          id="panel-medicine"
          aria-labelledby="tab-medicine"
          tabIndex={0}
          hidden={activeTab !== "medicine"}
          className={`h-full ${activeTab === "medicine" ? "block" : "hidden"}`}
        >
          {medicineInfoPanel}
        </div>

        {/* PDF Viewer Tab */}
        {showPdfViewer && (
          <div
            role="tabpanel"
            id="panel-pdf"
            aria-labelledby="tab-pdf"
            tabIndex={0}
            hidden={activeTab !== "pdf"}
            className={`h-full ${activeTab === "pdf" ? "block" : "hidden"}`}
          >
            <PDFViewer isTabMode={true} />
          </div>
        )}
      </div>

      {/* Bottom Tab Navigation */}
      <div
        className="flex-shrink-0 bg-surface border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex" role="tablist" onKeyDown={handleKeyDown}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => selectTab(tab.id)}
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
