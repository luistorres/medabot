import { createServerFn } from "@tanstack/react-start";
import { openai } from "../core/llm";

interface ParsedSearchResult {
  name: string;
  activeSubstance: string;
  dosage: string;
  brand: string;
}

export const parseSearchInput = createServerFn({
  method: "POST",
})
  .inputValidator((query: string) => query)
  .handler(async ({ data }): Promise<ParsedSearchResult> => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        max_completion_tokens: 200,
        messages: [
          {
            role: "system",
            content: `You parse Portuguese medicine search queries into structured data.
Extract: name (medicine name), activeSubstance (active ingredient), dosage (e.g. 500mg), brand (manufacturer/brand).
Return JSON only. If a field is unclear, leave it as empty string.
Example: "paracetamol ratiopharm 500mg" → {"name":"Paracetamol Ratiopharm","activeSubstance":"Paracetamol","dosage":"500mg","brand":"Ratiopharm"}`,
          },
          { role: "user", content: data },
        ],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");

      return {
        name: parsed.name || data,
        activeSubstance: parsed.activeSubstance || "",
        dosage: parsed.dosage || "",
        brand: parsed.brand || "",
      };
    } catch {
      // Fallback: use raw input as name
      return {
        name: data,
        activeSubstance: "",
        dosage: "",
        brand: "",
      };
    }
  });
