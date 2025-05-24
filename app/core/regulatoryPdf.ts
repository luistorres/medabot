import { chromium, Page, BrowserContext } from "playwright";
import { IdentifyMedicineResponse } from "./identify";
import * as fs from "node:fs";

export async function regulatoryPDF(
  medicineInfo: IdentifyMedicineResponse
): Promise<{ rcm: Buffer | null; fi: Buffer | null }> {
  const browser = await chromium.launch({
    headless: true, // Use non-headless to see what's happening
    devtools: false,
  });
  const context = await browser.newContext();

  // Set up network interception to capture PDF responses
  let pdfBuffer: Buffer | null = null;
  await context.route("**/*", async (route) => {
    const request = route.request();
    const response = await route.fetch();
    const headers = response.headers();

    // Check if this is a PDF response
    if (
      headers["content-type"]?.includes("application/pdf") ||
      headers["content-disposition"]?.includes(".pdf")
    ) {
      console.log("PDF response intercepted!", request.url());
      pdfBuffer = Buffer.from(await response.body());
      await fs.promises.writeFile("./debug-rcm.pdf", pdfBuffer);
      console.log("PDF saved to ./debug-rcm.pdf");
    }

    // Continue the request normally
    await route.fulfill({ response });
  });

  const page = await context.newPage();

  try {
    // First, navigate to the advanced search page to establish a session
    await page.goto(
      "https://extranet.infarmed.pt/INFOMED-fo/pesquisa-avancada.xhtml"
    );

    await page.fill('input[title$="Nome do Medicamento"]', medicineInfo.brand);
    await page.fill(
      'input[title$="Substância Ativa/DCI"]',
      medicineInfo.activeSubstance
    );
    await page.fill('input[title$="Dosagem"]', medicineInfo.dosage);

    await page.click('button[id$="mainForm:btnDoSearch"]');
    await page.waitForSelector('table[summary="Tabela de resultados"]');

    // Now simply click the RCM link and let our network interceptor capture the PDF
    console.log("Clicking RCM link...");

    // Wait for a new page to open
    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      page.click('a[id$="pesqAvancadaDatableRcmIcon"]'),
    ]);

    // Wait for the new page to load
    await newPage.waitForLoadState("domcontentloaded");
    console.log("New page opened:", newPage.url());

    // Wait a bit to ensure any PDF is loaded
    await newPage.waitForTimeout(5000);

    // Close the new page
    await newPage.close();

    return {
      rcm: pdfBuffer,
      fi: null,
    };
  } catch (error) {
    console.error("Error fetching regulatory documents:", error);
    return {
      rcm: null,
      fi: null,
    };
  } finally {
    await browser.close();
  }
}
