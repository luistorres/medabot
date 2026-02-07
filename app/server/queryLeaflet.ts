import { createServerFn } from "@tanstack/react-start";
import { processLeaflet, queryLeaflet, ChunkWithEmbedding } from "../core/leafletProcessor";
import { createHash } from "crypto";

interface QueryRequest {
  pdfBase64: string;
  question: string;
}

// Module-level cache: PDF hash → processed chunks
const chunkCache = new Map<string, ChunkWithEmbedding[]>();

function hashPdf(pdfBase64: string): string {
  return createHash("sha256").update(pdfBase64).digest("hex");
}

export const queryLeafletPdf = createServerFn({
  method: "POST",
})
  .inputValidator((data: QueryRequest) => data)
  .handler(async ({ data }) => {
    try {
      const pdfHash = hashPdf(data.pdfBase64);
      let chunks = chunkCache.get(pdfHash);

      if (!chunks) {
        // Process only on first query for this PDF
        const result = await processLeaflet(data.pdfBase64);
        chunks = result.chunks;
        chunkCache.set(pdfHash, chunks);
      }

      // Query the leaflet
      const result = await queryLeaflet(chunks, data.question);

      return {
        success: true,
        answer: result.answer,
        sourceCount: result.sourceDocuments.length,
        pageNumbers: result.pageNumbers || [],
        relevantPages: result.relevantPages || [],
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
