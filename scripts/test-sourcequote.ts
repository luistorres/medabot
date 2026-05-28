#!/usr/bin/env npx tsx
/**
 * Unit tests for sourceQuote validation. Pure functions — no PDF, model, or
 * network required.
 *
 * Usage:
 *   npx tsx scripts/test-sourcequote.ts
 */

import { validateSourceQuote } from "../app/core/sourceQuote.js";

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

scenario("accepts a verbatim sentence inside one chunk", () => {
  const chunks = [
    {
      page: 3,
      text: "Este medicamento deve ser tomado com água, de preferência após uma refeição.",
    },
  ];

  assertEqual(
    validateSourceQuote(
      "deve ser tomado com água, de preferência após uma refeição",
      chunks,
    ),
    {
      quote: "deve ser tomado com água, de preferência após uma refeição",
      page: 3,
    },
    "verbatim quote",
  );
});

scenario("matches accent and case differences", () => {
  const chunks = [
    {
      page: 1,
      text: "A administração é recomendada após as refeições principais.",
    },
  ];

  assertEqual(
    validateSourceQuote(
      "ADMINISTRACAO E RECOMENDADA APOS AS REFEICOES PRINCIPAIS",
      chunks,
    ),
    {
      quote: "ADMINISTRACAO E RECOMENDADA APOS AS REFEICOES PRINCIPAIS",
      page: 1,
    },
    "accent/case-insensitive",
  );
});

scenario("cleans leading page prefix and highlight markers", () => {
  const chunks = [
    {
      page: 2,
      text: "Não tome este medicamento se tem alergia ao paracetamol.",
    },
  ];

  assertEqual(
    validateSourceQuote(
      " ==[Página 2] Não tome este medicamento se tem alergia ao paracetamol.== ",
      chunks,
    ),
    {
      quote: "Não tome este medicamento se tem alergia ao paracetamol.",
      page: 2,
    },
    "prefix and markers",
  );
});

scenario("rejects quotes with fewer than three normalized words", () => {
  assertEqual(
    validateSourceQuote("muito importante", [
      { page: 1, text: "Este aviso é muito importante para todos." },
    ]),
    null,
    "too few words",
  );
});

scenario("rejects quotes longer than 400 characters", () => {
  const longQuote = `${"palavra ".repeat(51)}fim`;
  assertEqual(
    validateSourceQuote(longQuote, [{ page: 1, text: longQuote }]),
    null,
    "too long",
  );
});

scenario("rejects quotes not present in any chunk", () => {
  assertEqual(
    validateSourceQuote("Este texto não aparece em lado nenhum.", [
      { page: 1, text: "O folheto fala apenas de dosagem." },
    ]),
    null,
    "not present",
  );
});

scenario("rejects quotes that span two chunks", () => {
  const quote = "primeira parte segunda parte";
  assertEqual(
    validateSourceQuote(quote, [
      { page: 1, text: "A frase começa com primeira parte" },
      { page: 1, text: "segunda parte e termina aqui" },
    ]),
    null,
    "cross-chunk span",
  );
});

scenario("rejects null input", () => {
  assertEqual(
    validateSourceQuote(null, [
      { page: 1, text: "Uma frase suficientemente longa para validar." },
    ]),
    null,
    "null input",
  );
});

scenario("rejects ambiguous matches across different pages", () => {
  const text = "Conservar fora da vista e do alcance das crianças.";
  assertEqual(
    validateSourceQuote(text, [
      { page: 1, text },
      { page: 4, text },
    ]),
    null,
    "different pages",
  );
});

scenario("accepts duplicate identical chunks on the same page", () => {
  const text = "Conservar fora da vista e do alcance das crianças.";
  assertEqual(
    validateSourceQuote(text, [
      { page: 5, text },
      { page: 5, text },
    ]),
    { quote: text, page: 5 },
    "same-page duplicate",
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
