import { createServerFn } from "@tanstack/react-start";
import { processLeaflet, queryLeaflet, ChunkWithEmbedding } from "../core/leafletProcessor";
import { createHash } from "crypto";

export interface MedicineSummary {
  category: string;
  indications: string[];
}

// Reuse the same chunk cache from queryLeaflet
const chunkCache = new Map<string, ChunkWithEmbedding[]>();

function hashPdf(pdfBase64: string): string {
  return createHash("sha256").update(pdfBase64).digest("hex");
}

export const extractMedicineSummary = createServerFn({
  method: "POST",
})
  .inputValidator((data: string) => data)
  .handler(async ({ data: pdfBase64 }): Promise<MedicineSummary> => {
    try {
      const pdfHash = hashPdf(pdfBase64);
      let chunks = chunkCache.get(pdfHash);

      if (!chunks) {
        const result = await processLeaflet(pdfBase64);
        chunks = result.chunks;
        chunkCache.set(pdfHash, chunks);
      }

      const result = await queryLeaflet(
        chunks,
        `From this medicine leaflet, extract:
1. The therapeutic category in Portuguese (e.g. "Analgésico e antipirético", "Antibiótico", "Anti-inflamatório não esteroide"). Just the category, no explanation.
2. A list of indications (what the medicine is used to treat). Each indication should be a short phrase in Portuguese, no full sentences.

Reply ONLY in this exact format, nothing else:
CATEGORIA: <category>
- <indication 1>
- <indication 2>
- <indication 3>`
      );

      const answer = result.answer;
      const lines = answer.split("\n").map((l: string) => l.trim()).filter(Boolean);

      let category = "";
      const indications: string[] = [];

      for (const line of lines) {
        if (line.toUpperCase().startsWith("CATEGORIA:")) {
          category = line.replace(/^CATEGORIA:\s*/i, "").trim();
        } else if (line.startsWith("- ") || line.startsWith("• ")) {
          indications.push(line.replace(/^[-•]\s*/, "").trim());
        }
      }

      return {
        category: category || "Medicamento",
        indications,
      };
    } catch (error) {
      console.error("Error extracting medicine summary:", error);
      return {
        category: "Medicamento",
        indications: [],
      };
    }
  });
