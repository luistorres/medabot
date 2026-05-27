import { createServerFn } from "@tanstack/react-start";
import { regulatoryPDF, MedicineSearchInput } from "../core/regulatoryPdf";

type FetchRegulatoryPdfInput = MedicineSearchInput & { forceRefresh?: boolean };

/**
 * Error tag prefixes used by the client-side error classifier.
 * Keep in sync with app/utils/classifyProcessingError.ts.
 */
const ERR_NOT_FOUND = "INFARMED_NOT_FOUND:";
const ERR_SERVICE = "INFARMED_SERVICE:";

export const fetchRegulatoryPdf = createServerFn({
  method: "POST",
})
  .inputValidator((medicineInfo: FetchRegulatoryPdfInput) => medicineInfo)
  .handler(async ({ data }) => {
    let result;
    try {
      result = await regulatoryPDF(data, data.forceRefresh);
    } catch (error) {
      // Network / Playwright / scraping failure — tag so the client can classify
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`${ERR_SERVICE}${detail}`);
    }

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

    // Medicine row was matched but PDF retrieval failed operationally —
    // tag as SERVICE so the client shows the right error state.
    if (result.operationalFailure) {
      throw new Error(`${ERR_SERVICE}Não foi possível transferir o folheto informativo para '${data.name}'. Tente novamente.`);
    }

    // Clean "nothing found" — tag so the client shows the right message
    throw new Error(`${ERR_NOT_FOUND}Folheto não encontrado para '${data.name}'.`);
  });
