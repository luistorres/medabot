import { createServerFn } from "@tanstack/react-start";
import { processLeaflet, queryLeaflet } from "../core/leafletProcessor";

interface QueryRequest {
  pdfBase64: string;
  question: string;
}

export const queryLeafletPdf = createServerFn({
  method: "POST",
})
  .validator((data: QueryRequest) => data)
  .handler(async ({ data }) => {
    try {
      // Process the PDF to get the retriever
      const { retriever } = await processLeaflet(data.pdfBase64);

      // Query the leaflet
      const result = await queryLeaflet(retriever, data.question);

      return {
        success: true,
        answer: result.answer,
        sourceCount: result.sourceDocuments.length,
        pageNumbers: result.pageNumbers || [], // Include page numbers for citation
        relevantPages: result.relevantPages || [], // Include relevant pages
      };
    } catch (error) {
      console.error("Error querying leaflet:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        answer: "Desculpe, encontrei um erro ao processar a sua questão. Por favor, tente novamente.",
        pageNumbers: [],
        relevantPages: [],
      };
    }
  });
