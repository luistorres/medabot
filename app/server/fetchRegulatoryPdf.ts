import { createServerFn } from "@tanstack/react-start";
import { regulatoryPDF, SearchCandidate, MedicineSearchInput } from "../core/regulatoryPdf";

export const fetchRegulatoryPdf = createServerFn({
  method: "POST",
})
  .inputValidator((medicineInfo: MedicineSearchInput) => medicineInfo)
  .handler(async ({ data }) => {
    const result = await regulatoryPDF(data);

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
