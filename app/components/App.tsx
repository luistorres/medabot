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

// Screen-payload navigation model: each screen carries the state it needs as
// part of the transition. manualForm carries its origin (where "back" returns
// to) and any prefill data, so that information travels with the navigation
// instead of living in ambient state that can leak between flows.
type Screen =
  | { name: "landing" }
  | { name: "camera" }
  | { name: "search" }
  | { name: "manualForm"; origin: "search" | "disambiguation"; initialData?: IdentifyMedicineResponse }
  | { name: "processing" }
  | { name: "results" };

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
  const [screen, setScreen] = useState<Screen>({ name: "landing" });
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

  const { pdfData, setPdfData, setCurrentPage, setTotalPages, setCameFromChat, setActiveTab, setIsPdfViewerOpen, setLastJumpedPage } = usePDF();

  // Saved intermediate results for retry
  const [savedPdfBase64, setSavedPdfBase64] = useState<string | null>(null);

  const markStepComplete = (stepId: string) => {
    setCompletedSteps((prev) => (prev.includes(stepId) ? prev : [...prev, stepId]));
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
  const runFetchStep = async (info: IdentifyMedicineResponse, forceRefresh?: boolean, selectedCandidate?: Candidate): Promise<{ pdfBase64: string; needsDisambiguation: boolean; medicineName: string }> => {
    setCurrentStep("fetch");
    setSearchMessage(`A procurar o folheto de '${info.name}'...`);
    let resolvedName = info.name;

    const pdfResponse = await fetchRegulatoryPdf({ data: { ...info, forceRefresh, selectedCandidate } });

    // Check for disambiguation first (may have no PDF yet)
    const needsDisambiguation = !!(pdfResponse?.candidates && pdfResponse.candidates.length > 0);
    if (needsDisambiguation && pdfResponse.candidates) {
      setDisambiguation(pdfResponse.candidates);
      setSearchMessage("");
      markStepComplete("fetch");
      return { pdfBase64: "", needsDisambiguation: true, medicineName: info.name };
    }

    if (!pdfResponse || !pdfResponse.data) {
      throw new Error("INFARMED_NOT_FOUND: Não foi possível encontrar o folheto informativo deste medicamento.");
    }

    // Enrich medicineInfo with matched medicine data from INFARMED
    if (pdfResponse.matchedMedicine) {
      const m = pdfResponse.matchedMedicine;
      resolvedName = m.name || info.name;
      setMedicineInfo((prev) => ({
        ...prev,
        name: m.name || prev.name,
        activeSubstance: m.activeSubstance || prev.activeSubstance,
        dosage: m.dosage || prev.dosage,
        pharmaceuticalForm: m.pharmaceuticalForm,
        titular: m.titular,
      }));
    }

    setPdfData(pdfResponse.data);
    setSavedPdfBase64(pdfResponse.data);
    setSearchMessage("");
    markStepComplete("fetch");
    return { pdfBase64: pdfResponse.data, needsDisambiguation: false, medicineName: resolvedName };
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
  const runOverviewStep = async (pdfBase64: string, medicineName: string) => {
    setCurrentStep("overview");

    // Run both queries in parallel
    const [overviewResult, summaryResult] = await Promise.all([
      queryLeafletPdf({
        data: {
          pdfBase64: pdfBase64,
          question: "Para que serve este medicamento? Dá um resumo breve.",
          medicineName,
          history: [],
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
  const processMedicineInfo = async (
    info: IdentifyMedicineResponse,
    opts: { startFromStep?: string; forceRefresh?: boolean; selectedCandidate?: Candidate } = {},
  ) => {
    const { startFromStep, forceRefresh, selectedCandidate } = opts;
    setMedicineInfo(info);
    setScreen({ name: "processing" });
    setLoading(true);
    setProcessingError("");
    setFailedStep("");
    setDisambiguation(null);

    if (!startFromStep) {
      // "identify" is complete by the time we reach here: the camera flow already
      // ran it, and non-camera entries (search/manual) have no photo step. Seed it
      // so its checkmark survives this fresh-run reset instead of being wiped.
      setCompletedSteps(["identify"]);
      setCurrentStep("");
    }

    // Track which step is running so an async failure is attributed to the right
    // step — component state would be stale inside this closure's catch block.
    let activeStep = startFromStep || "fetch";
    let resolvedName = info.name;
    try {
      // Step: Fetch PDF
      let pdfBase64 = savedPdfBase64;
      if (!startFromStep || startFromStep === "fetch") {
        activeStep = "fetch";
        const fetchResult = await runFetchStep(info, forceRefresh, selectedCandidate);
        pdfBase64 = fetchResult.pdfBase64;
        resolvedName = fetchResult.medicineName ?? resolvedName;

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
        activeStep = "process";
        await runProcessStep(pdfBase64);
      }

      // Step: Overview
      if (!startFromStep || startFromStep === "fetch" || startFromStep === "process" || startFromStep === "overview") {
        activeStep = "overview";
        await runOverviewStep(pdfBase64, resolvedName);
      }

      // Ready
      markStepComplete("ready");
      setScreen({ name: "results" });
    } catch (error) {
      handleStepError(activeStep, error);
    } finally {
      setLoading(false);
    }
  };

  // Retry a specific failed step
  const handleRetryStep = async (stepId: string) => {
    setProcessingError("");
    setFailedStep("");

    // Identify can only be retried with a new photo — send the user back to the
    // camera rather than leaving them stuck on a dead spinner.
    if (stepId === "identify") {
      setScreen({ name: "camera" });
      return;
    }

    if (stepId === "fetch" || stepId === "process" || stepId === "overview") {
      setLoading(true);
      // processMedicineInfo handles its own errors via handleStepError.
      await processMedicineInfo(medicineInfo, { startFromStep: stepId });
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
      setScreen({ name: "processing" });

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
    // Enrich medicineInfo with the selected candidate's full data
    const enrichedInfo: IdentifyMedicineResponse = {
      ...medicineInfo,
      name: candidate.name,
      activeSubstance: candidate.activeSubstance,
      dosage: candidate.dosage || medicineInfo.dosage,
      pharmaceuticalForm: candidate.pharmaceuticalForm,
      titular: candidate.titular,
    };
    setMedicineInfo(enrichedInfo);
    await processMedicineInfo(enrichedInfo, { selectedCandidate: candidate });
  };

  // Reset to landing
  const handleReset = () => {
    setScreen({ name: "landing" });
    setImage(null);
    setMedicineInfo({ name: "", activeSubstance: "", brand: "", dosage: "", pharmaceuticalForm: undefined, titular: undefined });
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
    setLoading(false);
    // Reset PDF viewer state so a fresh session never inherits a stale
    // "Voltar ao Chat" affordance or a non-default tab.
    setCameFromChat(false);
    setActiveTab("chat");
    setIsPdfViewerOpen(false);
    setLastJumpedPage(null);
  };

  // Force refresh — re-fetch leaflet from INFARMED, bypassing cache
  const handleForceRefresh = async () => {
    await processMedicineInfo(medicineInfo, { forceRefresh: true });
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
  if (screen.name === "landing") {
    return (
      <LandingPage
        onScanMedicine={() => setScreen({ name: "camera" })}
        onManualEntry={() => setScreen({ name: "search" })}
      />
    );
  }

  // Camera
  if (screen.name === "camera") {
    return (
      <Camera
        onCapture={handleCapture}
        onCancel={() => setScreen({ name: "landing" })}
        onManualEntry={() => setScreen({ name: "search" })}
      />
    );
  }

  // Smart search
  if (screen.name === "search") {
    return (
      <SearchScreen
        onSubmit={handleManualSubmit}
        onCancel={() => setScreen({ name: "landing" })}
        onAdvancedSearch={() => setScreen({ name: "manualForm", origin: "search" })}
        onOpenCamera={() => setScreen({ name: "camera" })}
      />
    );
  }

  // Manual form (advanced search)
  if (screen.name === "manualForm") {
    const cancelTo: Screen = screen.origin === "search" ? { name: "search" } : { name: "landing" };
    return (
      <ManualMedicineForm
        key={`manual-${screen.origin}`}
        onSubmit={handleManualSubmit}
        onCancel={() => setScreen(cancelTo)}
        onCancelToLanding={handleReset}
        initialData={screen.initialData}
      />
    );
  }

  // Processing
  if (screen.name === "processing") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-5">
          {/* Disambiguation overlay */}
          {disambiguation && (
            <DisambiguationCard
              candidates={disambiguation}
              onSelect={handleDisambiguationSelect}
              onNoneMatch={() => {
                setDisambiguation(null);
                setScreen({ name: "manualForm", origin: "disambiguation", initialData: medicineInfo });
              }}
              onBack={handleReset}
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
              onGoToCamera={() => setScreen({ name: "camera" })}
              onGoToManualForm={() => setScreen({ name: "manualForm", origin: "search" })}
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
      medicineName={medicineInfo.name}
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
          dosage={medicineInfo.dosage}
          onBack={handleReset}
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
