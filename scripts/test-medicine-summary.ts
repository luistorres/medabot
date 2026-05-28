#!/usr/bin/env npx tsx
/**
 * Unit tests for medicine summary post-processing. Pure functions only; no PDF,
 * model, or network required.
 *
 * Usage:
 *   npx tsx scripts/test-medicine-summary.ts
 */

import {
  sanitizeMedicineSummary,
  groundKeyWarnings,
  dedupeChunks,
} from "../app/server/extractMedicineSummary.js";
import type { ChunkWithEmbedding } from "../app/core/leafletProcessor.js";

// Minimal chunk factory — dedupeChunks/groundKeyWarnings only read page + text.
const chunk = (page: number, text: string): ChunkWithEmbedding => ({
  page,
  text,
  embedding: [],
});

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

// ── groundKeyWarnings ───────────────────────────────────────────────────────
const leaflet = [
  chunk(2, "Não tome mais de 4 g de paracetamol por dia em adultos."),
  chunk(3, "Durante o tratamento deve evitar o consumo de álcool."),
];

scenario("keeps a warning whose anchor is verbatim in a chunk", () => {
  assertEqual(
    groundKeyWarnings(
      [{ text: "Dose máxima: 4 g por dia", anchor: "mais de 4 g de paracetamol" }],
      leaflet,
    ),
    ["Dose máxima: 4 g por dia"],
    "grounded warning kept",
  );
});

scenario("matches the anchor accent/case-insensitively", () => {
  assertEqual(
    groundKeyWarnings(
      [{ text: "Evitar álcool", anchor: "EVITAR O CONSUMO DE ALCOOL" }],
      leaflet,
    ),
    ["Evitar álcool"],
    "anchor normalized match",
  );
});

scenario("drops a warning whose anchor is not in any chunk (hallucination)", () => {
  assertEqual(
    groundKeyWarnings(
      [{ text: "Dose máxima: 8 g por dia", anchor: "ate 8 gramas por dia" }],
      leaflet,
    ),
    [],
    "ungrounded warning dropped",
  );
});

scenario("drops negative / not-found warning text", () => {
  assertEqual(
    groundKeyWarnings(
      [
        { text: "NENHUM", anchor: "mais de 4 g de paracetamol" },
        { text: "Não consta no folheto", anchor: "evitar o consumo de álcool" },
      ],
      leaflet,
    ),
    [],
    "negative text dropped",
  );
});

scenario("drops a warning whose dose number is absent from the anchor", () => {
  // Anchor is real (4 g) but text overstates the dose (8 g) — must be dropped.
  assertEqual(
    groundKeyWarnings(
      [{ text: "Dose máxima: 8 g por dia", anchor: "mais de 4 g de paracetamol" }],
      leaflet,
    ),
    [],
    "overstated dose dropped",
  );
});

scenario("keeps a warning whose dose number matches the anchor", () => {
  assertEqual(
    groundKeyWarnings(
      [{ text: "Dose máxima: 4 g por dia", anchor: "mais de 4 g de paracetamol" }],
      leaflet,
    ),
    ["Dose máxima: 4 g por dia"],
    "matching dose kept",
  );
});

scenario("keeps a number-free warning grounded by its anchor", () => {
  assertEqual(
    groundKeyWarnings(
      [{ text: "Evitar álcool durante o tratamento", anchor: "evitar o consumo de álcool" }],
      leaflet,
    ),
    ["Evitar álcool durante o tratamento"],
    "non-numeric warning kept",
  );
});

scenario("drops broadened negatives (sem informação / não foram encontradas)", () => {
  assertEqual(
    groundKeyWarnings(
      [
        { text: "Sem informação sobre interações", anchor: "evitar o consumo de álcool" },
        { text: "Não foram encontradas interações", anchor: "evitar o consumo de álcool" },
      ],
      leaflet,
    ),
    [],
    "broadened negatives dropped",
  );
});

scenario("drops a too-short (unverifiable) anchor", () => {
  assertEqual(
    groundKeyWarnings([{ text: "Cuidado", anchor: "4 g" }], leaflet),
    [],
    "short anchor dropped",
  );
});

scenario("caps grounded warnings at two", () => {
  const c = [
    chunk(1, "aviso um presente no folheto"),
    chunk(1, "aviso dois presente no folheto"),
    chunk(1, "aviso tres presente no folheto"),
  ];
  assertEqual(
    groundKeyWarnings(
      [
        { text: "Um", anchor: "aviso um presente" },
        { text: "Dois", anchor: "aviso dois presente" },
        { text: "Tres", anchor: "aviso tres presente" },
      ],
      c,
    ),
    ["Um", "Dois"],
    "capped at two",
  );
});

// ── dedupeChunks ────────────────────────────────────────────────────────────
scenario("collapses identical page+text chunks, preserves order", () => {
  const result = dedupeChunks([
    chunk(1, "alpha"),
    chunk(2, "beta"),
    chunk(1, "alpha"),
    chunk(2, "gamma"),
  ]);
  assertEqual(
    result.map((c) => `${c.page}:${c.text}`),
    ["1:alpha", "2:beta", "2:gamma"],
    "deduped, order-stable",
  );
});

scenario("keeps same text on different pages", () => {
  const result = dedupeChunks([chunk(1, "same"), chunk(4, "same")]);
  assertEqual(
    result.map((c) => `${c.page}:${c.text}`),
    ["1:same", "4:same"],
    "distinct pages preserved",
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
