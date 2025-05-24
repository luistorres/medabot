import { createServerFn } from "@tanstack/react-start";
import { regulatoryPDF } from "../core/regulatoryPdf";
import { IdentifyMedicineResponse } from "../core/identify";

export const fetchRegulatoryPdf = createServerFn({
  method: "POST",
})
  .validator((medicineInfo: IdentifyMedicineResponse) => medicineInfo)
  .handler(async ({ data }) => {
    const { rcm } = await regulatoryPDF(data);

    // Convert Buffer to Base64 string if not null
    if (rcm) {
      return {
        data: rcm.toString("base64"),
        contentType: "application/pdf",
      };
    }

    return null;
  });
