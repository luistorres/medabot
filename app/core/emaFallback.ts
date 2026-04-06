import { stringSimilarity } from "./textUtils";

// --- Types ---

export interface EMAMatch {
  name: string;
  activeSubstance: string;
  slug: string;
  pdfUrl: string;
  confidence: number;
  therapeuticArea: string;
  holder: string;
}

interface EMAMedicine {
  name_of_medicine: string;
  active_substance: string;
  medicine_url: string;
  medicine_status: string;
  category: string;
  therapeutic_area_mesh: string;
  marketing_authorisation_developer_applicant_holder: string;
}

interface EPARDocument {
  name: string;
  document_url: string;
  translations: Record<string, string>;
}

// --- Constants ---

const EMA_MEDICINES_JSON_URL =
  "https://www.ema.europa.eu/en/documents/report/medicines-output-medicines_json-report_en.json";

const EMA_EPAR_DOCUMENTS_JSON_URL =
  "https://www.ema.europa.eu/en/documents/report/documents-output-epar_documents_json-report_en.json";

const EMA_PDF_BASE_URL =
  "https://www.ema.europa.eu/pt/documents/product-information";

const FETCH_TIMEOUT_MS = 30_000;

// Safety thresholds (calibrated via adversarial review)
const BRAND_ONLY_THRESHOLD = 0.85;
const BRAND_DUAL_THRESHOLD = 0.7;
const SUBSTANCE_DUAL_THRESHOLD = 0.5;

// --- Promise singletons for lazy loading ---

let emaMedicinesPromise: Promise<EMAMedicine[]> | null = null;
let emaDocumentsPromise: Promise<EPARDocument[]> | null = null;

function getEmaMedicines(): Promise<EMAMedicine[]> {
  if (!emaMedicinesPromise) {
    emaMedicinesPromise = fetchEmaMedicines().catch((err) => {
      emaMedicinesPromise = null;
      throw err;
    });
  }
  return emaMedicinesPromise;
}

function getEmaDocuments(): Promise<EPARDocument[]> {
  if (!emaDocumentsPromise) {
    emaDocumentsPromise = fetchEmaDocuments().catch((err) => {
      emaDocumentsPromise = null;
      throw err;
    });
  }
  return emaDocumentsPromise;
}

// --- Data fetching ---

async function fetchEmaMedicines(): Promise<EMAMedicine[]> {
  console.log("EMA: Fetching medicines JSON...");
  const response = await fetch(EMA_MEDICINES_JSON_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`EMA medicines JSON fetch failed: ${response.status}`);
  }

  const json = await response.json();

  // Validate structure
  const data = json?.data;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("EMA medicines JSON: invalid structure (data is not a non-empty array)");
  }
  const first = data[0];
  if (!first.name_of_medicine || !first.active_substance || !first.medicine_url) {
    throw new Error("EMA medicines JSON: missing expected fields on first entry");
  }

  // Filter to authorised human medicines
  const filtered = data.filter(
    (m: EMAMedicine) =>
      m.medicine_status === "Authorised" && m.category === "Human"
  );
  console.log(`EMA: Loaded ${filtered.length} authorised human medicines (from ${data.length} total)`);
  return filtered;
}

async function fetchEmaDocuments(): Promise<EPARDocument[]> {
  console.log("EMA: Fetching EPAR documents JSON...");
  const response = await fetch(EMA_EPAR_DOCUMENTS_JSON_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`EMA EPAR documents JSON fetch failed: ${response.status}`);
  }

  const json = await response.json();
  const data = json?.data;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("EMA EPAR documents JSON: invalid structure");
  }

  // Filter to product information PDFs with Portuguese translations
  const piDocs = data.filter(
    (d: EPARDocument) =>
      d.document_url?.includes("product-information") &&
      d.document_url?.endsWith(".pdf") &&
      !d.name?.toLowerCase().includes("tracked") &&
      d.translations?.pt
  );
  console.log(`EMA: Found ${piDocs.length} product info PDFs with Portuguese translations`);
  return piDocs;
}

// --- Brand name extraction ---

/** Extract brand name from AI-identified input like "Ozempic 1mg caneta pré-cheia" → "Ozempic" */
function extractBrandName(input: string): string {
  const trimmed = input.trim();
  // Split on whitespace and take the first token
  const firstToken = trimmed.split(/\s+/)[0];
  // If the second token looks like part of the name (not a number/dosage), include it
  // e.g. "Ben-u-ron" is one token, "Nexium Control" is two
  const tokens = trimmed.split(/\s+/);
  if (
    tokens.length > 1 &&
    !/^\d/.test(tokens[1]) &&
    !tokens[1].match(/^(mg|ml|g|mcg|comprimido|cápsula|solução|caneta|pó|suspensão)s?$/i)
  ) {
    // Check if including second token improves specificity
    const twoTokens = `${tokens[0]} ${tokens[1]}`;
    if (twoTokens.length <= 30) {
      return twoTokens;
    }
  }
  return firstToken;
}

// --- Search ---

export async function searchEMA(
  name: string,
  activeSubstance?: string
): Promise<EMAMatch | null> {
  let medicines: EMAMedicine[];
  try {
    medicines = await getEmaMedicines();
  } catch (err) {
    console.error("EMA: Failed to load medicines data:", err);
    return null;
  }

  const brandName = extractBrandName(name);
  console.log(`EMA: Searching for brand="${brandName}" substance="${activeSubstance || "(none)}"`);

  let bestMatch: { medicine: EMAMedicine; score: number } | null = null;

  for (const med of medicines) {
    const brandSim = stringSimilarity(brandName, med.name_of_medicine);

    if (activeSubstance) {
      const substSim = stringSimilarity(activeSubstance, med.active_substance);
      if (brandSim >= BRAND_DUAL_THRESHOLD && substSim >= SUBSTANCE_DUAL_THRESHOLD) {
        const combined = brandSim * 0.7 + substSim * 0.3;
        if (!bestMatch || combined > bestMatch.score) {
          bestMatch = { medicine: med, score: combined };
        }
      }
    } else {
      if (brandSim >= BRAND_ONLY_THRESHOLD) {
        if (!bestMatch || brandSim > bestMatch.score) {
          bestMatch = { medicine: med, score: brandSim };
        }
      }
    }
  }

  if (!bestMatch) {
    console.log("EMA: No match found above safety thresholds");
    return null;
  }

  const med = bestMatch.medicine;
  const slug = med.medicine_url.split("/").pop() || "";
  const pdfUrl = `${EMA_PDF_BASE_URL}/${slug}-epar-product-information_pt.pdf`;

  console.log(
    `EMA: Best match "${med.name_of_medicine}" (${med.active_substance}) ` +
    `score=${bestMatch.score.toFixed(3)} slug="${slug}"`
  );

  return {
    name: med.name_of_medicine,
    activeSubstance: med.active_substance,
    slug,
    pdfUrl,
    confidence: bestMatch.score,
    therapeuticArea: med.therapeutic_area_mesh,
    holder: med.marketing_authorisation_developer_applicant_holder,
  };
}

// --- PDF download ---

export async function downloadEMAPdf(
  slug: string,
  medicineName?: string
): Promise<Buffer | null> {
  // Tier 1: Construct URL from slug
  const tier1Url = `${EMA_PDF_BASE_URL}/${slug}-epar-product-information_pt.pdf`;
  console.log(`EMA: Downloading PDF (tier 1): ${tier1Url}`);

  const tier1Result = await fetchAndValidatePdf(tier1Url);
  if (tier1Result) return tier1Result;

  // Tier 2: Look up explicit PT URL from EPAR documents JSON
  if (medicineName) {
    console.log(`EMA: Tier 1 failed, trying EPAR documents lookup for "${medicineName}"`);
    const ptUrl = await lookupEparDocumentUrl(medicineName);
    if (ptUrl) {
      console.log(`EMA: Found explicit PT URL: ${ptUrl}`);
      const tier2Result = await fetchAndValidatePdf(ptUrl);
      if (tier2Result) return tier2Result;
    }
  }

  console.log("EMA: PDF download failed (both tiers)");
  return null;
}

async function fetchAndValidatePdf(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });

    if (!response.ok) {
      console.log(`EMA: HTTP ${response.status} for ${url}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Validate PDF magic bytes
    if (buffer.length < 5 || !buffer.subarray(0, 5).toString("ascii").startsWith("%PDF")) {
      console.log("EMA: Response is not a PDF (invalid header)");
      return null;
    }

    // Validate Portuguese content using pdf-parse
    const isPortuguese = await validatePortugueseContent(buffer);
    if (!isPortuguese) {
      console.log("EMA: PDF is not in Portuguese (likely redirected to English)");
      return null;
    }

    console.log(`EMA: Valid Portuguese PDF downloaded (${buffer.length} bytes)`);
    return buffer;
  } catch (err) {
    console.error("EMA: PDF fetch error:", err);
    return null;
  }
}

async function validatePortugueseContent(buffer: Buffer): Promise<boolean> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    // Only parse first few pages for speed
    const data = await pdfParse(buffer, { max: 3 });
    const text = data.text.substring(0, 2000);
    return (
      text.includes("RESUMO DAS CARACTERÍSTICAS DO MEDICAMENTO") ||
      text.includes("RESUMO DAS CARACTER") || // handle encoding variations
      text.includes("ANEXO I")
    );
  } catch {
    // If pdf-parse fails, accept the PDF (better than rejecting a valid one)
    console.warn("EMA: pdf-parse validation failed, accepting PDF");
    return true;
  }
}

async function lookupEparDocumentUrl(medicineName: string): Promise<string | null> {
  try {
    const docs = await getEmaDocuments();
    const normalizedName = medicineName.toLowerCase().trim();

    // Search for matching document by medicine name in title
    const match = docs.find((d) => {
      const docName = d.name.toLowerCase();
      return docName.includes(normalizedName) || normalizedName.includes(docName.split(":")[0].trim());
    });

    return match?.translations?.pt || null;
  } catch (err) {
    console.error("EMA: EPAR documents lookup failed:", err);
    return null;
  }
}
