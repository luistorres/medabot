import { createServerFn } from "@tanstack/react-start";
import { processLeaflet } from "../core/leafletProcessor";

export const processLeafletPdf = createServerFn({
  method: "POST",
})
  .validator((pdfBase64: string) => pdfBase64)
  .handler(async ({ data }) => {
    try {
      const result = await processLeaflet(data);

      // Return serializable data (can't return the actual retriever/vectorstore)
      return {
        success: true,
        documentCount: result.documentCount,
        message: `Successfully processed ${result.documentCount} document chunks`,
      };
    } catch (error) {
      console.error("Error processing leaflet:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });
