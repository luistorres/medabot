#!/usr/bin/env npx tsx
/**
 * Unit tests for medicine summary post-processing. Pure functions only; no PDF,
 * model, or network required.
 *
 * Usage:
 *   npx tsx scripts/test-medicine-summary.ts
 */

import { sanitizeMedicineSummary } from "../app/server/extractMedicineSummary.js";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assertEqual(got: unknown, expect: unknown, msg: string) {
  if (JSON.stringify(got) !== JSON.stringify(expect)) {
    throw new Error(
      `${msg}\n      got:    ${JSON.stringify(got)}\n      expect: ${JSON.stringify(expect)}`,
    );
  }
}

function scenario(name: string, fn: () => void) {
  process.stdout.write(`  ${name} ... `);
  try {
    fn();
    console.log("PASS");
    passed++;
  } catch (err: any) {
    console.log("FAIL");
    console.log(`    ${err.message}`);
    failed++;
    failures.push(name);
  }
}

console.log("\n=== medicineSummary Unit Tests ===\n");

scenario("trims fields, drops empty array entries, and caps warnings at two", () => {
  assertEqual(
    sanitizeMedicineSummary({
      category: "  Analgésico e antipirético  ",
      indications: [" dor ", "", " febre "],
      keyWarnings: ["  máximo 4 g por dia ", " ", " evitar álcool ", " terceiro "],
    }),
    {
      category: "Analgésico e antipirético",
      indications: ["dor", "febre"],
      keyWarnings: ["máximo 4 g por dia", "evitar álcool"],
    },
    "sanitized summary",
  );
});

scenario("uses the graceful category fallback after trimming", () => {
  assertEqual(
    sanitizeMedicineSummary({
      category: "   ",
      indications: [],
      keyWarnings: [],
    }),
    {
      category: "Medicamento",
      indications: [],
      keyWarnings: [],
    },
    "fallback category",
  );
});

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log("Failed:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log("\nPASS");
process.exit(0);
