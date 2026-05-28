import { createServerFn } from "@tanstack/react-start";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  processLeaflet,
  retrieveRelevantChunks,
  ChunkWithEmbedding,
} from "../core/leafletProcessor";
import { openai } from "../core/llm";
import { createHash } from "crypto";

export interface MedicineSummary {
  category: string;
  indications: string[];
  keyWarnings: string[];
}

const MedicineSummarySchema = z.object({
  category: z.string(),
  indications: z.array(z.string()),
  keyWarnings: z.array(z.string()),
});

// Reuse the same chunk cache shape as the leaflet query path.
const chunkCache = new Map<string, ChunkWithEmbedding[]>();

function hashPdf(pdfBase64: string): string {
  return createHash("sha256").update(pdfBase64).digest("hex");
}

export function sanitizeMedicineSummary(
  summary: MedicineSummary,
): MedicineSummary {
  return {
    category: summary.category.trim() || "Medicamento",
    indications: summary.indications.map((s) => s.trim()).filter(Boolean),
    keyWarnings: summary.keyWarnings
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2),
  };
}

function formatContext(chunks: ChunkWithEmbedding[]): string {
  return chunks
    .map((c) => `[Página ${c.page}]\n${c.text}`)
    .join("\n\n---\n\n");
}

function dedupeChunks(chunks: ChunkWithEmbedding[]): ChunkWithEmbedding[] {
  const seen = new Set<string>();
  const deduped: ChunkWithEmbedding[] = [];

  for (const chunk of chunks) {
    const key = `${chunk.page}:${chunk.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(chunk);
  }

  return deduped;
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

      const [identityChunks, safetyChunks] = await Promise.all([
        retrieveRelevantChunks(
          chunks,
          "categoria terapêutica, indicações, para que é utilizado este medicamento",
          6,
        ),
        retrieveRelevantChunks(
          chunks,
          "dose máxima diária recomendada, interações importantes com álcool ou outros medicamentos",
          6,
        ),
      ]);
      const relevantChunks = dedupeChunks([...identityChunks, ...safetyChunks]);
      const contextWithPages = formatContext(relevantChunks);

      const response = await openai.chat.completions.parse({
        model: "gpt-5.4",
        reasoning_effort: "low",
        response_format: zodResponseFormat(
          MedicineSummarySchema,
          "medicine_summary",
        ),
        max_completion_tokens: 2000,
        messages: [
          {
            role: "system",
            content: `És um extrator de dados de folhetos informativos de medicamentos.

Devolve apenas dados que constem explicitamente do contexto fornecido. Nunca inventes nem completes com conhecimento externo.

Extrai:
- category: categoria terapêutica em português, curta.
- indications: lista de frases curtas em português sobre para que serve o medicamento; sem frases completas.
- keyWarnings: no máximo 2 avisos curtos. Inclui um aviso apenas se constar explicitamente do folheto e for sobre: (a) dose máxima diária recomendada, ou (b) interação importante com álcool ou outros medicamentos. Caso contrário, devolve [].

Não incluas citações de página, marcadores de realce, nem texto fora do JSON estruturado.`,
          },
          {
            role: "user",
            content: `Contexto do folheto:
${contextWithPages}`,
          },
        ],
      });

      const parsed = response.choices[0]?.message?.parsed;

      return sanitizeMedicineSummary(
        parsed ?? {
          category: "Medicamento",
          indications: [],
          keyWarnings: [],
        },
      );
    } catch (error) {
      console.error("Error extracting medicine summary:", error);
      return {
        category: "Medicamento",
        indications: [],
        keyWarnings: [],
      };
    }
  });
