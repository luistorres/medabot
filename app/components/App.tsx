import { useState } from "react";
import Camera from "./Camera";
import Chat from "./Chat";
import MedicineInfoPanel from "./MedicineInfoPanel";
import LandingPage from "./LandingPage";
import ManualMedicineForm from "./ManualMedicineForm";
import ResponsiveContainer from "./layouts/ResponsiveContainer";
import { IdentifyMedicineResponse } from "../core/identify";
import { performIdentify } from "../server/performIdentify";
import { fetchRegulatoryPdf } from "../server/fetchRefulatoryPdf";
import { processLeafletPdf } from "../server/processLeaflet";
import { queryLeafletPdf } from "../server/queryLeaflet";
import { PDFProvider, usePDF } from "../context/PDFContext";

type AppScreen = "landing" | "camera" | "manualForm" | "processing" | "results";

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("landing");
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
      label: "A identificar medicamento",
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

  // Process medicine info (called by both camera and manual entry)
  const processMedicineInfo = async (info: IdentifyMedicineResponse) => {
    setMedicineInfo(info);
    setCurrentScreen("processing");
    setLoading(true);
    setProcessingError("");
    setCompletedSteps([]);
    setCurrentStep("");

    try {
      // Skip identify step if coming from manual form
      if (currentScreen !== "camera") {
        markStepComplete("identify");
      }

      // Step 2: Fetch PDF
      setCurrentStep("fetch");
      const pdfResponse = await fetchRegulatoryPdf({ data: info });

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
      setCurrentScreen("results");
    } catch (error) {
      console.error("Error processing medicine:", error);
      setProcessingError(
        error instanceof Error ? error.message : "Ocorreu um erro desconhecido"
      );
      setCurrentStep("");
    } finally {
      setLoading(false);
    }
  };

  // Handle camera capture
  const handleCapture = async (imgSrc: string) => {
    setImage(imgSrc);
    setLoading(true);
    setProcessingError("");
    setCompletedSteps([]);
    setCurrentStep("");

    try {
      // Step 1: Identify medicine from image
      setCurrentStep("identify");
      setCurrentScreen("processing");

      const medicineInfo = await performIdentify({ data: imgSrc });
      markStepComplete("identify");

      // Continue with processing
      await processMedicineInfo(medicineInfo);
    } catch (error) {
      console.error("Error identifying medicine:", error);
      setProcessingError(
        error instanceof Error ? error.message : "Falha ao identificar medicamento da imagem"
      );
      setCurrentStep("");
      setLoading(false);
    }
  };

  // Handle manual form submission
  const handleManualSubmit = async (data: IdentifyMedicineResponse) => {
    await processMedicineInfo(data);
  };

  // Reset to landing
  const handleReset = () => {
    setCurrentScreen("landing");
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

  // Download PDF
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

  // Render landing page
  if (currentScreen === "landing") {
    return (
      <LandingPage
        onScanMedicine={() => setCurrentScreen("camera")}
        onManualEntry={() => setCurrentScreen("manualForm")}
      />
    );
  }

  // Render camera screen
  if (currentScreen === "camera") {
    return (
      <Camera
        onCapture={handleCapture}
        onCancel={() => setCurrentScreen("landing")}
      />
    );
  }

  // Render manual form screen
  if (currentScreen === "manualForm") {
    return (
      <ManualMedicineForm
        onSubmit={handleManualSubmit}
        onCancel={() => setCurrentScreen("landing")}
      />
    );
  }

  // Render processing screen
  if (currentScreen === "processing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-6">
          {/* Processing Steps */}
          {loading && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                A Processar Informações do Medicamento
              </h3>
              <div className="space-y-4">
                {steps.map((step) => {
                  const isCompleted = completedSteps.includes(step.id);
                  const isCurrent = currentStep === step.id;

                  return (
                    <div key={step.id} className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${
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
                        className={`text-lg flex-1 ${
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
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Display with fallback options */}
          {processingError && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-start mb-6">
                <div className="text-red-500 text-3xl mr-4">❌</div>
                <div className="flex-1">
                  <h4 className="text-xl text-red-800 font-bold mb-2">
                    Erro de Processamento
                  </h4>
                  <p className="text-red-700">{processingError}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <p className="text-gray-700 mb-4 font-medium">
                  O que deseja fazer?
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setCurrentScreen("camera")}
                    className="px-6 py-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <span className="mr-2">📸</span>
                    Tentar com câmara
                  </button>
                  <button
                    onClick={() => setCurrentScreen("manualForm")}
                    className="px-6 py-4 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center"
                  >
                    <span className="mr-2">✍️</span>
                    Introduzir manualmente
                  </button>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full mt-4 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Voltar ao início
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render results screen (main app)
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
