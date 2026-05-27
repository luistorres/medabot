#!/usr/bin/env npx tsx
/**
 * Unit tests for chunkPagesWithNumbers — the pure per-page chunking helper
 * exported from leafletProcessor.ts and used directly by processLeaflet at
 * runtime. No real PDF or network required.
 *
 * Usage:
 *   npx tsx scripts/test-page-mapping.ts
 */

import { chunkPagesWithNumbers } from "../app/core/leafletProcessor.js";

// ── Minimal test harness ──────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
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

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log("\n=== chunkPagesWithNumbers Unit Tests ===\n");

// Scenario 1: every chunk from a page carries that page's 1-based number.
// Use short pages so each page fits in one chunk (size < 800).
scenario("Scenario 1: three short pages → chunks carry correct page numbers", () => {
  const pageTexts = [
    "short page one text",
    "second page body",
    "third",
  ];
  const chunks = chunkPagesWithNumbers(pageTexts);

  // Every chunk from page 1 text must have page === 1, etc.
  const p1 = chunks.filter((c) => c.text === "short page one text");
  const p2 = chunks.filter((c) => c.text === "second page body");
  const p3 = chunks.filter((c) => c.text === "third");

  assert(p1.length >= 1, "Expected at least one chunk for page 1");
  assert(p2.length >= 1, "Expected at least one chunk for page 2");
  assert(p3.length >= 1, "Expected at least one chunk for page 3");
  assert(p1.every((c) => c.page === 1), "All page-1 chunks should have page=1");
  assert(p2.every((c) => c.page === 2), "All page-2 chunks should have page=2");
  assert(p3.every((c) => c.page === 3), "All page-3 chunks should have page=3");
});

// Scenario 2: no chunk ever carries a page number from a different page's text.
// Use distinctive markers to identify page origin.
scenario("Scenario 2: no cross-page contamination (page numbers are exact)", () => {
  const pageTexts = [
    "PAGE_ONE_MARKER " + "a".repeat(200),
    "PAGE_TWO_MARKER " + "b".repeat(200),
    "PAGE_THREE_MARKER " + "c".repeat(200),
  ];
  const chunks = chunkPagesWithNumbers(pageTexts);

  for (const chunk of chunks) {
    if (chunk.text.includes("PAGE_ONE_MARKER")) {
      assert(chunk.page === 1, `Chunk with PAGE_ONE_MARKER has page=${chunk.page}, expected 1`);
    }
    if (chunk.text.includes("PAGE_TWO_MARKER")) {
      assert(chunk.page === 2, `Chunk with PAGE_TWO_MARKER has page=${chunk.page}, expected 2`);
    }
    if (chunk.text.includes("PAGE_THREE_MARKER")) {
      assert(chunk.page === 3, `Chunk with PAGE_THREE_MARKER has page=${chunk.page}, expected 3`);
    }
    // A chunk must never contain markers from two different pages
    const markers = [
      chunk.text.includes("PAGE_ONE_MARKER"),
      chunk.text.includes("PAGE_TWO_MARKER"),
      chunk.text.includes("PAGE_THREE_MARKER"),
    ].filter(Boolean).length;
    assert(markers <= 1, `Chunk spans multiple page markers — cross-page bleed detected`);
  }
});

// Scenario 3: single-page document — all chunks get page 1.
scenario("Scenario 3: single-page document → all chunks have page=1", () => {
  const pageTexts = ["Hello World. This is a single-page leaflet. " + "x".repeat(100)];
  const chunks = chunkPagesWithNumbers(pageTexts);

  assert(chunks.length >= 1, "Expected at least one chunk");
  assert(chunks.every((c) => c.page === 1), "All chunks should have page=1");
});

// Scenario 4: empty input → no chunks produced.
scenario("Scenario 4: empty pageTexts → zero chunks", () => {
  const chunks = chunkPagesWithNumbers([]);
  assert(chunks.length === 0, `Expected 0 chunks, got ${chunks.length}`);
});

// Scenario 5: pages with only whitespace produce no chunks (trim drops them).
scenario("Scenario 5: whitespace-only pages produce no chunks", () => {
  const pageTexts = ["   \n\n  ", "real content here", "   "];
  const chunks = chunkPagesWithNumbers(pageTexts);

  // Only page 2 has real content
  assert(chunks.every((c) => c.page === 2), "Only page-2 chunks should exist");
});

// Scenario 6: long page that exceeds chunkSize (800) produces multiple chunks,
// all with the same page number.
scenario("Scenario 6: long page → multiple chunks, all same page number", () => {
  const longText = ("Lorem ipsum dolor sit amet. ").repeat(80); // ~2 240 chars > 800
  const pageTexts = ["intro", longText, "outro"];
  const chunks = chunkPagesWithNumbers(pageTexts);

  const page2Chunks = chunks.filter((c) => c.page === 2);
  assert(page2Chunks.length > 1, `Long page should yield >1 chunk, got ${page2Chunks.length}`);
  assert(page2Chunks.every((c) => c.page === 2), "All long-page chunks must have page=2");
});

// Scenario 7: chunk page order in output follows page order.
scenario("Scenario 7: output chunks appear in ascending page order", () => {
  const pageTexts = ["alpha content", "beta content", "gamma content"];
  const chunks = chunkPagesWithNumbers(pageTexts);

  for (let i = 1; i < chunks.length; i++) {
    assert(
      chunks[i].page >= chunks[i - 1].page,
      `Chunk at index ${i} has page=${chunks[i].page} before previous page=${chunks[i - 1].page}`,
    );
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log("Failed:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log("\nPASS");
process.exit(0);
