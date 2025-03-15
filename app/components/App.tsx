import { useState } from "react";
import Camera from "./Camera";
import { IdentifyMedicineResponse } from "../core/identify";
import { performIdentify } from "../server/performIdentify";
// import { fetchRegulatoryPDF } from "./utils/api";
// import { processPDF, getOverview } from "./utils/llm";

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [medicineInfo, setMedicineInfo] = useState<IdentifyMedicineResponse>({
    name: "",
    activeSubstance: "",
    brand: "",
    dosage: "",
  });
  const [overview, setOverview] = useState<string>("");

  const handleCapture = async (imgSrc: string) => {
    setImage(imgSrc);

    try {
      const medicineInfo = await performIdentify({ data: imgSrc });
      setMedicineInfo(medicineInfo);

      // // Fetch PDF
      // const pdfData = await fetchRegulatoryPDF(ocrResult.name);

      // // Process PDF with LLM
      // const processedData = await processPDF(pdfData);
      // const summary = await getOverview(processedData);
      // setOverview(summary);
    } catch (error) {
      console.error("Error processing image:", error);
      // Add error handling UI as needed
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
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {!image ? (
          <Camera onCapture={handleCapture} />
        ) : (
          <div>
            <img src={image} alt="Captured" />
            <button onClick={handleReset}>Reset</button>
          </div>
        )}
        {medicineInfo.name && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {medicineInfo.name}
            </h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-semibold">Active Substance:</span>{" "}
                {medicineInfo.activeSubstance}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Brand:</span>{" "}
                {medicineInfo.brand}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Dosage:</span>{" "}
                {medicineInfo.dosage}
              </p>
            </div>
          </div>
        )}

        {overview && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Overview</h3>
            <p className="text-gray-700 leading-relaxed">{overview}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
