import { chromium, Page, BrowserContext } from "playwright";
import { IdentifyMedicineResponse } from "./identify";
import * as fs from "node:fs";

export async function regulatoryPDF(
  medicineInfo: IdentifyMedicineResponse
): Promise<{ rcm: Buffer | null; fi: Buffer | null }> {
  const browser = await chromium.launch({
    headless: true,
    devtools: false,
  });
  const context = await browser.newContext();

  // Create a promise that resolves when PDF is captured
  let resolvePdfPromise: (buffer: Buffer | null) => void;

  const pdfPromise = new Promise<Buffer | null>((resolve) => {
    resolvePdfPromise = resolve;

    // Set a timeout in case PDF is never found
    setTimeout(() => {
      console.log("PDF download timeout after 30 seconds");
      resolve(null);
    }, 30000);
  });

  // Set up network interception to capture PDF responses
  await context.route("**/*", async (route) => {
    try {
      const request = route.request();
      const response = await route.fetch();
      const headers = response.headers();

      // Check if this is a PDF response
      if (
        headers["content-type"]?.includes("application/pdf") ||
        headers["content-disposition"]?.includes(".pdf")
      ) {
        console.log("PDF response intercepted!", request.url());
        const pdfBuffer = Buffer.from(await response.body());
        // await fs.promises.writeFile("./debug-rcm.pdf", pdfBuffer);
        // console.log("PDF saved to ./debug-rcm.pdf");

        // Resolve the promise with the PDF buffer
        resolvePdfPromise(pdfBuffer);
      }

      // Continue the request normally
      await route.fulfill({ response });
    } catch (error) {
      // Ignore errors from routes after browser/context is closed
      if (
        error.message?.includes(
          "Target page, context or browser has been closed"
        )
      ) {
        console.log("Route handler called after browser closed, ignoring...");
        return;
      }
      throw error;
    }
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

    // Start the click and immediately wait for PDF
    const clickPromise = page.click('a[id$="pesqAvancadaDatableRcmIcon"]');

    // Wait for either the PDF to be captured or timeout
    console.log("Waiting for PDF to be intercepted...");
    const [pdfBuffer] = await Promise.all([
      pdfPromise,
      clickPromise.catch(() => {
        // Ignore click errors since we only care about the PDF
        console.log("Click completed or failed, but continuing...");
      }),
    ]);

    console.log(
      "PDF interception completed, buffer size:",
      pdfBuffer?.length || 0
    );

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
    try {
      // Clean up route handlers before closing
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await context.close();
    } catch (cleanupError) {
      console.log("Cleanup error (ignoring):", cleanupError.message);
    }

    try {
      await browser.close();
    } catch (browserError) {
      console.log("Browser close error (ignoring):", browserError.message);
    }
  }
}
