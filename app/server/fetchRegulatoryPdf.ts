import { createServerFn } from "@tanstack/react-start";
import { regulatoryPDF, MedicineSearchInput } from "../core/regulatoryPdf";

type FetchRegulatoryPdfInput = MedicineSearchInput & { forceRefresh?: boolean };

export const fetchRegulatoryPdf = createServerFn({
  method: "POST",
})
  .inputValidator((medicineInfo: FetchRegulatoryPdfInput) => medicineInfo)
  .handler(async ({ data }) => {
    const result = await regulatoryPDF(data, data.forceRefresh);

    // Disambiguation: return candidates even without a PDF
    if (result.candidates && result.candidates.length > 0) {
      return {
        data: result.rcm ? result.rcm.toString("base64") : null,
        fi: result.fi ? result.fi.toString("base64") : null,
        contentType: "application/pdf",
        candidates: result.candidates,
        confidence: result.confidence,
      };
    }

    if (result.rcm) {
      return {
        data: result.rcm.toString("base64"),
        fi: result.fi ? result.fi.toString("base64") : null,
        contentType: "application/pdf",
        confidence: result.confidence,
        matchedMedicine: result.matchedMedicine,
      };
    }

    return null;
  });
