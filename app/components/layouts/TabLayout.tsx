import { ReactNode } from "react";
import { usePDF, TabType } from "../../context/PDFContext";
import PDFViewer from "../PDFViewer";

interface TabLayoutProps {
  medicineInfoPanel: ReactNode;
  chat: ReactNode;
  showPdfViewer: boolean;
}

const ChatIcon = ({ active }: { active: boolean }) => (
  <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.5}>
    {active ? (
      <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 20.97V18.03a48.527 48.527 0 01-1.087-.128C2.905 17.65 1.5 16.05 1.5 14.11V6.385c0-1.866 1.37-3.477 3.413-3.727zM15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 1.136.845 2.1 1.976 2.193 1.31.109 2.637.163 3.974.163l3 3V15.75c1.132-.09 1.976-1.057 1.976-2.192v-4.286c0-.837-.483-1.58-1.175-1.881m-7.845-2.88a48.717 48.717 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 1.136.845 2.1 1.976 2.193.681.057 1.365.1 2.053.131V18l3-3c1.354 0 2.694-.055 4.02-.163a2.115 2.115 0 001.825-1.358" />
    )}
  </svg>
);

const MedicineIcon = ({ active }: { active: boolean }) => (
  <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.5}>
    {active ? (
      <path fillRule="evenodd" d="M10.5 3.798v5.02a3 3 0 01-.879 2.121l-2.377 2.377a9.845 9.845 0 015.091 1.013 8.315 8.315 0 005.713.636l.285-.071-3.954-3.955a3 3 0 01-.879-2.121v-5.02a23.614 23.614 0 00-3 0zm4.5.138a.75.75 0 00.093-1.495A24.837 24.837 0 0012 2.25a25.048 25.048 0 00-3.093.191A.75.75 0 009 3.936v4.882a1.5 1.5 0 01-.44 1.06l-6.293 6.294c-1.62 1.621-.903 4.475 1.471 4.88 2.686.46 5.447.698 8.262.698 2.816 0 5.576-.239 8.262-.697 2.373-.406 3.092-3.26 1.471-4.881L15.44 9.879A1.5 1.5 0 0115 8.818V3.936z" clipRule="evenodd" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    )}
  </svg>
);

const DocumentIcon = ({ active }: { active: boolean }) => (
  <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.5}>
    {active ? (
      <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    )}
  </svg>
);

const TabLayout = ({
  medicineInfoPanel,
  chat,
  showPdfViewer,
}: TabLayoutProps) => {
  const { activeTab, setActiveTab } = usePDF();

  const tabs = [
    { id: "chat" as TabType, label: "Chat", Icon: ChatIcon, show: true },
    { id: "medicine" as TabType, label: "Medicamento", Icon: MedicineIcon, show: true },
    { id: "pdf" as TabType, label: "Folheto", Icon: DocumentIcon, show: showPdfViewer },
  ].filter((tab) => tab.show);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Tab Content - Keep all mounted to preserve state */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {/* Chat Tab */}
        <div
          className={`h-full ${activeTab === "chat" ? "block" : "hidden"}`}
        >
          {chat}
        </div>

        {/* Medicine Info Tab */}
        <div
          className={`h-full overflow-y-auto ${activeTab === "medicine" ? "block" : "hidden"}`}
        >
          {medicineInfoPanel}
        </div>

        {/* PDF Viewer Tab */}
        {showPdfViewer && (
          <div
            className={`h-full ${activeTab === "pdf" ? "block" : "hidden"}`}
          >
            <PDFViewer isTabMode={true} />
          </div>
        )}
      </div>

      {/* Bottom Tab Navigation */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors ${
                  isActive
                    ? "text-primary-600"
                    : "text-gray-500 active:text-gray-700"
                }`}
              >
                <tab.Icon active={isActive} />
                <span className={`text-xs mt-1 ${isActive ? "font-semibold" : "font-medium"}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TabLayout;
