import { chromium, Page, BrowserContext } from "playwright";
import { IdentifyMedicineResponse } from "./identify";
import * as fs from "node:fs";

// Simple string similarity function for fuzzy matching
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Levenshtein distance-based similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

interface SearchResult {
  name: string;
  rowIndex: number;
  similarity: number;
}

// Extract and validate search results from the table
async function extractSearchResults(
  page: Page,
  expectedName: string
): Promise<SearchResult[]> {
  try {
    const results: SearchResult[] = [];

    // Wait for the results table
    await page.waitForSelector('table[summary="Tabela de resultados"]', {
      timeout: 5000,
    });

    // Extract all medicine names from the results table
    const rows = await page.$$('table[summary="Tabela de resultados"] tbody tr');

    console.log(`Found ${rows.length} result rows`);

    for (let i = 0; i < rows.length; i++) {
      try {
        // Get the medicine name from the first column
        const nameCell = await rows[i].$("td:first-child");
        if (nameCell) {
          const name = (await nameCell.textContent())?.trim() || "";
          if (name) {
            const similarity = stringSimilarity(name, expectedName);
            results.push({
              name,
              rowIndex: i,
              similarity,
            });
            console.log(
              `Result ${i}: "${name}" (similarity: ${similarity.toFixed(2)})`
            );
          }
        }
      } catch (error) {
        console.warn(`Error extracting row ${i}:`, error);
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    return results;
  } catch (error) {
    console.error("Error extracting search results:", error);
    return [];
  }
}

interface SearchAttempt {
  name?: string;
  activeSubstance?: string;
  dosage?: string;
}

// Perform search with given criteria
async function performSearch(
  page: Page,
  attempt: SearchAttempt
): Promise<boolean> {
  try {
    // Navigate back to the search page for each attempt
    await page.goto(
      "https://extranet.infarmed.pt/INFOMED-fo/pesquisa-avancada.xhtml",
      { waitUntil: "networkidle" }
    );

    // Fill the form fields
    if (attempt.name) {
      await page.fill('input[title$="Nome do Medicamento"]', attempt.name);
    }
    if (attempt.activeSubstance) {
      await page.fill(
        'input[title$="Substância Ativa/DCI"]',
        attempt.activeSubstance
      );
    }
    if (attempt.dosage) {
      await page.fill('input[title$="Dosagem"]', attempt.dosage);
    }

    console.log(
      `Searching with: ${JSON.stringify(attempt, null, 2).replace(/\n/g, " ")}`
    );

    // Click search button
    await page.click('button[id$="mainForm:btnDoSearch"]');

    // Wait for results or error message
    try {
      await page.waitForSelector('table[summary="Tabela de resultados"]', {
        timeout: 10000,
      });
      return true;
    } catch (error) {
      // Check if there's a "no results" message
      const noResultsMsg = await page
        .locator('text=/não foram encontrados resultados/i')
        .first()
        .isVisible()
        .catch(() => false);

      if (noResultsMsg) {
        console.log("No results found for this search");
        return false;
      }

      // Other error - rethrow
      throw error;
    }
  } catch (error) {
    console.error("Search attempt failed:", error);
    return false;
  }
}

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

        // Resolve the promise with the PDF buffer
        resolvePdfPromise(pdfBuffer);
      }

      // Continue the request normally
      await route.fulfill({ response });
    } catch (error: any) {
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
    console.log(
      `Starting PDF search for: ${medicineInfo.name} (${medicineInfo.activeSubstance}, ${medicineInfo.dosage})`
    );

    // Define 4-tier progressive fallback strategy
    const searchStrategies: SearchAttempt[] = [
      {
        // Try 1: All fields (most specific)
        name: medicineInfo.name,
        activeSubstance: medicineInfo.activeSubstance,
        dosage: medicineInfo.dosage,
      },
      {
        // Try 2: Name + active substance (handles different dosages)
        name: medicineInfo.name,
        activeSubstance: medicineInfo.activeSubstance,
      },
      {
        // Try 3: Name only (handles variations in formulation)
        name: medicineInfo.name,
      },
      {
        // Try 4: Active substance only (broadest search)
        activeSubstance: medicineInfo.activeSubstance,
      },
    ];

    let searchResults: SearchResult[] = [];
    let successfulStrategy: SearchAttempt | null = null;

    // Try each strategy until we get results
    for (let i = 0; i < searchStrategies.length; i++) {
      console.log(`\n=== Attempt ${i + 1}/${searchStrategies.length} ===`);

      const success = await performSearch(page, searchStrategies[i]);

      if (success) {
        // Extract and validate results
        const expectedName = medicineInfo.name;
        searchResults = await extractSearchResults(page, expectedName);

        if (searchResults.length > 0) {
          successfulStrategy = searchStrategies[i];
          console.log(
            `✓ Strategy ${i + 1} succeeded with ${searchResults.length} result(s)`
          );
          break;
        } else {
          console.log(`✗ Strategy ${i + 1} returned no valid results`);
        }
      } else {
        console.log(`✗ Strategy ${i + 1} failed - no results found`);
      }
    }

    // Check if we found any results
    if (searchResults.length === 0) {
      console.error(
        "All search strategies failed - no results found for:",
        medicineInfo.name
      );
      return {
        rcm: null,
        fi: null,
      };
    }

    // Select the best match
    const bestMatch = searchResults[0];
    console.log(
      `\nBest match: "${bestMatch.name}" (similarity: ${bestMatch.similarity.toFixed(2)})`
    );

    if (bestMatch.similarity < 0.5) {
      console.warn(
        `⚠ Low confidence match (${bestMatch.similarity.toFixed(2)}) - proceeding with caution`
      );
    }

    // Click the RCM link for the best matching result
    console.log(`Clicking RCM link for result at index ${bestMatch.rowIndex}...`);

    // Build the selector for the specific row
    const rcmSelector = `table[summary="Tabela de resultados"] tbody tr:nth-child(${bestMatch.rowIndex + 1}) a[id$="pesqAvancadaDatableRcmIcon"]`;

    // Start the click and wait for PDF
    const clickPromise = page.click(rcmSelector);

    // Wait for either the PDF to be captured or timeout
    console.log("Waiting for PDF to be intercepted...");
    const [pdfBuffer] = await Promise.all([
      pdfPromise,
      clickPromise.catch(() => {
        console.log("Click completed or failed, but continuing...");
      }),
    ]);

    console.log(
      "PDF interception completed, buffer size:",
      pdfBuffer?.length || 0
    );

    if (pdfBuffer) {
      console.log("✓ Successfully retrieved PDF");
    } else {
      console.error("✗ Failed to retrieve PDF - timeout or network error");
    }

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
    } catch (cleanupError: any) {
      console.log("Cleanup error (ignoring):", cleanupError.message);
    }

    try {
      await browser.close();
    } catch (browserError: any) {
      console.log("Browser close error (ignoring):", browserError.message);
    }
  }
}
