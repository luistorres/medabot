import { useState } from "react";
import { IdentifyMedicineResponse } from "../core/identify";
import { usePDF } from "../context/PDFContext";
import { useMediaQuery } from "../hooks/useMediaQuery";

interface MedicineInfoPanelProps {
  medicineInfo: IdentifyMedicineResponse;
  image: string | null;
  pdfData: string | null;
  onReset: () => void;
  onDownloadPdf: () => void;
}

const MedicineInfoPanel = ({
  medicineInfo,
  image,
  pdfData,
  onReset,
  onDownloadPdf,
}: MedicineInfoPanelProps) => {
  const { setIsPdfViewerOpen } = usePDF();
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleViewPdf = () => {
    setIsPdfViewerOpen(true);
  };

  // On desktop, always show expanded
  const shouldShowCollapsed = isMobile && isCollapsed;

  return (
    <div className="bg-white h-full flex flex-col">
      {/* Mobile: Collapsible header */}
      {isMobile && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full p-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">💊</span>
            <div className="text-left">
              <h3 className="font-semibold text-gray-800">
                {medicineInfo.name}
              </h3>
              <p className="text-xs text-gray-600">{medicineInfo.dosage}</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform ${
              isCollapsed ? "" : "rotate-180"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}

      {/* Content */}
      <div
        className={`${
          shouldShowCollapsed ? "hidden" : "flex"
        } flex-col p-4 space-y-4 overflow-y-auto ${
          isMobile ? "" : "h-full"
        }`}
      >
        {/* Desktop: Header */}
        {!isMobile && (
          <div className="flex items-center space-x-2 pb-4 border-b border-gray-200">
            <span className="text-2xl">💊</span>
            <h2 className="text-lg font-bold text-gray-800">Medicamento</h2>
          </div>
        )}

        {/* Medicine Image Thumbnail */}
        {image && !isMobile && (
          <div className="flex justify-center">
            <img
              src={image}
              alt="Medicamento capturado"
              className="w-16 h-16 object-cover rounded-lg shadow-sm border border-gray-200"
            />
          </div>
        )}

        {/* Medicine Details */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Nome
            </label>
            <p className="text-sm font-medium text-gray-800 mt-1">
              {medicineInfo.name}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Substância Activa
            </label>
            <p className="text-sm text-gray-800 mt-1">
              {medicineInfo.activeSubstance}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Marca
            </label>
            <p className="text-sm text-gray-800 mt-1">{medicineInfo.brand}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Dosagem
            </label>
            <p className="text-sm text-gray-800 mt-1">{medicineInfo.dosage}</p>
          </div>
        </div>

        {/* Action Buttons */}
        {pdfData && (
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <button
              onClick={handleViewPdf}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-colors shadow-sm text-sm font-medium"
            >
              <span>📄</span>
              <span>Ver Folheto</span>
            </button>

            <button
              onClick={onDownloadPdf}
              className="w-full flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium"
            >
              <span>⬇️</span>
              <span>Transferir PDF</span>
            </button>
          </div>
        )}

        {/* New Scan Button */}
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-medium mt-auto"
        >
          <span>🔄</span>
          <span>Digitalizar Novo</span>
        </button>
      </div>
    </div>
  );
};

export default MedicineInfoPanel;
