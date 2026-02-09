import { chromium, Browser, BrowserContext, Page } from "playwright";
import { getCachedPdf, setCachedPdf, deleteCachedPdf } from "./db";
import { stringSimilarity } from "./textUtils";
import { searchMedicinesLocally } from "./localSearch";
import { warmupPlaywright, consumeWarmInstance } from "./playwrightPool";

export interface SearchCandidate {
  name: string;
  activeSubstance: string;
  similarity: number;
  pharmaceuticalForm?: string;
  dosage?: string;
  titular?: string;
}

export interface MedicineSearchInput {
  name: string;
  activeSubstance?: string;
  dosage?: string;
  brand?: string;
  selectedCandidate?: SearchCandidate;
}

interface SearchResult {
  name: string;
  activeSubstance: string;
  pharmaceuticalForm: string;
  dosage: string;
  titular: string;
  rowIndex: number;
  similarity: number;
  nameSimilarity: number;
  substanceSimilarity: number;
}

// Extract and validate search results from the table
async function extractSearchResults(
  page: Page,
  expectedName: string,
  expectedActiveSubstance?: string
): Promise<SearchResult[]> {
  try {
    const results: SearchResult[] = [];

    // Wait for the results table
    await page.waitForSelector('table[summary="Tabela de resultados"]', {
      timeout: 5000,
    });

    // Extract all medicine names from the results table
    const rows = await page.$$(
      'table[summary="Tabela de resultados"] tbody tr'
    );

    console.log(`Found ${rows.length} result rows`);

    for (let i = 0; i < rows.length; i++) {
      try {
        // Extract all columns
        const cells = await rows[i].$$("td");
        const allCellTexts = await Promise.all(
          cells.map(async (cell) => (await cell.textContent())?.trim() || "")
        );

        // Log all columns for debugging (first row only)
        if (i === 0) {
          console.log(`Table columns (row 0):`, allCellTexts);
        }

        // INFARMED table columns: [ID, Name, Active Substance, Pharma Form, Dosage, Titular, Comercialização, ?, Documents]
        // Find first non-numeric column as start of meaningful data
        let dataStart = 0;
        for (let c = 0; c < allCellTexts.length; c++) {
          if (allCellTexts[c] && !/^\d+$/.test(allCellTexts[c])) {
            dataStart = c;
            break;
          }
        }

        const clean = (s?: string) => (s || "").replace(/\s+/g, " ").trim();
        // INFARMED appends badge suffixes in the HTML cell (MG = Genérico,
        // MB = Biossimilar, MP = Pediátrico); textContent() picks them up — strip them.
        const name = clean(allCellTexts[dataStart]).replace(/\s+(?:MG|MB|MP)$/i, "");
        const activeSubstance = clean(allCellTexts[dataStart + 1]);
        const pharmaceuticalForm = clean(allCellTexts[dataStart + 2]);
        const dosage = clean(allCellTexts[dataStart + 3]);
        const titular = clean(allCellTexts[dataStart + 4]);

        // Skip "no results" messages in Portuguese
        const isNoResultsMessage =
          name.toLowerCase().includes("sem resultado") ||
          name.toLowerCase().includes("no results") ||
          name.toLowerCase().includes("não foram encontrados");

        if (name && !isNoResultsMessage) {
          // Calculate similarity for both name and active substance
          const nameSimilarity = stringSimilarity(name, expectedName);
          const substanceSimilarity = activeSubstance && expectedActiveSubstance
            ? stringSimilarity(activeSubstance, expectedActiveSubstance)
            : 0;

          // Weighted combined similarity: adjust weights based on available info
          const combinedSimilarity = expectedActiveSubstance
            ? nameSimilarity * 0.7 + substanceSimilarity * 0.3
            : nameSimilarity;

          results.push({
            name,
            activeSubstance: activeSubstance || "(unknown)",
            pharmaceuticalForm,
            dosage,
            titular,
            rowIndex: i,
            similarity: combinedSimilarity,
            nameSimilarity,
            substanceSimilarity,
          });
          console.log(
            `Result ${i}: "${name}" | Active: "${activeSubstance || "N/A"}" | Form: "${pharmaceuticalForm}" | Dosage: "${dosage}" | Titular: "${titular}" ` +
            `(name: ${nameSimilarity.toFixed(2)}, substance: ${substanceSimilarity.toFixed(2)}, ` +
            `combined: ${combinedSimilarity.toFixed(2)})`
          );
        } else if (isNoResultsMessage) {
          console.log(`Skipping no-results message: "${name}"`);
        } else if (!name) {
          console.log(
            `Row ${i}: No valid name found (only numbers or empty cells)`
          );
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
      { waitUntil: "domcontentloaded" }
    );

    // Wait for the form to be ready before filling fields
    await page.waitForSelector('input[title$="Nome do Medicamento"]', {
      timeout: 15000,
    });

    // Clear default filters (AIM="Autorizado", Comercialização="Comercializado")
    // which hide non-commercialized medicines that still have PDFs on INFARMED.
    // "Limpar" triggers a PrimeFaces AJAX that fully rebuilds the form DOM.
    // We must wait for the old input to be detached and a fresh one to appear.
    const oldInput = await page.$('input[title$="Nome do Medicamento"]');
    await page.click('button:has-text("Limpar")');
    // Wait until PrimeFaces replaces the DOM (old element detaches)
    if (oldInput) {
      await page.waitForFunction(
        (el) => !el.isConnected,
        oldInput,
        { timeout: 5000 }
      ).catch(() => {});
    }
    await page.waitForSelector('input[title$="Nome do Medicamento"]', {
      timeout: 5000,
    });

    // Fill the form fields (clear fields not in attempt by filling with empty string)
    await page.fill(
      'input[title$="Nome do Medicamento"]',
      attempt.name || ""
    );
    await page.fill(
      'input[title$="Substância Ativa/DCI"]',
      attempt.activeSubstance || ""
    );
    await page.fill('input[title$="Dosagem"]', attempt.dosage || "");

    console.log(
      `Searching with: ${JSON.stringify(attempt, null, 2).replace(/\n/g, " ")}`
    );

    // Click search button
    await page.click('button[id$="mainForm:btnDoSearch"]');

    // Wait for results or error message
    try {
      // await for 2 seconds before checking for results as the page always displays this table
      await page.waitForTimeout(2000);
      await page.waitForSelector('table[summary="Tabela de resultados"]', {
        timeout: 10000,
      });

      return true;
    } catch (error) {
      // Check if there's a "no results" message
      const noResultsMsg = await page
        .locator("text=/não foram encontrados resultados/i")
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

export interface MatchedMedicineInfo {
  pharmaceuticalForm?: string;
  dosage?: string;
  titular?: string;
  activeSubstance?: string;
  name?: string;
}

export interface RegulatoryPDFResult {
  rcm: Buffer | null;
  fi: Buffer | null;
  candidates?: SearchCandidate[];
  confidence: number;
  matchedMedicine?: MatchedMedicineInfo;
}

// Build search strategies dynamically based on available input fields.
// Only creates strategies that use fields we actually have, so we don't
// waste time searching with empty values.
function buildSearchStrategies(input: MedicineSearchInput): SearchAttempt[] {
  const strategies: SearchAttempt[] = [];
  const hasSubstance = !!input.activeSubstance;
  const hasDosage = !!input.dosage;

  // Most specific first: all available fields
  if (hasSubstance && hasDosage) {
    strategies.push({
      name: input.name,
      activeSubstance: input.activeSubstance,
      dosage: input.dosage,
    });
  }

  // Name + active substance
  if (hasSubstance) {
    strategies.push({
      name: input.name,
      activeSubstance: input.activeSubstance,
    });
  }

  // Name only (always try this)
  strategies.push({ name: input.name });

  // Try first word of name as fallback (e.g. "Paracetamol" from "Paracetamol Ratiopharm 500mg")
  const firstWord = input.name.split(/[\s,]+/)[0];
  if (firstWord && firstWord.toLowerCase() !== input.name.toLowerCase() && firstWord.length > 2) {
    strategies.push({ name: firstWord });
  }

  // Active substance only as last resort
  if (hasSubstance) {
    strategies.push({ activeSubstance: input.activeSubstance });
  }

  return strategies;
}

export async function regulatoryPDF(
  medicineInfo: MedicineSearchInput,
  forceRefresh?: boolean
): Promise<RegulatoryPDFResult> {
  const { selectedCandidate } = medicineInfo;
  const normalizedName = medicineInfo.name.toLowerCase().trim();
  const normalizedDosage = medicineInfo.dosage?.toLowerCase().trim();

  // Build cache key: candidate-specific when user already picked, otherwise search-based.
  // Normalise whitespace & strip trailing "MG" to avoid duplicate cache entries.
  const normKey = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim().replace(/\s+(?:mg|mb|mp)$/, "");
  const cacheKey = selectedCandidate
    ? [selectedCandidate.name, selectedCandidate.dosage || "", selectedCandidate.pharmaceuticalForm || ""]
        .map(normKey)
        .join("|")
    : normalizedDosage
      ? `${normalizedName}|${normalizedDosage}`
      : normalizedName;

  // If force-refreshing, delete cached entries so we re-fetch from INFARMED
  if (forceRefresh) {
    console.log(`Force refresh requested — deleting cache for "${medicineInfo.name}"`);
    deleteCachedPdf(cacheKey);
  }

  // === Phase 1: Check PDF cache — skip Playwright entirely on hit ===
  const cached = getCachedPdf(cacheKey);
  if (cached) {
    console.log(`Cache hit for "${cacheKey}" — returning cached PDF (${cached.rcmPdf?.length ?? 0} bytes)`);
    return {
      rcm: cached.rcmPdf,
      fi: cached.fiPdf,
      confidence: cached.confidence,
      matchedMedicine: {
        name: cached.medicineName,
        activeSubstance: cached.activeSubstance,
        dosage: cached.dosage || undefined,
        pharmaceuticalForm: cached.pharmaceuticalForm || undefined,
        titular: cached.titular || undefined,
      },
    };
  }

  // === Phase 1.5: Local DB search (instant, no Playwright) ===
  if (!selectedCandidate) {
    const localResults = searchMedicinesLocally({
      name: medicineInfo.name,
      activeSubstance: medicineInfo.activeSubstance,
      dosage: medicineInfo.dosage,
    });

    if (localResults.length > 0) {
      console.log(`Local DB: ${localResults.length} result(s) for "${medicineInfo.name}"`);

      if (localResults.length > 1) {
        // Multiple results — fire warmup in background, return candidates
        warmupPlaywright();
        return { rcm: null, fi: null, candidates: localResults, confidence: localResults[0].similarity };
      }
      // Single result — fall through to Playwright for PDF download
      console.log(`Local DB: single match "${localResults[0].name}" — proceeding to PDF download`);
    } else {
      console.log(`Local DB: no results for "${medicineInfo.name}" — falling back to Playwright search`);
    }
  }

  // === Phase 2: Launch browser and search INFARMED ===
  // Try to reuse a warmed Playwright instance, otherwise launch fresh
  const warm = await consumeWarmInstance();
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  if (warm) {
    console.log("Reusing warmed Playwright instance");
    browser = warm.browser;
    context = warm.context;
    page = warm.page;
  } else {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();
  }

  try {
    let searchResults: SearchResult[] = [];

    console.log(
      `Starting PDF search for: ${medicineInfo.name}` +
      (medicineInfo.activeSubstance ? ` (${medicineInfo.activeSubstance})` : "") +
      (medicineInfo.dosage ? ` [${medicineInfo.dosage}]` : "") +
      (selectedCandidate ? ` [targeting: ${selectedCandidate.name} / ${selectedCandidate.dosage} / ${selectedCandidate.pharmaceuticalForm}]` : "")
    );

    // When targeting a specific candidate, search using its actual name/dosage
    // instead of the original (possibly abbreviated) user input.
    // Clean whitespace and trailing "MG" (Medicamento Genérico badge) from
    // candidate fields — they may carry INFARMED HTML artefacts.
    const cleanField = (s?: string) => (s || "").replace(/\s+/g, " ").trim();
    const cleanName = (s?: string) => cleanField(s).replace(/\s+(?:MG|MB|MP)$/i, "");
    const searchInput: MedicineSearchInput = selectedCandidate
      ? {
          ...medicineInfo,
          name: cleanName(selectedCandidate.name),
          activeSubstance: selectedCandidate.activeSubstance !== "(unknown)"
            ? cleanField(selectedCandidate.activeSubstance)
            : medicineInfo.activeSubstance,
          dosage: cleanField(selectedCandidate.dosage) || medicineInfo.dosage,
        }
      : medicineInfo;
    const searchStrategies = buildSearchStrategies(searchInput);

    for (let i = 0; i < searchStrategies.length; i++) {
      console.log(`\n=== Attempt ${i + 1}/${searchStrategies.length} ===`);

      const success = await performSearch(page, searchStrategies[i]);

      if (success) {
        searchResults = await extractSearchResults(
          page,
          searchInput.name,
          searchInput.activeSubstance || undefined
        );

        if (searchResults.length > 0) {
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

    if (searchResults.length === 0) {
      console.error(
        "All search strategies failed - no results found for:",
        medicineInfo.name
      );
      return { rcm: null, fi: null, confidence: 0 };
    }

    // --- Pick the target row ---
    let bestMatch: SearchResult;

    if (selectedCandidate) {
      // User already picked — find the exact row matching all fields
      const norm = (s?: string) => (s || "").toLowerCase().replace(/\s+/g, " ").trim().replace(/\s+(?:mg|mb|mp)$/, "");
      const match = searchResults.find(
        (r) =>
          norm(r.name) === norm(selectedCandidate.name) &&
          norm(r.dosage) === norm(selectedCandidate.dosage) &&
          norm(r.pharmaceuticalForm) === norm(selectedCandidate.pharmaceuticalForm)
      );
      if (!match) {
        // Candidate from local DB not found on INFARMED — return what INFARMED
        // does have so the user can pick from actually-available options
        console.warn(
          `Selected candidate not found on INFARMED: ` +
          `"${selectedCandidate.name}" / "${selectedCandidate.dosage}" / "${selectedCandidate.pharmaceuticalForm}" ` +
          `— returning ${searchResults.length} INFARMED result(s) for re-selection`
        );
        const fallbackCandidates: SearchCandidate[] = searchResults.map((r) => ({
          name: r.name,
          activeSubstance: r.activeSubstance,
          similarity: r.similarity,
          pharmaceuticalForm: r.pharmaceuticalForm || undefined,
          dosage: r.dosage || undefined,
          titular: r.titular || undefined,
        }));
        return { rcm: null, fi: null, candidates: fallbackCandidates, confidence: 0 };
      }
      bestMatch = match;
      console.log(
        `\nMatched selected candidate at row ${bestMatch.rowIndex}: "${bestMatch.name}" | ` +
        `Form: "${bestMatch.pharmaceuticalForm}" | Dosage: "${bestMatch.dosage}"`
      );
    } else {
      bestMatch = searchResults[0];
      console.log(
        `\nBest match: "${bestMatch.name}" | Active: "${bestMatch.activeSubstance}"\n` +
        `  Name similarity: ${bestMatch.nameSimilarity.toFixed(2)}\n` +
        `  Substance similarity: ${bestMatch.substanceSimilarity.toFixed(2)}\n` +
        `  Combined score: ${bestMatch.similarity.toFixed(2)}`
      );

      // Multiple results — return candidates for disambiguation, skip PDF download
      if (searchResults.length > 1) {
        const candidates: SearchCandidate[] = searchResults.map((r) => ({
          name: r.name,
          activeSubstance: r.activeSubstance,
          similarity: r.similarity,
          pharmaceuticalForm: r.pharmaceuticalForm || undefined,
          dosage: r.dosage || undefined,
          titular: r.titular || undefined,
        }));
        console.log(
          `Multiple results (${searchResults.length}) — returning candidates for user disambiguation`
        );
        return { rcm: null, fi: null, candidates, confidence: bestMatch.similarity };
      }
    }

    // === Phase 3: Click RCM link and intercept PDF response ===
    console.log("Click-and-intercept for PDF download");

    let resolvePdfPromise: (buffer: Buffer | null) => void;
    const pdfPromise = new Promise<Buffer | null>((resolve) => {
      resolvePdfPromise = resolve;
      setTimeout(() => {
        console.log("PDF download timeout after 30 seconds");
        resolve(null);
      }, 30000);
    });

    // Set up route interception only now (not during search phase)
    await context.route("**/*", async (route) => {
      try {
        const request = route.request();
        const response = await route.fetch();
        const headers = response.headers();

        const contentType = headers["content-type"] || "";
        const contentDisposition = headers["content-disposition"] || "";
        const isDocument =
          contentType.includes("application/pdf") ||
          contentType.includes("application/msword") ||
          contentType.includes("application/vnd.openxmlformats") ||
          contentType.includes("application/octet-stream") ||
          contentDisposition.includes(".pdf") ||
          contentDisposition.includes(".doc");

        if (isDocument) {
          console.log(`Document intercepted! Content-Type: ${contentType}, URL: ${request.url()}`);
          const docBuffer = Buffer.from(await response.body());
          resolvePdfPromise(docBuffer);
        }

        await route.fulfill({ response });
      } catch (error: any) {
        if (
          error.message?.includes(
            "Target page, context or browser has been closed"
          )
        ) {
          return;
        }
        throw error;
      }
    });

    const rcmSelector = `table[summary="Tabela de resultados"] tbody tr:nth-child(${bestMatch.rowIndex + 1}) a[id$="pesqAvancadaDatableRcmIcon"]`;
    const clickPromise = page.click(rcmSelector);

    console.log("Waiting for PDF to be intercepted...");
    const [pdfBuffer] = await Promise.all([
      pdfPromise,
      clickPromise.catch(() => {
        console.log("Click completed or failed, but continuing...");
      }),
    ]);

    // Validate that the intercepted document is actually a PDF (starts with %PDF)
    const isPdf = pdfBuffer && pdfBuffer.length > 4 && pdfBuffer.subarray(0, 5).toString("ascii").startsWith("%PDF");

    if (pdfBuffer && !isPdf) {
      console.error(`✗ Intercepted document is not a PDF (header: "${pdfBuffer.subarray(0, 20).toString("ascii")}") — skipping`);
    }

    if (isPdf) {
      console.log("✓ Successfully retrieved PDF via interception");

      // Cache under the candidate-specific key (name|dosage|form)
      const cacheEntry = {
        rcmPdf: pdfBuffer,
        fiPdf: null,
        medicineName: bestMatch.name,
        activeSubstance: bestMatch.activeSubstance,
        dosage: bestMatch.dosage || "",
        pharmaceuticalForm: bestMatch.pharmaceuticalForm || "",
        titular: bestMatch.titular || "",
        confidence: bestMatch.similarity,
      };
      setCachedPdf(cacheKey, cacheEntry);
      console.log(`Cached PDF under "${cacheKey}" (${pdfBuffer.length} bytes)`);
    } else {
      console.error("✗ Failed to retrieve PDF - timeout or network error");
    }

    return {
      rcm: isPdf ? pdfBuffer : null,
      fi: null,
      confidence: bestMatch.similarity,
      matchedMedicine: {
        name: bestMatch.name,
        activeSubstance: bestMatch.activeSubstance,
        pharmaceuticalForm: bestMatch.pharmaceuticalForm || undefined,
        dosage: bestMatch.dosage || undefined,
        titular: bestMatch.titular || undefined,
      },
    };
  } catch (error) {
    console.error("Error fetching regulatory documents:", error);
    return {
      rcm: null,
      fi: null,
      confidence: 0,
    };
  } finally {
    try {
      await page?.unrouteAll({ behavior: "ignoreErrors" });
      await context?.close();
    } catch (cleanupError: any) {
      console.log("Cleanup error (ignoring):", cleanupError.message);
    }

    try {
      await browser?.close();
    } catch (browserError: any) {
      console.log("Browser close error (ignoring):", browserError.message);
    }
  }
}
