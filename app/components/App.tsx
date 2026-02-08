import { useState } from "react";
import Camera from "./Camera";
import Chat from "./Chat";
import MedicineInfoPanel from "./MedicineInfoPanel";
import LandingPage from "./LandingPage";
import ManualMedicineForm from "./ManualMedicineForm";
import SearchScreen from "./SearchScreen";
import ProcessingScreen from "./ProcessingScreen";
import DisambiguationCard from "./DisambiguationCard";
import ResponsiveContainer from "./layouts/ResponsiveContainer";
import { IdentifyMedicineResponse } from "../core/identify";
import { performIdentify } from "../server/performIdentify";
import { fetchRegulatoryPdf } from "../server/fetchRegulatoryPdf";
import { processLeafletPdf } from "../server/processLeaflet";
import { queryLeafletPdf } from "../server/queryLeaflet";
import { PDFProvider, usePDF } from "../context/PDFContext";
import { extractMedicineSummary, type MedicineSummary } from "../server/extractMedicineSummary";
import type { Candidate } from "./DisambiguationCard";

type AppScreen = "landing" | "camera" | "search" | "manualForm" | "processing" | "results";

const steps = [
  {
    id: "identify",
    label: "A identificar medicamento",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>,
  },
  {
    id: "fetch",
    label: "A obter folheto informativo",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>,
  },
  {
    id: "process",
    label: "A processar folheto com IA",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>,
  },
  {
    id: "overview",
    label: "A gerar resumo",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>,
  },
  {
    id: "ready",
    label: "Pronto para questões",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>,
  },
];

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
  const [medicineSummary, setMedicineSummary] = useState<MedicineSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Processing steps state
  const [currentStep, setCurrentStep] = useState<string>("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [processingError, setProcessingError] = useState<string>("");
  const [failedStep, setFailedStep] = useState<string>("");
  const [searchMessage, setSearchMessage] = useState<string>("");
  const [disambiguation, setDisambiguation] = useState<Candidate[] | null>(null);

  const { pdfData, setPdfData, setCurrentPage, setTotalPages } = usePDF();

  // Saved intermediate results for retry
  const [savedPdfBase64, setSavedPdfBase64] = useState<string | null>(null);

  const markStepComplete = (stepId: string) => {
    setCompletedSteps((prev) => [...prev, stepId]);
    setCurrentStep("");
  };

  const handleStepError = (stepId: string, error: unknown) => {
    const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido";
    setProcessingError(message);
    setFailedStep(stepId);
    setCurrentStep("");
    setLoading(false);
  };

  // Step: Fetch PDF
  const runFetchStep = async (info: IdentifyMedicineResponse, forceRefresh?: boolean): Promise<{ pdfBase64: string; needsDisambiguation: boolean }> => {
    setCurrentStep("fetch");
    setSearchMessage(`A procurar o folheto de '${info.name}'...`);

    const pdfResponse = await fetchRegulatoryPdf({ data: { ...info, forceRefresh } });

    if (!pdfResponse || !pdfResponse.data) {
      throw new Error("Não foi possível encontrar o folheto informativo deste medicamento.");
    }

    const needsDisambiguation = !!(pdfResponse.candidates && pdfResponse.candidates.length > 0);
    if (needsDisambiguation && pdfResponse.candidates) {
      setDisambiguation(pdfResponse.candidates);
    }

    setPdfData(pdfResponse.data);
    setSavedPdfBase64(pdfResponse.data);
    setSearchMessage("");
    markStepComplete("fetch");
    return { pdfBase64: pdfResponse.data, needsDisambiguation };
  };

  // Step: Process PDF
  const runProcessStep = async (pdfBase64: string) => {
    setCurrentStep("process");
    setSearchMessage("");

    const processResult = await processLeafletPdf({ data: pdfBase64 });

    if (!processResult.success) {
      throw new Error(processResult.error || "Falha ao processar folheto");
    }
    markStepComplete("process");
  };

  // Step: Generate overview + extract structured summary
  const runOverviewStep = async (pdfBase64: string) => {
    setCurrentStep("overview");

    // Run both queries in parallel
    const [overviewResult, summaryResult] = await Promise.all([
      queryLeafletPdf({
        data: {
          pdfBase64: pdfBase64,
          question: "What is this medicine used for? Provide a brief overview.",
        },
      }),
      extractMedicineSummary({ data: pdfBase64 }),
    ]);

    if (overviewResult.success && typeof overviewResult.answer === "string") {
      setOverview(overviewResult.answer);
    }
    setMedicineSummary(summaryResult);
    markStepComplete("overview");
  };

  // Process medicine info (per-step error handling)
  const processMedicineInfo = async (info: IdentifyMedicineResponse, startFromStep?: string, forceRefresh?: boolean) => {
    setMedicineInfo(info);
    setCurrentScreen("processing");
    setLoading(true);
    setProcessingError("");
    setFailedStep("");
    setDisambiguation(null);

    if (!startFromStep) {
      setCompletedSteps([]);
      setCurrentStep("");
      // Skip identify step if not coming from camera
      if (currentScreen !== "camera") {
        markStepComplete("identify");
      }
    }

    try {
      // Step: Fetch PDF
      let pdfBase64 = savedPdfBase64;
      if (!startFromStep || startFromStep === "fetch") {
        const fetchResult = await runFetchStep(info, forceRefresh);
        pdfBase64 = fetchResult.pdfBase64;

        // Pause pipeline — let the user pick the correct candidate
        if (fetchResult.needsDisambiguation) {
          setLoading(false);
          return;
        }
      }

      if (!pdfBase64) {
        throw new Error("Dados do PDF não disponíveis");
      }

      // Step: Process PDF
      if (!startFromStep || startFromStep === "fetch" || startFromStep === "process") {
        await runProcessStep(pdfBase64);
      }

      // Step: Overview
      if (!startFromStep || startFromStep === "fetch" || startFromStep === "process" || startFromStep === "overview") {
        await runOverviewStep(pdfBase64);
      }

      // Ready
      markStepComplete("ready");
      setCurrentScreen("results");
    } catch (error) {
      const stepId = currentStep || failedStep || "fetch";
      handleStepError(stepId, error);
    } finally {
      setLoading(false);
    }
  };

  // Retry a specific failed step
  const handleRetryStep = async (stepId: string) => {
    setProcessingError("");
    setFailedStep("");
    setLoading(true);

    try {
      if (stepId === "fetch") {
        await processMedicineInfo(medicineInfo, "fetch");
      } else if (stepId === "process") {
        await processMedicineInfo(medicineInfo, "process");
      } else if (stepId === "overview") {
        await processMedicineInfo(medicineInfo, "overview");
      }
    } catch (error) {
      handleStepError(stepId, error);
    }
  };

  // Handle camera capture
  const handleCapture = async (imgSrc: string) => {
    setImage(imgSrc);
    setLoading(true);
    setProcessingError("");
    setFailedStep("");
    setCompletedSteps([]);
    setCurrentStep("");

    try {
      setCurrentStep("identify");
      setCurrentScreen("processing");

      const info = await performIdentify({ data: imgSrc });
      setMedicineInfo(info);
      markStepComplete("identify");

      await processMedicineInfo(info);
    } catch (error) {
      handleStepError("identify", error);
    }
  };

  // Handle manual form submission
  const handleManualSubmit = async (data: IdentifyMedicineResponse) => {
    await processMedicineInfo(data);
  };

  // Handle disambiguation selection
  const handleDisambiguationSelect = async (candidate: Candidate) => {
    setDisambiguation(null);
    const updatedInfo: IdentifyMedicineResponse = {
      ...medicineInfo,
      name: candidate.name,
      activeSubstance: candidate.activeSubstance,
    };
    await processMedicineInfo(updatedInfo);
  };

  // Reset to landing
  const handleReset = () => {
    setCurrentScreen("landing");
    setImage(null);
    setMedicineInfo({ name: "", activeSubstance: "", brand: "", dosage: "" });
    setPdfData(null);
    setCurrentPage(1);
    setTotalPages(0);
    setSavedPdfBase64(null);
    setOverview("");
    setMedicineSummary(null);
    setCompletedSteps([]);
    setCurrentStep("");
    setProcessingError("");
    setFailedStep("");
    setDisambiguation(null);
    setSearchMessage("");
  };

  // Force refresh — re-fetch leaflet from INFARMED, bypassing cache
  const handleForceRefresh = async () => {
    await processMedicineInfo(medicineInfo, undefined, true);
  };

  // Download PDF
  const downloadPdf = () => {
    if (!pdfData) return;

    try {
      const byteCharacters = atob(pdfData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${medicineInfo.name || "medicine"}-leaflet.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  // Landing
  if (currentScreen === "landing") {
    return (
      <LandingPage
        onScanMedicine={() => setCurrentScreen("camera")}
        onManualEntry={() => setCurrentScreen("search")}
      />
    );
  }

  // Camera
  if (currentScreen === "camera") {
    return (
      <Camera
        onCapture={handleCapture}
        onCancel={() => setCurrentScreen("landing")}
      />
    );
  }

  // Smart search
  if (currentScreen === "search") {
    return (
      <SearchScreen
        onSubmit={handleManualSubmit}
        onCancel={() => setCurrentScreen("landing")}
        onAdvancedSearch={() => setCurrentScreen("manualForm")}
      />
    );
  }

  // Manual form (advanced search)
  if (currentScreen === "manualForm") {
    return (
      <ManualMedicineForm
        onSubmit={handleManualSubmit}
        onCancel={() => setCurrentScreen("search")}
      />
    );
  }

  // Processing
  if (currentScreen === "processing") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-5">
          {/* Disambiguation overlay */}
          {disambiguation && (
            <DisambiguationCard
              candidates={disambiguation}
              onSelect={handleDisambiguationSelect}
              onNoneMatch={() => {
                setDisambiguation(null);
                setCurrentScreen("manualForm");
              }}
            />
          )}

          {!disambiguation && (
            <ProcessingScreen
              steps={steps}
              currentStep={currentStep}
              completedSteps={completedSteps}
              medicineInfo={medicineInfo.name ? medicineInfo : null}
              processingError={processingError}
              failedStep={failedStep}
              loading={loading}
              searchMessage={searchMessage}
              onRetryStep={handleRetryStep}
              onGoToCamera={() => setCurrentScreen("camera")}
              onGoToManualForm={() => setCurrentScreen("manualForm")}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    );
  }

  // Results
  return (
    <ResponsiveContainer
      onReset={handleReset}
      medicineInfoPanel={
        <MedicineInfoPanel
          medicineInfo={medicineInfo}
          image={image}
          pdfData={pdfData}
          summary={medicineSummary}
          onReset={handleReset}
          onDownloadPdf={downloadPdf}
          onForceRefresh={handleForceRefresh}
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

function App() {
  return (
    <PDFProvider>
      <AppContent />
    </PDFProvider>
  );
}

export default App;
