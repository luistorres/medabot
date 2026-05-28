#!/usr/bin/env npx tsx
/**
 * Unit tests for sourceQuote anchor resolution. Pure functions — no PDF, model,
 * or network required.
 *
 * The model returns a short ANCHOR (first words of the grounding sentence);
 * resolveSourceQuote expands it to the full sentence from the retrieved chunk.
 *
 * Usage:
 *   npx tsx scripts/test-sourcequote.ts
 */

import { resolveSourceQuote } from "../app/core/sourceQuote.js";

// ── Minimal test harness ──────────────────────────────────────────────────────
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

console.log("\n=== sourceQuote Unit Tests ===\n");

scenario("expands a short anchor to its full sentence", () => {
  const chunks = [
    {
      page: 3,
      text: "Este medicamento deve ser tomado com água. Outra informação irrelevante.",
    },
  ];
  assertEqual(
    resolveSourceQuote("Este medicamento deve ser", chunks),
    { quote: "Este medicamento deve ser tomado com água.", page: 3 },
    "anchor → sentence",
  );
});

scenario("matches anchor with accent and case differences", () => {
  const chunks = [
    {
      page: 1,
      text: "A administração é recomendada após as refeições principais.",
    },
  ];
  assertEqual(
    resolveSourceQuote("ADMINISTRACAO E RECOMENDADA", chunks),
    {
      quote: "A administração é recomendada após as refeições principais.",
      page: 1,
    },
    "accent/case-insensitive",
  );
});

scenario("cleans page prefix and highlight markers from the anchor", () => {
  const chunks = [
    {
      page: 2,
      text: "Não tome este medicamento se tem alergia ao paracetamol.",
    },
  ];
  assertEqual(
    resolveSourceQuote(" ==[Página 2] Não tome este medicamento== ", chunks),
    {
      quote: "Não tome este medicamento se tem alergia ao paracetamol.",
      page: 2,
    },
    "prefix and markers",
  );
});

scenario("rejects an anchor with fewer than three words", () => {
  assertEqual(
    resolveSourceQuote("muito importante", [
      { page: 1, text: "Este aviso é muito importante para todos." },
    ]),
    null,
    "too few words",
  );
});

scenario("rejects an anchor not present in any chunk", () => {
  assertEqual(
    resolveSourceQuote("isto nao aparece aqui", [
      { page: 1, text: "O folheto fala apenas de dosagem e conservação." },
    ]),
    null,
    "not present",
  );
});

scenario("rejects null input", () => {
  assertEqual(
    resolveSourceQuote(null, [
      { page: 1, text: "Uma frase suficientemente longa para validar." },
    ]),
    null,
    "null input",
  );
});

scenario("rejects an anchor that resolves on different pages", () => {
  const text = "Conservar fora da vista e do alcance das crianças.";
  assertEqual(
    resolveSourceQuote("Conservar fora da vista", [
      { page: 1, text },
      { page: 4, text },
    ]),
    null,
    "different pages",
  );
});

scenario("rejects an anchor that hits different sentences on the same page", () => {
  assertEqual(
    resolveSourceQuote("Tome o comprimido", [
      {
        page: 2,
        text: "Tome o comprimido de manhã. Tome o comprimido à noite também.",
      },
    ]),
    null,
    "ambiguous sentences",
  );
});

scenario("accepts a same-page anchor present in two overlapping chunks", () => {
  // Realistic overlap: chunks overlap by 150 chars, so the grounding sentence
  // appears whole in both adjacent same-page chunks (with different surrounding
  // sentences). The matched sentence is identical, so accept.
  const sentence = "Tomar um comprimido por dia durante cinco dias.";
  assertEqual(
    resolveSourceQuote("Tomar um comprimido por dia", [
      { page: 7, text: `Indicações gerais sobre o uso. ${sentence} Mais texto.` },
      { page: 7, text: `${sentence} Suspender depois do tratamento.` },
    ]),
    { quote: sentence, page: 7 },
    "same-page overlap accepted",
  );
});

scenario("rejects when the resolved sentence exceeds 400 characters", () => {
  const longSentence = `${"palavra ".repeat(60)}fim`; // ~487 chars, no boundary
  assertEqual(
    resolveSourceQuote("palavra palavra palavra", [
      { page: 1, text: longSentence },
    ]),
    null,
    "resolved too long",
  );
});

scenario("rejects when the resolved sentence is under 20 characters", () => {
  assertEqual(
    resolveSourceQuote("Tome a água", [{ page: 1, text: "Tome a água." }]),
    null,
    "resolved too short",
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
