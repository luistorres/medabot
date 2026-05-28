import { createServerFn } from "@tanstack/react-start";
import { openai } from "../core/llm";

interface SuggestRequest {
  lastAnswer: string;
  medicineName: string;
}

export const suggestFollowUps = createServerFn({
  method: "POST",
})
  .inputValidator((data: SuggestRequest) => data)
  .handler(async ({ data }): Promise<string[]> => {
    try {
      // Sanitize the client-supplied name before interpolating it into the prompt
      // (single line, length-capped) — mirrors the guard in queryLeaflet.
      const safeName =
        (data.medicineName || "")
          .replace(/[\r\n]+/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80) || "este medicamento";
      const response = await openai.chat.completions.create({
        model: "gpt-5.4-mini",
        reasoning_effort: "minimal",
        max_completion_tokens: 1000,
        messages: [
          {
            role: "system",
            content: `Generate 2-3 short follow-up questions in Portuguese that a patient might ask after reading the given answer about ${safeName}. Return a JSON object of the form {"questions": ["...", "...", "..."]} with the questions as an array of strings. Questions should be specific and different from common generic questions.`,
          },
          { role: "user", content: data.lastAnswer },
        ],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
      const questions = parsed.questions || parsed.followUps || [];

      return Array.isArray(questions) ? questions.slice(0, 3) : [];
    } catch {
      return [];
    }
  });
