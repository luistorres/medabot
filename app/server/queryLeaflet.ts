import { createServerFn } from "@tanstack/react-start";
import { queryLeaflet, ChatTurn } from "../core/leafletProcessor";
import { getLeafletDoc, peekLeafletDoc, leafletCacheKey } from "../core/leafletStore";

interface QueryRequest {
  question: string;
  // Chat turns send a lightweight `docId` (the cached PDF hash) to avoid
  // re-uploading the full base64 every message; `pdfBase64` is the fallback the
  // client resends if the server reports DOC_NOT_CACHED (cache evicted/restarted).
  docId?: string;
  pdfBase64?: string;
  medicineName?: string;
  history?: ChatTurn[];
}

export const queryLeafletPdf = createServerFn({ method: "POST" })
  .inputValidator((data: QueryRequest) => data)
  .handler(async ({ data }) => {
    try {
      // Prefer the cached doc (no upload); fall back to parsing the uploaded PDF.
      let doc = data.docId ? peekLeafletDoc(data.docId) : undefined;
      let pdfHash = data.docId ?? "";
      if (!doc) {
        if (!data.pdfBase64) {
          // docId was evicted/expired and no PDF was sent — ask the client to retry
          // with the bytes.
          return {
            success: false,
            error: "DOC_NOT_CACHED",
            answer: "",
            sources: [],
            sourceQuote: null,
            sourceQuotePage: null,
            pageNumbers: [],
            relevantPages: [],
          };
        }
        doc = await getLeafletDoc(data.pdfBase64);
        pdfHash = leafletCacheKey(data.pdfBase64);
      }

      const result = await queryLeaflet(
        doc,
        data.history ?? [],
        data.question,
        data.medicineName ?? "",
        pdfHash,
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
