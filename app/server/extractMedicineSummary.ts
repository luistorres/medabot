import { createServerFn } from "@tanstack/react-start";
import { processLeaflet, queryLeaflet, ChunkWithEmbedding } from "../core/leafletProcessor";
import { createHash } from "crypto";

export interface MedicineSummary {
  category: string;
  indications: string[];
  /** Short key safety warnings (e.g. max dose, alcohol/interaction) when stated in the leaflet. */
  keyWarnings: string[];
}

// Reuse the same chunk cache from queryLeaflet
const chunkCache = new Map<string, ChunkWithEmbedding[]>();

function hashPdf(pdfBase64: string): string {
  return createHash("sha256").update(pdfBase64).digest("hex");
}

// The shared queryLeaflet system prompt wraps a key phrase in ==...== for the
// chat highlight renderer. Those markers are meaningless in structured summary
// fields, so strip them here.
function stripMarks(s: string): string {
  return s.replace(/==/g, "").trim();
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

      // Two focused queries in parallel. The category/indications query is left
      // exactly as it was (proven reliable); warnings get their own query so the
      // broader ask can't degrade category/indication retrieval.
      const [summaryResult, warningsResult] = await Promise.all([
        queryLeaflet(
          chunks,
          `From this medicine leaflet, extract:
1. The therapeutic category in Portuguese (e.g. "Analgésico e antipirético", "Antibiótico", "Anti-inflamatório não esteroide"). Just the category, no explanation.
2. A list of indications (what the medicine is used to treat). Each indication should be a short phrase in Portuguese, no full sentences.

Reply ONLY in this exact format, nothing else:
CATEGORIA: <category>
- <indication 1>
- <indication 2>
- <indication 3>`
        ),
        queryLeaflet(
          chunks,
          `Deste folheto informativo, indica até 2 avisos de segurança curtos e importantes para o doente, em português, cada um numa frase curta:
(a) a dose máxima (diária) recomendada;
(b) uma interação importante com álcool ou com outros medicamentos.
Inclui um aviso APENAS se estiver explicitamente no folheto. Responde SÓ com linhas de lista (uma por aviso) e mais nada. Se nenhum destes avisos constar do folheto, responde apenas: NENHUM`
        ),
      ]);

      // Parse category + indications (original header-less bullet format).
      const lines = summaryResult.answer
        .split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean);

      let category = "";
      const indications: string[] = [];
      for (const line of lines) {
        if (line.toUpperCase().startsWith("CATEGORIA:")) {
          category = stripMarks(line.replace(/^CATEGORIA:\s*/i, ""));
        } else if (line.startsWith("- ") || line.startsWith("• ")) {
          indications.push(stripMarks(line.replace(/^[-•]\s*/, "")));
        }
      }

      // Parse warnings: list lines only. "NENHUM" / non-bullet prose → no warnings.
      const keyWarnings: string[] = warningsResult.answer
        .split("\n")
        .map((l: string) => l.trim())
        .filter((l: string) => l.startsWith("- ") || l.startsWith("• "))
        .map((l: string) => stripMarks(l.replace(/^[-•]\s*/, "")))
        .filter((l: string) => l && !/^<.*>$/.test(l));

      return {
        category: category || "Medicamento",
        indications,
        keyWarnings,
      };
    } catch (error) {
      console.error("Error extracting medicine summary:", error);
      return {
        category: "Medicamento",
        indications: [],
        keyWarnings: [],
      };
    }
  });
