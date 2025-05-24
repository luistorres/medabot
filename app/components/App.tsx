import { useState } from "react";
import Camera from "./Camera";
import Chat from "./Chat";
import { IdentifyMedicineResponse } from "../core/identify";
import { performIdentify } from "../server/performIdentify";
import { fetchRegulatoryPdf } from "../server/fetchRefulatoryPdf";
import { processLeafletPdf } from "../server/processLeaflet";
import { queryLeafletPdf } from "../server/queryLeaflet";

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [medicineInfo, setMedicineInfo] = useState<IdentifyMedicineResponse>({
    name: "",
    activeSubstance: "",
    brand: "",
    dosage: "",
  });
  const [overview, setOverview] = useState<string>("");
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Processing steps state
  const [currentStep, setCurrentStep] = useState<string>("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [processingError, setProcessingError] = useState<string>("");

  const steps = [
    { id: "identify", label: "Identifying medicine from image", icon: "🔍" },
    { id: "fetch", label: "Fetching patient leaflet", icon: "📄" },
    { id: "process", label: "Processing leaflet with AI", icon: "🤖" },
    { id: "overview", label: "Generating overview", icon: "📝" },
    { id: "ready", label: "Ready for questions", icon: "✅" },
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
        throw new Error("Failed to fetch patient leaflet");
      }

      setPdfData(pdfResponse.data);
      markStepComplete("fetch");

      // Step 3: Process PDF with LangChain
      setCurrentStep("process");
      const processResult = await processLeafletPdf({
        data: pdfResponse.data,
      });

      if (!processResult.success) {
        throw new Error(processResult.error || "Failed to process leaflet");
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
        error instanceof Error ? error.message : "An unknown error occurred"
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {!image ? (
          <Camera onCapture={handleCapture} />
        ) : !medicineInfo.name ? (
          // Show image only while processing, hide after medicine is identified
          <div className="flex flex-col">
            <img src={image} alt="Captured" className="rounded-lg" />
            <button
              onClick={handleReset}
              className="bg-blue-500 text-white px-4 py-2 rounded-md mt-4"
            >
              Reset
            </button>
          </div>
        ) : (
          // Show only reset button after medicine is identified
          <div className="flex justify-center">
            <button
              onClick={handleReset}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm"
            >
              Scan New Medicine
            </button>
          </div>
        )}

        {medicineInfo.name && (
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4">
              {medicineInfo.name}
            </h2>
            <div className="space-y-2">
              <p className="text-sm md:text-base text-gray-700">
                <span className="font-semibold">Active Substance:</span>{" "}
                {medicineInfo.activeSubstance}
              </p>
              <p className="text-sm md:text-base text-gray-700">
                <span className="font-semibold">Brand:</span>{" "}
                {medicineInfo.brand}
              </p>
              <p className="text-sm md:text-base text-gray-700">
                <span className="font-semibold">Dosage:</span>{" "}
                {medicineInfo.dosage}
              </p>
            </div>
            {pdfData && (
              <button
                onClick={downloadPdf}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded mt-3 md:mt-4 transition-colors text-sm md:text-base"
              >
                <span>📄</span>
                <span>Download Leaflet</span>
              </button>
            )}
          </div>
        )}

        {/* Processing Steps */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4">
              Processing Medicine Information
            </h3>
            <div className="space-y-3">
              {steps.map((step) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = currentStep === step.id;

                return (
                  <div key={step.id} className="flex items-center space-x-3">
                    <div
                      className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm ${
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
                      className={`text-sm md:text-base ${
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
                        <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-blue-600"></div>
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
                <h4 className="text-red-800 font-medium text-sm md:text-base">
                  Processing Error
                </h4>
                <p className="text-red-700 text-xs md:text-sm mt-1">
                  {processingError}
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Chat Component */}
        {completedSteps.includes("ready") && pdfData && (
          <Chat
            pdfData={pdfData}
            medicineName={medicineInfo.name}
            initialOverview={overview}
          />
        )}
      </div>
    </div>
  );
}

export default App;
