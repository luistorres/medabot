import { useState, useEffect } from "react";
import Camera from "./Camera";
import Chat from "./Chat";
import MedicineInfoPanel from "./MedicineInfoPanel";
import ResponsiveContainer from "./layouts/ResponsiveContainer";
import { IdentifyMedicineResponse } from "../core/identify";
import { performIdentify } from "../server/performIdentify";
import { fetchRegulatoryPdf } from "../server/fetchRefulatoryPdf";
import { processLeafletPdf } from "../server/processLeaflet";
import { queryLeafletPdf } from "../server/queryLeaflet";
import { PDFProvider, usePDF } from "../context/PDFContext";

function AppContent() {
  const [image, setImage] = useState<string | null>(null);
  const [medicineInfo, setMedicineInfo] = useState<IdentifyMedicineResponse>({
    name: "",
    activeSubstance: "",
    brand: "",
    dosage: "",
  });
  const [overview, setOverview] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Processing steps state
  const [currentStep, setCurrentStep] = useState<string>("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [processingError, setProcessingError] = useState<string>("");

  // Use PDF context
  const { pdfData, setPdfData } = usePDF();

  const steps = [
    {
      id: "identify",
      label: "A identificar medicamento da imagem",
      icon: "🔍",
    },
    { id: "fetch", label: "A obter folheto informativo", icon: "📄" },
    { id: "process", label: "A processar folheto com IA", icon: "🤖" },
    { id: "overview", label: "A gerar resumo", icon: "📝" },
    { id: "ready", label: "Pronto para questões", icon: "✅" },
  ];

  const markStepComplete = (stepId: string) => {
    setCompletedSteps((prev) => [...prev, stepId]);
    setCurrentStep("");
  };

  const handleCapture = async (imgSrc: string) => {
    setImage(imgSrc);
    setLoading(true);
    setProcessingError("");
    setCompletedSteps([]);
    setCurrentStep("");

    try {
      // Step 1: Identify medicine from image
      setCurrentStep("identify");
      const medicineInfo = await performIdentify({ data: imgSrc });
      setMedicineInfo(medicineInfo);
      markStepComplete("identify");

      // Step 2: Fetch PDF
      setCurrentStep("fetch");
      const pdfResponse = await fetchRegulatoryPdf({ data: medicineInfo });

      if (!pdfResponse || !pdfResponse.data) {
        throw new Error("Falha ao obter folheto informativo do medicamento");
      }

      setPdfData(pdfResponse.data);
      markStepComplete("fetch");

      // Step 3: Process PDF with LangChain
      setCurrentStep("process");
      const processResult = await processLeafletPdf({
        data: pdfResponse.data,
      });

      if (!processResult.success) {
        throw new Error(processResult.error || "Falha ao processar folheto");
      }
      markStepComplete("process");

      // Step 4: Generate overview
      setCurrentStep("overview");
      const overviewResult = await queryLeafletPdf({
        data: {
          pdfBase64: pdfResponse.data,
          question: "What is this medicine used for? Provide a brief overview.",
        },
      });

      if (overviewResult.success && typeof overviewResult.answer === "string") {
        setOverview(overviewResult.answer);
      }
      markStepComplete("overview");

      // Step 5: Ready for questions
      markStepComplete("ready");
    } catch (error) {
      console.error("Error processing image:", error);
      setProcessingError(
        error instanceof Error ? error.message : "Ocorreu um erro desconhecido"
      );
      setCurrentStep("");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setMedicineInfo({
      name: "",
      activeSubstance: "",
      brand: "",
      dosage: "",
    });
    setPdfData(null);
    setOverview("");
    setCompletedSteps([]);
    setCurrentStep("");
    setProcessingError("");
  };

  const downloadPdf = () => {
    if (!pdfData) return;

    try {
      // Convert base64 to blob
      const byteCharacters = atob(pdfData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${medicineInfo.name || "medicine"}-leaflet.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL object
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  // Show camera capture screen
  if (!image) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <Camera onCapture={handleCapture} />
      </div>
    );
  }

  // Show processing screen
  if (loading || !completedSteps.includes("ready")) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <div className="max-w-2xl w-full space-y-6">
          {/* Processing Steps */}
          {loading && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                A Processar Informações do Medicamento
              </h3>
              <div className="space-y-3">
                {steps.map((step) => {
                  const isCompleted = completedSteps.includes(step.id);
                  const isCurrent = currentStep === step.id;

                  return (
                    <div key={step.id} className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : isCurrent
                              ? "bg-blue-500 text-white animate-pulse"
                              : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {isCompleted ? "✓" : isCurrent ? "⟳" : step.icon}
                      </div>
                      <span
                        className={`text-base ${
                          isCompleted
                            ? "text-green-700 font-medium"
                            : isCurrent
                              ? "text-blue-700 font-medium"
                              : "text-gray-500"
                        }`}
                      >
                        {step.label}
                      </span>
                      {isCurrent && (
                        <div className="ml-auto">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Display */}
          {processingError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-red-500 mr-2">❌</div>
                <div>
                  <h4 className="text-red-800 font-medium">
                    Erro de Processamento
                  </h4>
                  <p className="text-red-700 text-sm mt-1">
                    {processingError}
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="mt-3 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show main app layout with medicine info and chat
  return (
    <ResponsiveContainer
      medicineInfoPanel={
        <MedicineInfoPanel
          medicineInfo={medicineInfo}
          image={image}
          pdfData={pdfData}
          onReset={handleReset}
          onDownloadPdf={downloadPdf}
        />
      }
      chat={
        <Chat
          pdfData={pdfData || ""}
          medicineName={medicineInfo.name}
          initialOverview={overview}
        />
      }
      showPdfViewer={!!pdfData}
    />
  );
}

// Wrap with PDFProvider
function App() {
  return (
    <PDFProvider>
      <AppContent />
    </PDFProvider>
  );
}

export default App;
