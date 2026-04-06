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
      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        reasoning_effort: "minimal",
        max_completion_tokens: 1000,
        messages: [
          {
            role: "system",
            content: `Generate 2-3 short follow-up questions in Portuguese that a patient might ask after reading the given answer about ${data.medicineName}. Return JSON array of strings only. Questions should be specific and different from common generic questions.`,
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
