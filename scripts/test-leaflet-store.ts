#!/usr/bin/env npx tsx
/** Unit tests for leafletStore pure helpers. No PDF/model/network.
 * Usage: npx tsx scripts/test-leaflet-store.ts */
import {
  estimateTokens,
  assembleLeafletContext,
  validateCitedPages,
  pageParagraphs,
} from "../app/core/leafletStore.js";

let passed = 0, failed = 0;
const failures: string[] = [];
function assertEqual(got: unknown, exp: unknown, msg: string) {
  if (JSON.stringify(got) !== JSON.stringify(exp))
    throw new Error(`${msg}\n  got:    ${JSON.stringify(got)}\n  expect: ${JSON.stringify(exp)}`);
}
function assert(cond: boolean, msg: string) { if (!cond) throw new Error(msg); }
function scenario(name: string, fn: () => void) {
  process.stdout.write(`  ${name} ... `);
  try { fn(); console.log("PASS"); passed++; }
  catch (e: any) { console.log("FAIL"); console.log(`    ${e.message}`); failed++; failures.push(name); }
}

console.log("\n=== leafletStore Unit Tests ===\n");

scenario("estimateTokens ≈ chars/3.5, rounded up", () => {
  assertEqual(estimateTokens("abcdefg"), 2, "7 chars -> 2 tokens");
  assertEqual(estimateTokens(""), 0, "empty -> 0");
});

scenario("assembleLeafletContext tags pages and joins with separators", () => {
  const ctx = assembleLeafletContext([
    { page: 1, text: "primeira" },
    { page: 2, text: "segunda" },
  ]);
  assertEqual(ctx, "[Página 1]\nprimeira\n\n---\n\n[Página 2]\nsegunda", "tagged + joined");
});

scenario("assembleLeafletContext skips blank pages but keeps real numbers", () => {
  const ctx = assembleLeafletContext([
    { page: 1, text: "um" },
    { page: 2, text: "" },
    { page: 3, text: "tres" },
  ]);
  assertEqual(ctx, "[Página 1]\num\n\n---\n\n[Página 3]\ntres", "page 2 skipped, page 3 stays page 3");
});

scenario("assembleLeafletContext truncates when over budget (keeps ≥1 page)", () => {
  const big = "x".repeat(400);
  const pages = Array.from({ length: 5 }, (_, i) => ({ page: i + 1, text: big }));
  const ctx = assembleLeafletContext(pages, 200);
  assert(ctx.includes("[Página 1]"), "page 1 kept");
  assert(!ctx.includes("[Página 5]"), "page 5 truncated");
});

scenario("validateCitedPages clamps, dedupes, sorts, drops out-of-range", () => {
  assertEqual(validateCitedPages([3, 1, 1, 9, 0, -2, 2.5], 5), [1, 3], "valid set");
});

scenario("validateCitedPages always includes the ensure page when valid", () => {
  assertEqual(validateCitedPages([2], 5, 4), [2, 4], "ensure added");
  assertEqual(validateCitedPages([2], 5, 99), [2], "invalid ensure ignored");
});

scenario("pageParagraphs splits and drops <3-word fragments", () => {
  assertEqual(
    pageParagraphs("uma duas tres\nok\n\nquatro cinco seis sete"),
    ["uma duas tres", "quatro cinco seis sete"],
    "≥3-word paragraphs only",
  );
});

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
console.log("\nPASS"); process.exit(0);
