import { openai } from "./llm";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { IDENTIFY_MEDICINE_PROMPT } from "./identify_prompt";

const IdentifyMedicineSchema = z.object({
  name: z.string(),
  brand: z.string(),
  activeSubstance: z.string(),
  dosage: z.string(),
});

export type IdentifyMedicineResponse = z.infer<typeof IdentifyMedicineSchema> & {
  pharmaceuticalForm?: string;
  titular?: string;
};

export const identifyMedicine = async (
  image: string
): Promise<IdentifyMedicineResponse> => {
  const base64Image = image.split(",")[1];

  // gpt-4o-mini: cheapest mini model ($0.15/$0.60 per 1M tokens)
  // Consider gpt-5-mini for better performance when available
  const completion = await openai.chat.completions.parse({
    model: "gpt-4o-mini",
    response_format: zodResponseFormat(IdentifyMedicineSchema, "medicine"),
    messages: [
      {
        role: "system",
        content: IDENTIFY_MEDICINE_PROMPT,
      },
      {
        role: "user",
        content: [
          { type: "text", text: "What medicine is shown in this image?" },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
              detail: "low",
            },
          },
        ],
      },
    ],
    max_tokens: 300,
  });

  const parsed = completion.choices[0].message.parsed;

  if (!parsed) {
    throw new Error("Não foi possível identificar o medicamento");
  }

  return parsed;
};
