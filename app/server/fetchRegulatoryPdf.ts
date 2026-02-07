import { createServerFn } from "@tanstack/react-start";
import { regulatoryPDF, SearchCandidate } from "../core/regulatoryPdf";
import { IdentifyMedicineResponse } from "../core/identify";

export const fetchRegulatoryPdf = createServerFn({
  method: "POST",
})
  .inputValidator((medicineInfo: IdentifyMedicineResponse) => medicineInfo)
  .handler(async ({ data }) => {
    const result = await regulatoryPDF(data);

    if (result.rcm) {
      return {
        data: result.rcm.toString("base64"),
        contentType: "application/pdf",
        candidates: result.candidates,
        confidence: result.confidence,
      };
    }

    return null;
  });
