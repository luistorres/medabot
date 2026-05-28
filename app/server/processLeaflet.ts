import { createServerFn } from "@tanstack/react-start";
import { getLeafletDoc, leafletCacheKey } from "../core/leafletStore";

export const processLeafletPdf = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data }) => {
    try {
      const doc = await getLeafletDoc(data);
      // Return the cache key so the client can reference this parsed leaflet by a
      // lightweight `docId` on chat turns instead of re-uploading the full PDF.
      return { success: true, pageCount: doc.totalPages, docId: leafletCacheKey(data) };
    } catch (error) {
      console.error("Error processing leaflet:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });
