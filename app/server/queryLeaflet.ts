import { createServerFn } from "@tanstack/react-start";
import { queryLeaflet, ChatTurn } from "../core/leafletProcessor";
import { getLeafletDoc, leafletCacheKey } from "../core/leafletStore";

interface QueryRequest {
  pdfBase64: string;
  question: string;
  medicineName?: string;
  history?: ChatTurn[];
}

export const queryLeafletPdf = createServerFn({ method: "POST" })
  .inputValidator((data: QueryRequest) => data)
  .handler(async ({ data }) => {
    try {
      const doc = await getLeafletDoc(data.pdfBase64);
      const result = await queryLeaflet(
        doc,
        data.history ?? [],
        data.question,
        data.medicineName ?? "",
        leafletCacheKey(data.pdfBase64),
      );

      return {
        success: true,
        answer: result.answer,
        sourceCount: result.sources.length,
        sources: result.sources,
        sourceQuote: result.sourceQuote,
        sourceQuotePage: result.sourceQuotePage,
        pageNumbers: result.pageNumbers || [],
        relevantPages: result.relevantPages || [],
      };
    } catch (error) {
      console.error("Error querying leaflet:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        answer:
          "Desculpe, encontrei um erro ao processar a sua questão. Por favor, tente novamente.",
        sources: [],
        sourceQuote: null,
        sourceQuotePage: null,
        pageNumbers: [],
        relevantPages: [],
      };
    }
  });
