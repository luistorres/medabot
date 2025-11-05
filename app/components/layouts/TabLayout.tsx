import { ReactNode, useState } from "react";
import PDFViewer from "../PDFViewer";

interface TabLayoutProps {
  medicineInfoPanel: ReactNode;
  chat: ReactNode;
  showPdfViewer: boolean;
}

type TabType = "chat" | "medicine" | "pdf";

const TabLayout = ({
  medicineInfoPanel,
  chat,
  showPdfViewer,
}: TabLayoutProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("chat");

  const tabs = [
    { id: "chat" as TabType, label: "Chat", icon: "💬", show: true },
    { id: "medicine" as TabType, label: "Medicamento", icon: "💊", show: true },
    { id: "pdf" as TabType, label: "Folheto", icon: "📄", show: showPdfViewer },
  ].filter((tab) => tab.show);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Tab Navigation */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
              {/* Active indicator */}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "chat" && <div className="h-full">{chat}</div>}
        {activeTab === "medicine" && (
          <div className="h-full overflow-y-auto">{medicineInfoPanel}</div>
        )}
        {activeTab === "pdf" && showPdfViewer && (
          <div className="h-full">
            <PDFViewer isTabMode={true} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TabLayout;
