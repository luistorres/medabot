import { createServerFn } from "@tanstack/react-start";
import { regulatoryPDF, SearchCandidate, MedicineSearchInput } from "../core/regulatoryPdf";

type FetchRegulatoryPdfInput = MedicineSearchInput & { forceRefresh?: boolean };

export const fetchRegulatoryPdf = createServerFn({
  method: "POST",
})
  .inputValidator((medicineInfo: FetchRegulatoryPdfInput) => medicineInfo)
  .handler(async ({ data }) => {
    const result = await regulatoryPDF(data, data.forceRefresh);

    if (result.rcm) {
      return {
        data: result.rcm.toString("base64"),
        fi: result.fi ? result.fi.toString("base64") : null,
        contentType: "application/pdf",
        candidates: result.candidates,
        confidence: result.confidence,
      };
    }

    return null;
  });
