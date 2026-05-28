import { createServerFn } from "@tanstack/react-start";
import { getLeafletDoc } from "../core/leafletStore";

export const processLeafletPdf = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data }) => {
    try {
      const doc = await getLeafletDoc(data);
      return { success: true, pageCount: doc.totalPages };
    } catch (error) {
      console.error("Error processing leaflet:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });
