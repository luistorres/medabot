import { createServerFn } from "@tanstack/react-start";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  processLeaflet,
  retrieveRelevantChunks,
  ChunkWithEmbedding,
} from "../core/leafletProcessor";
import { openai } from "../core/llm";
import { normalizeForMatch } from "../utils/pdfHighlight";
import { isNotFoundAnswer } from "../utils/isNotFoundAnswer";
import { createHash } from "crypto";

export interface MedicineSummary {
  category: string;
  indications: string[];
  keyWarnings: string[];
}

// Each warning carries a short verbatim `anchor` copied from the leaflet so the
// server can confirm it is actually grounded before showing it in the prominent
// "Importante saber" callout (mirrors the chat path's sourceQuote validation).
const ExtractionSchema = z.object({
  category: z.string(),
  indications: z.array(z.string()),
  keyWarnings: z.array(
    z.object({
      text: z.string(),
      anchor: z.string(),
    }),
  ),
});

// Reuse the same chunk cache shape as the leaflet query path.
const chunkCache = new Map<string, ChunkWithEmbedding[]>();

function hashPdf(pdfBase64: string): string {
  return createHash("sha256").update(pdfBase64).digest("hex");
}

// Negative / not-found phrasing a model may leak into a structured array despite
// being told to return [] (restores + broadens the filtering added in 1ad0206).
const NEGATIVE_WARNING_RE =
  /^(nenhum|sem (informa|aviso)|n[ãa]o (consta|constam|encontr|encontrad|se aplica|aplic|h[áa]|existe|foram|foi))/i;

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

/**
 * Keep only warnings that are grounded in the retrieved leaflet text. A warning
 * survives when its model-provided `anchor` (a short verbatim snippet) is found
 * — accent/case-insensitively — in one of the retrieved chunks, and its `text`
 * is not an empty/negative/not-found phrase. Drops anything ungrounded so a
 * hallucinated dose/interaction never reaches the UI. Caps at 2.
 */
export function groundKeyWarnings(
  warnings: { text: string; anchor: string }[],
  chunks: { text: string }[],
): string[] {
  const normalizedChunks = chunks.map((c) => normalizeForMatch(c.text));
  const out: string[] = [];

  for (const w of warnings) {
    const text = w.text?.trim() ?? "";
    const anchor = w.anchor?.trim() ?? "";
    if (!text || !anchor) continue;
    if (NEGATIVE_WARNING_RE.test(text) || isNotFoundAnswer(text)) continue;

    const normalizedAnchor = normalizeForMatch(anchor);
    // Too few words to verify reliably — treat as ungrounded.
    if (normalizedAnchor.split(" ").filter(Boolean).length < 3) continue;
    if (!normalizedChunks.some((c) => c.includes(normalizedAnchor))) continue;

    // The displayed text must not assert a number the verified anchor lacks —
    // blocks a real anchor paired with an overstated/wrong dose (e.g. text
    // "8 g/dia" with anchor "não tome mais de 4 g por dia").
    const anchorDigits = new Set(normalizedAnchor.match(/\d+/g) ?? []);
    const textDigits = normalizeForMatch(text).match(/\d+/g) ?? [];
    if (!textDigits.every((d) => anchorDigits.has(d))) continue;

    out.push(text);
    if (out.length === 2) break;
  }

  return out;
}

function formatContext(chunks: ChunkWithEmbedding[]): string {
  return chunks
    .map((c) => `[Página ${c.page}]\n${c.text}`)
    .join("\n\n---\n\n");
}

export function dedupeChunks(
  chunks: ChunkWithEmbedding[],
): ChunkWithEmbedding[] {
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
        response_format: zodResponseFormat(ExtractionSchema, "medicine_summary"),
        max_completion_tokens: 2000,
        messages: [
          {
            role: "system",
            content: `És um extrator de dados de folhetos informativos de medicamentos.

Devolve apenas dados que constem explicitamente do contexto fornecido. Nunca inventes nem completes com conhecimento externo.

Extrai:
- category: categoria terapêutica em português, curta.
- indications: lista de frases curtas em português sobre para que serve o medicamento; sem frases completas.
- keyWarnings: no máximo 2 avisos. Cada aviso é um objeto { text, anchor }: "text" é o aviso curto em português, apenas sobre (a) dose máxima diária recomendada, ou (b) interação importante com álcool ou outros medicamentos; "anchor" é um trecho VERBATIM curto (poucas palavras) copiado EXATAMENTE do contexto que comprova esse aviso, e TEM de incluir quaisquer números/doses mencionados no "text". Inclui um aviso apenas se constar explicitamente do folheto; caso contrário devolve []. Nunca inventes o anchor — tem de aparecer tal e qual no contexto.

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
      if (!parsed) {
        console.warn(
          `extractMedicineSummary: structured parse returned null (finish_reason=${response.choices[0]?.finish_reason})`,
        );
      }

      return sanitizeMedicineSummary({
        category: parsed?.category ?? "",
        indications: parsed?.indications ?? [],
        keyWarnings: groundKeyWarnings(parsed?.keyWarnings ?? [], relevantChunks),
      });
    } catch (error) {
      console.error("Error extracting medicine summary:", error);
      return {
        category: "Medicamento",
        indications: [],
        keyWarnings: [],
      };
    }
  });
