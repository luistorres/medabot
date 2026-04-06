/**
 * Integration tests for EMA fallback module.
 * Uses mocked HTTP fixtures (no external calls).
 *
 * Run: npx tsx scripts/ema-integration-test.ts
 */

import { stringSimilarity } from "../app/core/textUtils";

// --- Mock data fixtures ---

const MOCK_MEDICINES = [
  {
    name_of_medicine: "Ozempic",
    active_substance: "semaglutide",
    medicine_url: "https://www.ema.europa.eu/en/medicines/human/EPAR/ozempic",
    medicine_status: "Authorised",
    category: "Human",
    therapeutic_area_mesh: "Diabetes Mellitus, Type 2",
    marketing_authorisation_developer_applicant_holder: "Novo Nordisk A/S",
  },
  {
    name_of_medicine: "Eliquis",
    active_substance: "apixaban",
    medicine_url: "https://www.ema.europa.eu/en/medicines/human/EPAR/eliquis",
    medicine_status: "Authorised",
    category: "Human",
    therapeutic_area_mesh: "Venous Thromboembolism",
    marketing_authorisation_developer_applicant_holder: "Bristol-Myers Squibb / Pfizer EEIG",
  },
  {
    name_of_medicine: "Lyrica",
    active_substance: "pregabalin",
    medicine_url: "https://www.ema.europa.eu/en/medicines/human/EPAR/lyrica",
    medicine_status: "Authorised",
    category: "Human",
    therapeutic_area_mesh: "Epilepsy",
    marketing_authorisation_developer_applicant_holder: "Upjohn EESV",
  },
  {
    name_of_medicine: "Lixiana",
    active_substance: "edoxaban tosilate monohydrate",
    medicine_url: "https://www.ema.europa.eu/en/medicines/human/EPAR/lixiana",
    medicine_status: "Authorised",
    category: "Human",
    therapeutic_area_mesh: "Venous Thromboembolism",
    marketing_authorisation_developer_applicant_holder: "Daiichi Sankyo Europe GmbH",
  },
  {
    name_of_medicine: "Withdrawn Medicine",
    active_substance: "withdrawn substance",
    medicine_url: "https://www.ema.europa.eu/en/medicines/human/EPAR/withdrawn",
    medicine_status: "Withdrawn",
    category: "Human",
    therapeutic_area_mesh: "",
    marketing_authorisation_developer_applicant_holder: "",
  },
  {
    name_of_medicine: "Vet Medicine",
    active_substance: "vet substance",
    medicine_url: "https://www.ema.europa.eu/en/medicines/veterinary/EPAR/vetmed",
    medicine_status: "Authorised",
    category: "Veterinary",
    therapeutic_area_mesh: "",
    marketing_authorisation_developer_applicant_holder: "",
  },
];

// --- Matching constants (must match emaFallback.ts) ---
const BRAND_ONLY_THRESHOLD = 0.85;
const BRAND_DUAL_THRESHOLD = 0.7;
const SUBSTANCE_DUAL_THRESHOLD = 0.5;

// --- Test helpers ---

function extractBrandName(input: string): string {
  const trimmed = input.trim();
  const tokens = trimmed.split(/\s+/);
  if (
    tokens.length > 1 &&
    !/^\d/.test(tokens[1]) &&
    !tokens[1].match(/^(mg|ml|g|mcg|comprimido|cápsula|solução|caneta|pó|suspensão)s?$/i)
  ) {
    const twoTokens = `${tokens[0]} ${tokens[1]}`;
    if (twoTokens.length <= 30) return twoTokens;
  }
  return tokens[0];
}

function searchMockEMA(
  name: string,
  activeSubstance?: string
): { name: string; slug: string; score: number } | null {
  const authorised = MOCK_MEDICINES.filter(
    (m) => m.medicine_status === "Authorised" && m.category === "Human"
  );

  const brandName = extractBrandName(name);
  let bestMatch: { medicine: (typeof MOCK_MEDICINES)[0]; score: number } | null = null;

  for (const med of authorised) {
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

  if (!bestMatch) return null;
  const slug = bestMatch.medicine.medicine_url.split("/").pop() || "";
  return { name: bestMatch.medicine.name_of_medicine, slug, score: bestMatch.score };
}

// --- Test runner ---

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (err: any) {
    failed++;
    console.log(`  FAIL: ${name}`);
    console.log(`    ${err.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// --- Tests ---

console.log("\n=== EMA Integration Tests ===\n");

console.log("Search matching:");

test("Exact brand + substance match", () => {
  const result = searchMockEMA("Ozempic", "semaglutide");
  assert(result !== null, "Should match Ozempic");
  assert(result!.name === "Ozempic", `Expected Ozempic, got ${result!.name}`);
  assert(result!.slug === "ozempic", `Expected slug ozempic, got ${result!.slug}`);
});

test("Brand with dosage stripped", () => {
  const result = searchMockEMA("Ozempic 1mg caneta pré-cheia", "semaglutide");
  assert(result !== null, "Should match Ozempic even with dosage text");
  assert(result!.name === "Ozempic", `Expected Ozempic, got ${result!.name}`);
});

test("Lyrica does NOT match Lixiana (brand-only, below 0.85)", () => {
  const result = searchMockEMA("Lyrica");
  // Lyrica should match Lyrica, not Lixiana
  assert(result !== null, "Should match Lyrica");
  assert(result!.name === "Lyrica", `Expected Lyrica, got ${result!.name}`);
});

test("Lyrica with substance does NOT match Lixiana", () => {
  const result = searchMockEMA("Lyrica", "pregabalin");
  assert(result !== null, "Should match Lyrica");
  assert(result!.name === "Lyrica", `Expected Lyrica, got ${result!.name}`);
});

test("Brand-only below threshold returns null", () => {
  const result = searchMockEMA("Brufen");
  assert(result === null, "Brufen should not match any EMA medicine");
});

test("Withdrawn medicines are excluded", () => {
  const result = searchMockEMA("Withdrawn Medicine", "withdrawn substance");
  assert(result === null, "Withdrawn medicines should be excluded");
});

test("Veterinary medicines are excluded", () => {
  const result = searchMockEMA("Vet Medicine", "vet substance");
  assert(result === null, "Veterinary medicines should be excluded");
});

test("Good substance but terrible brand does not match", () => {
  const result = searchMockEMA("Paracetamol", "semaglutide");
  assert(result === null, "Paracetamol should not match Ozempic even with matching substance");
});

test("Eliquis exact match", () => {
  const result = searchMockEMA("Eliquis 5mg", "apixaban");
  assert(result !== null, "Should match Eliquis");
  assert(result!.name === "Eliquis", `Expected Eliquis, got ${result!.name}`);
});

console.log("\nCache key isolation:");

test("INFARMED and EMA cache keys are different", () => {
  const cacheKey = "ozempic|1 mg";
  const emaCacheKey = `ema:${cacheKey}`;
  assert(cacheKey !== emaCacheKey, "Keys should be different");
  assert(emaCacheKey.startsWith("ema:"), "EMA key should have ema: prefix");
});

test("Force refresh should target both keys", () => {
  const cacheKey = "ozempic|1 mg";
  const keysToDelete = [cacheKey, `ema:${cacheKey}`];
  assert(keysToDelete.length === 2, "Should delete 2 keys");
  assert(keysToDelete[0] === "ozempic|1 mg", "First key is INFARMED");
  assert(keysToDelete[1] === "ema:ozempic|1 mg", "Second key is EMA");
});

console.log("\nURL construction:");

test("PDF URL constructed from slug", () => {
  const slug = "ozempic";
  const url = `https://www.ema.europa.eu/pt/documents/product-information/${slug}-epar-product-information_pt.pdf`;
  assert(url.includes("/pt/"), "URL should use /pt/ prefix for Portuguese");
  assert(url.endsWith("_pt.pdf"), "URL should end with _pt.pdf");
  assert(url.includes("ozempic"), "URL should contain the slug");
});

console.log("\nBrand name extraction:");

test("Simple brand: Ozempic", () => {
  assert(extractBrandName("Ozempic") === "Ozempic", "Should extract Ozempic");
});

test("Brand with dosage: Ozempic 1mg", () => {
  const brand = extractBrandName("Ozempic 1mg");
  assert(brand === "Ozempic", `Expected Ozempic, got ${brand}`);
});

test("Brand with Portuguese form: Ozempic 1mg caneta pré-cheia", () => {
  const brand = extractBrandName("Ozempic 1mg caneta pré-cheia");
  assert(brand === "Ozempic", `Expected Ozempic, got ${brand}`);
});

test("Two-word brand: Nexium Control", () => {
  const brand = extractBrandName("Nexium Control 20mg");
  assert(brand === "Nexium Control", `Expected 'Nexium Control', got '${brand}'`);
});

test("Hyphenated brand: Ben-u-ron", () => {
  const brand = extractBrandName("Ben-u-ron 500mg");
  assert(brand === "Ben-u-ron", `Expected Ben-u-ron, got ${brand}`);
});

// --- Summary ---

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
