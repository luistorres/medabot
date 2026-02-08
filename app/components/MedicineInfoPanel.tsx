import { IdentifyMedicineResponse } from "../core/identify";
import { usePDF } from "../context/PDFContext";
import type { MedicineSummary } from "../server/extractMedicineSummary";
import Button from "./ui/Button";

interface MedicineInfoPanelProps {
  medicineInfo: IdentifyMedicineResponse;
  image: string | null;
  pdfData: string | null;
  summary?: MedicineSummary | null;
  onReset: () => void;
  onDownloadPdf: () => void;
  onForceRefresh: () => void;
}

const MedicineInfoPanel = ({
  medicineInfo,
  image,
  pdfData,
  summary,
  onReset,
  onDownloadPdf,
  onForceRefresh,
}: MedicineInfoPanelProps) => {
  const { setIsPdfViewerOpen, setActiveTab } = usePDF();

  const handleViewPdf = () => {
    setIsPdfViewerOpen(true);
    setActiveTab("pdf");
  };

  const showBrandChip = medicineInfo.brand
    && medicineInfo.brand !== medicineInfo.name
    && medicineInfo.brand.toLowerCase() !== medicineInfo.name.toLowerCase();

  return (
    <div className="bg-white h-full flex flex-col">
      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Hero section — medicine identity */}
        <div className="p-5 pb-4">
          {/* Image + name group */}
          <div className="flex items-start gap-3.5 mb-3">
            {image && (
              <img
                src={image}
                alt="Medicamento capturado"
                className="w-14 h-14 object-cover rounded-xl shadow-sm ring-1 ring-gray-100 flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-700 text-gray-900 tracking-tight leading-tight">
                {medicineInfo.name}
              </h2>
              {showBrandChip && (
                <p className="text-[13px] text-gray-400 font-light mt-0.5">
                  {medicineInfo.brand}
                </p>
              )}
            </div>
          </div>

          {/* Category badge */}
          {summary?.category && (
            <div className="mb-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary-600 text-white text-[11px] font-semibold uppercase tracking-wide">
                {summary.category}
              </span>
            </div>
          )}

          {/* Key details as compact chips */}
          <div className="flex flex-wrap gap-2">
            {medicineInfo.activeSubstance && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium ring-1 ring-primary-100">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
                {medicineInfo.activeSubstance}
              </span>
            )}
            {medicineInfo.dosage && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-50 text-accent-700 text-xs font-medium ring-1 ring-accent-100">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
                </svg>
                {medicineInfo.dosage}
              </span>
            )}
            {showBrandChip && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 text-xs font-medium ring-1 ring-gray-200">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                </svg>
                {medicineInfo.brand}
              </span>
            )}
          </div>
        </div>

        {/* Indications — plain bullet points */}
        {summary && summary.indications.length > 0 && (
          <>
            <div className="mx-5 border-t border-gray-100" />
            <div className="p-5 pb-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2.5">
                Indicações terapêuticas
              </p>
              <ul className="space-y-1.5">
                {summary.indications.map((indication, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-gray-700 leading-snug">
                    <span className="w-1 h-1 rounded-full bg-primary-400 mt-[7px] flex-shrink-0" />
                    {indication}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Pinned actions — always visible at bottom */}
      <div className="flex-shrink-0 border-t border-gray-100">
        <div className="p-4">
          {pdfData && (
            <div className="space-y-3">
              <Button variant="primary" fullWidth onClick={handleViewPdf} className="shadow-lg shadow-primary-600/25">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
                </svg>
                Ver folheto informativo
              </Button>

              {/* Action tray — icon buttons with labels */}
              <div className="flex items-start justify-center gap-5">
                <button
                  onClick={onDownloadPdf}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 ring-1 ring-gray-200 text-gray-500 transition-all duration-150 group-hover:bg-primary-50 group-hover:ring-primary-200 group-hover:text-primary-600 group-active:scale-95">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </span>
                  <span className="text-[11px] font-medium text-gray-400 group-hover:text-primary-600 transition-colors">
                    Transferir
                  </span>
                </button>

                <button
                  onClick={onForceRefresh}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 ring-1 ring-gray-200 text-gray-500 transition-all duration-150 group-hover:bg-accent-50 group-hover:ring-accent-200 group-hover:text-accent-600 group-active:scale-95">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                    </svg>
                  </span>
                  <span className="text-[11px] font-medium text-gray-400 group-hover:text-accent-600 transition-colors">
                    Atualizar
                  </span>
                </button>

                <button
                  onClick={onReset}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 ring-1 ring-gray-200 text-gray-500 transition-all duration-150 group-hover:bg-gray-100 group-hover:ring-gray-300 group-hover:text-gray-700 group-active:scale-95">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                  </span>
                  <span className="text-[11px] font-medium text-gray-400 group-hover:text-gray-700 transition-colors">
                    Nova pesquisa
                  </span>
                </button>
              </div>
            </div>
          )}

          {!pdfData && (
            <Button
              variant="ghost"
              fullWidth
              onClick={onReset}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              Nova pesquisa
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicineInfoPanel;
