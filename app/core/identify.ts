import { openai } from "./llm";
import { z } from "zod";

const IdentifyMedicineSchema = z.object({
  name: z.string(),
  brand: z.string(),
  activeSubstance: z.string(),
  dosage: z.string(),
});

export type IdentifyMedicineResponse = z.infer<typeof IdentifyMedicineSchema>;

export const identifyMedicine = async (
  image: string
): Promise<IdentifyMedicineResponse> => {
  const base64Image = image.split(",")[1];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-nano",
    messages: [
      {
        role: "system",
        content: `You are a pharmaceutical expert analyzing medicine packaging images. Extract medicine details from the image.
Return only a JSON object in this format, with no additional text and make sure to keep the portuguese names:
{
  "name": "standardized medicine name",
  "brand": "manufacturer/brand name",
  "activeSubstance": "primary active ingredients",
  "dosage": "dosage form with standard pharmaceutical units (e.g., 1 g, 500 mg)"
}`,
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

  if (!completion.choices[0].message.content) {
    throw new Error("No content in response");
  }

  try {
  const parsed = IdentifyMedicineSchema.parse(
    JSON.parse(completion.choices[0].message.content)
  );
  return parsed;
  } catch (error) {
    throw new Error("Não foi possível identificar o medicamento");
  }
};
