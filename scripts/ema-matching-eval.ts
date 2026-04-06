/**
 * Offline evaluation corpus for EMA name matching.
 * Tests safety thresholds against adversarial medicine name pairs.
 *
 * Run: npx tsx scripts/ema-matching-eval.ts
 */

import { stringSimilarity } from "../app/core/textUtils";

// --- Constants (must match emaFallback.ts) ---
const BRAND_ONLY_THRESHOLD = 0.85;
const BRAND_DUAL_THRESHOLD = 0.7;
const SUBSTANCE_DUAL_THRESHOLD = 0.5;

// --- Evaluation types ---

interface TestCase {
  description: string;
  aiInput: string; // What the AI identification returns
  activeSubstance?: string; // Active substance from AI
  emaName: string; // EMA medicine name
  emaSubstance: string; // EMA active substance
  shouldMatch: boolean; // Expected result
}

// --- Test corpus ---

const corpus: TestCase[] = [
  // === TRUE POSITIVES (should match) ===
  {
    description: "Exact brand match",
    aiInput: "Ozempic",
    activeSubstance: "semaglutide",
    emaName: "Ozempic",
    emaSubstance: "semaglutide",
    shouldMatch: true,
  },
  {
    description: "Brand with dosage in input",
    aiInput: "Ozempic 1mg caneta pré-cheia",
    activeSubstance: "semaglutide",
    emaName: "Ozempic",
    emaSubstance: "semaglutide",
    shouldMatch: true,
  },
  {
    description: "Eliquis match",
    aiInput: "Eliquis 5mg",
    activeSubstance: "apixaban",
    emaName: "Eliquis",
    emaSubstance: "apixaban",
    shouldMatch: true,
  },
  {
    description: "Lyrica exact",
    aiInput: "Lyrica 75mg",
    activeSubstance: "pregabalin",
    emaName: "Lyrica",
    emaSubstance: "pregabalin",
    shouldMatch: true,
  },
  {
    description: "Humira match",
    aiInput: "Humira 40mg",
    activeSubstance: "adalimumab",
    emaName: "Humira",
    emaSubstance: "adalimumab",
    shouldMatch: true,
  },
  {
    description: "Xarelto match",
    aiInput: "Xarelto 20mg",
    activeSubstance: "rivaroxaban",
    emaName: "Xarelto",
    emaSubstance: "rivaroxaban",
    shouldMatch: true,
  },
  {
    description: "Nexium Control match",
    aiInput: "Nexium Control 20mg",
    activeSubstance: "esomeprazole",
    emaName: "Nexium Control",
    emaSubstance: "esomeprazole magnesium dihydrate",
    shouldMatch: true,
  },
  {
    description: "Portuguese INN variant: semaglutido vs semaglutide",
    aiInput: "Ozempic",
    activeSubstance: "semaglutido",
    emaName: "Ozempic",
    emaSubstance: "semaglutide",
    shouldMatch: true,
  },
  {
    description: "Brand-only match (high confidence)",
    aiInput: "Ozempic",
    emaName: "Ozempic",
    emaSubstance: "semaglutide",
    shouldMatch: true,
  },
  {
    description: "Keytruda match",
    aiInput: "Keytruda 25mg/ml",
    activeSubstance: "pembrolizumab",
    emaName: "Keytruda",
    emaSubstance: "pembrolizumab",
    shouldMatch: true,
  },

  // === TRUE NEGATIVES (should NOT match) ===
  {
    description: "Lyrica vs Lixiana (similar names, different drugs)",
    aiInput: "Lyrica 75mg",
    emaName: "Lixiana",
    emaSubstance: "edoxaban tosilate monohydrate",
    shouldMatch: false,
  },
  {
    description: "Xarelto vs Xalkori (similar names, different drugs)",
    aiInput: "Xarelto 20mg",
    emaName: "Xalkori",
    emaSubstance: "crizotinib",
    shouldMatch: false,
  },
  {
    description: "Lyrica vs Lixiana with wrong substance",
    aiInput: "Lyrica",
    activeSubstance: "pregabalin",
    emaName: "Lixiana",
    emaSubstance: "edoxaban tosilate monohydrate",
    shouldMatch: false,
  },
  {
    description: "Completely different medicine",
    aiInput: "Ben-u-ron 500mg",
    emaName: "Ozempic",
    emaSubstance: "semaglutide",
    shouldMatch: false,
  },
  {
    description: "Short name collision: Arava vs Araya",
    aiInput: "Arava",
    emaName: "Araxá",
    emaSubstance: "some substance",
    shouldMatch: false,
  },
  {
    description: "Partial name overlap: Nexium vs Nexpro",
    aiInput: "Nexium",
    emaName: "Nexpro",
    emaSubstance: "different substance",
    shouldMatch: false,
  },
  {
    description: "Brand-only: Eylea vs Eylau (fictional, testing threshold)",
    aiInput: "Eylea",
    emaName: "Eylau",
    emaSubstance: "different",
    shouldMatch: false,
  },

  // === EDGE CASES ===
  {
    description: "Substance match saves poor brand match",
    aiInput: "Ozempic Genérico",
    activeSubstance: "semaglutide",
    emaName: "Ozempic",
    emaSubstance: "semaglutide",
    shouldMatch: true,
  },
  {
    description: "Good substance but terrible brand should not match",
    aiInput: "Paracetamol",
    activeSubstance: "semaglutide",
    emaName: "Ozempic",
    emaSubstance: "semaglutide",
    shouldMatch: false,
  },
  {
    description: "Portuguese INN: ibuprofeno vs ibuprofen (substance only helps if brand matches)",
    aiInput: "Brufen",
    activeSubstance: "ibuprofeno",
    emaName: "Pedea",
    emaSubstance: "ibuprofen",
    shouldMatch: false,
  },
  {
    description: "Clopidogrel Zentiva exact",
    aiInput: "Clopidogrel Zentiva",
    activeSubstance: "clopidogrel",
    emaName: "Clopidogrel Zentiva (previously Clopidogrel Winthrop)",
    emaSubstance: "clopidogrel besilate",
    shouldMatch: true,
  },
  {
    description: "RoActemra with accent-free input",
    aiInput: "RoActemra 162mg",
    activeSubstance: "tocilizumab",
    emaName: "RoActemra",
    emaSubstance: "tocilizumab",
    shouldMatch: true,
  },
  {
    description: "Insulin product match",
    aiInput: "Toujeo 300U/ml",
    activeSubstance: "insulin glargine",
    emaName: "Toujeo (previously Optisulin)",
    emaSubstance: "insulin glargine",
    shouldMatch: true,
  },
  {
    description: "Dupixent match",
    aiInput: "Dupixent 300mg",
    activeSubstance: "dupilumab",
    emaName: "Dupixent",
    emaSubstance: "dupilumab",
    shouldMatch: true,
  },
  {
    description: "Entresto vs Enalapril (different cardiac drugs)",
    aiInput: "Entresto",
    activeSubstance: "sacubitril/valsartan",
    emaName: "Enalapril",
    emaSubstance: "enalapril maleate",
    shouldMatch: false,
  },
  {
    description: "Trulicity vs Tresiba (similar sounding, different drugs)",
    aiInput: "Trulicity",
    activeSubstance: "dulaglutide",
    emaName: "Tresiba",
    emaSubstance: "insulin degludec",
    shouldMatch: false,
  },
  {
    description: "Brand-only Humira should pass 0.85",
    aiInput: "Humira",
    emaName: "Humira",
    emaSubstance: "adalimumab",
    shouldMatch: true,
  },
  {
    description: "Brand-only: Herceptin",
    aiInput: "Herceptin",
    emaName: "Herceptin",
    emaSubstance: "trastuzumab",
    shouldMatch: true,
  },
  {
    description: "Brand-only: Jardiance",
    aiInput: "Jardiance 25mg",
    emaName: "Jardiance",
    emaSubstance: "empagliflozin",
    shouldMatch: true,
  },
  {
    description: "Forxiga vs Farxiga (US vs EU name)",
    aiInput: "Farxiga",
    emaName: "Forxiga",
    emaSubstance: "dapagliflozin propanediol monohydrate",
    shouldMatch: false,
  },
];

// --- Matching logic (mirrors emaFallback.ts) ---

function extractBrandName(input: string): string {
  const trimmed = input.trim();
  const tokens = trimmed.split(/\s+/);
  if (
    tokens.length > 1 &&
    !/^\d/.test(tokens[1]) &&
    !tokens[1].match(
      /^(mg|ml|g|mcg|comprimido|cápsula|solução|caneta|pó|suspensão)s?$/i
    )
  ) {
    const twoTokens = `${tokens[0]} ${tokens[1]}`;
    if (twoTokens.length <= 30) return twoTokens;
  }
  return tokens[0];
}

function wouldMatch(tc: TestCase): { matches: boolean; score: number; brandSim: number; substSim: number } {
  const brandName = extractBrandName(tc.aiInput);
  const brandSim = stringSimilarity(brandName, tc.emaName);

  if (tc.activeSubstance) {
    const substSim = stringSimilarity(tc.activeSubstance, tc.emaSubstance);
    const combined = brandSim * 0.7 + substSim * 0.3;
    const matches = brandSim >= BRAND_DUAL_THRESHOLD && substSim >= SUBSTANCE_DUAL_THRESHOLD;
    return { matches, score: combined, brandSim, substSim };
  } else {
    return { matches: brandSim >= BRAND_ONLY_THRESHOLD, score: brandSim, brandSim, substSim: 0 };
  }
}

// --- Run evaluation ---

let passed = 0;
let failed = 0;
const failures: string[] = [];

for (const tc of corpus) {
  const result = wouldMatch(tc);
  const correct = result.matches === tc.shouldMatch;

  if (correct) {
    passed++;
  } else {
    failed++;
    const direction = tc.shouldMatch ? "FALSE NEGATIVE" : "FALSE POSITIVE";
    failures.push(
      `  ${direction}: ${tc.description}\n` +
      `    Input: "${tc.aiInput}" substance="${tc.activeSubstance || "(none)}"\n` +
      `    EMA: "${tc.emaName}" substance="${tc.emaSubstance}"\n` +
      `    Brand sim: ${result.brandSim.toFixed(3)}, Substance sim: ${result.substSim.toFixed(3)}, Score: ${result.score.toFixed(3)}`
    );
  }
}

console.log(`\n=== EMA Matching Evaluation ===`);
console.log(`Total: ${corpus.length} | Passed: ${passed} | Failed: ${failed}`);

if (failures.length > 0) {
  console.log(`\nFAILURES:\n${failures.join("\n\n")}`);
  process.exit(1);
} else {
  console.log("\nAll test cases passed. Zero false positives.");
  process.exit(0);
}
