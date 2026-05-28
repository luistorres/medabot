#!/usr/bin/env npx tsx
/**
 * Unit tests for sourceQuote anchor resolution. Pure functions — no PDF, model,
 * or network required.
 *
 * The model returns two short anchors (quoteStart = first words, quoteEnd = last
 * words of the grounding span); resolveSourceQuote slices the raw span between
 * them from the retrieved chunk.
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

scenario("slices the raw span between start and end anchors", () => {
  const chunks = [
    {
      page: 3,
      text: "Este medicamento deve ser tomado com água após a refeição e nada mais.",
    },
  ];
  assertEqual(
    resolveSourceQuote("Este medicamento deve", "água após a refeição", chunks),
    {
      quote: "Este medicamento deve ser tomado com água após a refeição",
      page: 3,
    },
    "span between anchors",
  );
});

scenario("matches anchors with accent and case differences", () => {
  const chunks = [
    {
      page: 1,
      text: "A administração é recomendada após as refeições principais do dia.",
    },
  ];
  assertEqual(
    resolveSourceQuote(
      "ADMINISTRACAO E RECOMENDADA",
      "AS REFEICOES PRINCIPAIS",
      chunks,
    ),
    {
      quote: "administração é recomendada após as refeições principais",
      page: 1,
    },
    "accent/case-insensitive",
  );
});

scenario("cleans page prefix and markers from the anchors", () => {
  const chunks = [
    { page: 2, text: "Não tome este medicamento se tem alergia ao paracetamol." },
  ];
  assertEqual(
    resolveSourceQuote(
      " ==[Página 2] Não tome este== ",
      "alergia ao paracetamol",
      chunks,
    ),
    {
      quote: "Não tome este medicamento se tem alergia ao paracetamol.",
      page: 2,
    },
    "prefix and markers",
  );
});

scenario("rejects when an anchor has fewer than three words", () => {
  const chunks = [{ page: 1, text: "Este aviso é muito importante para todos." }];
  assertEqual(
    resolveSourceQuote("muito importante", "para todos hoje", chunks),
    null,
    "start too short",
  );
});

scenario("rejects when the start anchor is not present", () => {
  assertEqual(
    resolveSourceQuote("isto nao aparece", "ao alcance das", [
      { page: 1, text: "Conservar ao alcance das crianças sempre." },
    ]),
    null,
    "start not present",
  );
});

scenario("rejects when the end anchor is not present after the start", () => {
  assertEqual(
    resolveSourceQuote("Conservar ao alcance", "texto inexistente aqui", [
      { page: 1, text: "Conservar ao alcance das crianças sempre." },
    ]),
    null,
    "end not present",
  );
});

scenario("rejects when the end anchor precedes the start anchor", () => {
  assertEqual(
    resolveSourceQuote("Introducao inicial agora", "Conclusao final aqui", [
      { page: 1, text: "Conclusao final aqui. Introducao inicial agora mesmo." },
    ]),
    null,
    "end before start",
  );
});

scenario("rejects null inputs", () => {
  assertEqual(
    resolveSourceQuote(null, null, [
      { page: 1, text: "Uma frase suficientemente longa para validar." },
    ]),
    null,
    "null input",
  );
});

scenario("rejects anchors that resolve on different pages", () => {
  const text = "Conservar fora da vista e do alcance das crianças.";
  assertEqual(
    resolveSourceQuote("Conservar fora da", "alcance das crianças", [
      { page: 1, text },
      { page: 4, text },
    ]),
    null,
    "different pages",
  );
});

scenario("accepts a same-page span present in two overlapping chunks", () => {
  // Realistic overlap: the grounding span sits in the 150-char overlap and so
  // appears (identically) in both adjacent same-page chunks.
  const span = "Tomar um comprimido por dia durante cinco dias";
  assertEqual(
    resolveSourceQuote("Tomar um comprimido", "durante cinco dias", [
      { page: 7, text: `Indicações gerais. ${span} e nada mais.` },
      { page: 7, text: `Algo antes. ${span} e depois parar.` },
    ]),
    { quote: span, page: 7 },
    "same-page overlap accepted",
  );
});

scenario("rejects when the resolved span exceeds 400 characters", () => {
  const filler = "palavra ".repeat(60); // ~480 chars between anchors
  const text = `comeco do trecho ${filler} fim do trecho aqui`;
  assertEqual(
    resolveSourceQuote("comeco do trecho", "fim do trecho", [{ page: 1, text }]),
    null,
    "resolved too long",
  );
});

scenario("rejects when the resolved span is under 20 characters", () => {
  assertEqual(
    resolveSourceQuote("abc def ghi", "def ghi jkl", [
      { page: 1, text: "abc def ghi jkl." },
    ]),
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
