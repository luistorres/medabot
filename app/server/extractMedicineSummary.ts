import { createServerFn } from "@tanstack/react-start";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { openai } from "../core/llm";
import { getLeafletDoc, assembleLeafletContext, leafletCacheKey } from "../core/leafletStore";
import { normalizeForMatch } from "../utils/pdfHighlight";
import { isNotFoundAnswer } from "../utils/isNotFoundAnswer";

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

// Negative / not-found phrasing a model may leak into a structured array despite
// being told to return [] (restores + broadens the filtering added in 1ad0206).
const NEGATIVE_WARNING_RE =
  /^(nenhum|sem (informa|aviso)|n[ãa]o (consta|constam|encontr|encontrad|se aplica|aplic|h[áa]|existe|foram|foi))/i;

// Strip a redundant leading "Alívio/Tratamento [sintomático] de/da …" stem so the
// "Para que serve" list reads as bare conditions instead of every line opening with
// the same words. The section title already frames these as what the medicine treats,
// so the stem is noise — and stripping it also salvages the model's occasional
// mangled stem (e.g. the typo "Alívio sintático de"). Deterministic: never relies on
// the model phrasing it well.
const INDICATION_STEM_RE =
  /^\s*(?:al[íi]vio|tratamento)\s+(?:sint(?:om)?[áa]tico\s+)?(?:de|da|das|do|dos)\s+/i;

export function stripIndicationStem(s: string): string {
  const cleaned = s.replace(INDICATION_STEM_RE, "").trim();
  if (!cleaned) return s.trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function sanitizeMedicineSummary(
  summary: MedicineSummary,
): MedicineSummary {
  // Strip the redundant stem, drop blanks/duplicates, cap to keep the list scannable.
  const seen = new Set<string>();
  const indications: string[] = [];
  for (const raw of summary.indications) {
    const ind = stripIndicationStem(raw.trim());
    const key = ind.toLowerCase();
    if (!ind || seen.has(key)) continue;
    seen.add(key);
    indications.push(ind);
    if (indications.length === 6) break;
  }
  return {
    category: summary.category.trim() || "Medicamento",
    indications,
    keyWarnings: summary.keyWarnings
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2),
  };
}

/**
 * Keep only warnings that are grounded in the page text. A warning survives
 * when its model-provided `anchor` (a short verbatim snippet) is found —
 * accent/case-insensitively — anywhere on a page, and its `text` is not an
 * empty/negative/not-found phrase. Drops anything ungrounded so a hallucinated
 * dose/interaction never reaches the UI. Caps at 2.
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

export const extractMedicineSummary = createServerFn({
  method: "POST",
})
  .inputValidator((data: string) => data)
  .handler(async ({ data: pdfBase64 }): Promise<MedicineSummary> => {
    try {
      const doc = await getLeafletDoc(pdfBase64);
      const contextWithPages = assembleLeafletContext(doc.pages);

      const response = await openai.chat.completions.parse({
        model: "gpt-5.4",
        reasoning_effort: "low",
        response_format: zodResponseFormat(ExtractionSchema, "medicine_summary"),
        max_completion_tokens: 2000,
        prompt_cache_key: leafletCacheKey(pdfBase64),
        messages: [
          {
            role: "system",
            content: `És um extrator de dados de folhetos informativos de medicamentos. Devolve apenas dados que constem explicitamente do folheto. Nunca inventes nem completes com conhecimento externo.

Extrai:
- category: categoria terapêutica em pt-PT, curta.
- indications: lista CURTA (máximo 6) das condições/finalidades, em pt-PT. Cada item é APENAS o nome da condição, em poucas palavras (ex.: «Febre», «Dores de cabeça», «Dores musculares», «Estados gripais», «Enxaquecas diagnosticadas»). NUNCA comeces um item com «Alívio», «Tratamento», «Alívio sintomático de», «Tratamento sintomático de» nem com um verbo — escreve apenas a condição. Agrupa as semelhantes numa só linha quando fizer sentido.
- keyWarnings: no máximo 2 avisos, cada um { text, anchor }. "text" é o aviso curto e factual em pt-PT, APENAS sobre (a) dose máxima diária recomendada, ou (b) interação importante (álcool ou outros medicamentos). NÃO incluas números de página no "text"; NÃO uses fórmulas como "consulte o médico" ou "salvo indicação médica" a menos que façam parte literal do aviso no folheto. "anchor" é um trecho VERBATIM curto copiado EXATAMENTE do folheto que comprova o aviso e TEM de incluir quaisquer números/doses do "text". Inclui um aviso só se constar do folheto; caso contrário devolve [].

Não incluas números de página, marcadores de realce, nem texto fora do JSON.`,
          },
          { role: "user", content: `Folheto informativo:\n${contextWithPages}` },
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
        keyWarnings: groundKeyWarnings(parsed?.keyWarnings ?? [], doc.pages),
      });
    } catch (error) {
      console.error("Error extracting medicine summary:", error);
      return { category: "Medicamento", indications: [], keyWarnings: [] };
    }
  });
