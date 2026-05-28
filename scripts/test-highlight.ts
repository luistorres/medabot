#!/usr/bin/env npx tsx
/**
 * Unit tests for the key-claim highlight helpers exported from
 * app/core/highlight.ts (stripHighlightLeak, findEnclosingBold,
 * highlightKeyClaim). Pure functions — no PDF, model, or network required.
 *
 * Usage:
 *   npx tsx scripts/test-highlight.ts
 */

import {
  stripHighlightLeak,
  findEnclosingBold,
  highlightKeyClaim,
} from "../app/core/highlight.js";

// ── Minimal test harness ──────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assertEqual(got: unknown, expect: unknown, msg: string) {
  if (got !== expect) {
    throw new Error(
      `${msg}\n      got:    ${JSON.stringify(got)}\n      expect: ${JSON.stringify(expect)}`,
    );
  }
}

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

// ── highlightKeyClaim ───────────────────────────────────────────────────────
console.log("\n=== highlightKeyClaim Unit Tests ===\n");

scenario("inserts a single highlight for a plain verbatim phrase", () => {
  assertEqual(
    highlightKeyClaim(
      "O paracetamol pode ser utilizado durante a gravidez, mas com precaução.",
      "pode ser utilizado durante a gravidez",
    ),
    "O paracetamol ==pode ser utilizado durante a gravidez==, mas com precaução.",
    "plain insert",
  );
});

scenario("regression: pulls phrase out of an enclosing **bold** span", () => {
  // The original bug: phrase was bolded, so a naive ==..== insert nested inside
  // **..** and rendered raw. It must come out as **pre** ==phrase==.
  assertEqual(
    highlightKeyClaim(
      "De acordo com a página 2, **após as refeições pode atrasar o início de ação**.",
      "pode atrasar o início de ação",
    ),
    "De acordo com a página 2, **após as refeições** ==pode atrasar o início de ação==.",
    "bold-overlap unwrap",
  );
});

scenario("phrase equal to the whole bold span replaces the bold", () => {
  assertEqual(
    highlightKeyClaim("Resposta: **tome com água**.", "tome com água"),
    "Resposta: ==tome com água==.",
    "phrase == whole bold",
  );
});

scenario("phrase in the middle of a bold span keeps both sides bold", () => {
  assertEqual(
    highlightKeyClaim(
      "**antes de tomar este medicamento consulte**",
      "tomar este medicamento",
    ),
    "**antes de** ==tomar este medicamento== **consulte**",
    "phrase mid-bold",
  );
});

scenario("strips a leaked meta line and still highlights the answer", () => {
  // Mirrors the real screenshot: a clean answer plus a leaked machinery line.
  assertEqual(
    highlightKeyClaim(
      "De acordo com a página 2, **após as refeições pode atrasar o início de ação**.\n\nA afirmação-chave é: ==pode atrasar o início de ação==",
      "pode atrasar o início de ação",
    ),
    "De acordo com a página 2, **após as refeições** ==pode atrasar o início de ação==.",
    "leaked meta line stripped",
  );
});

scenario("no highlight when phrase is not a verbatim substring", () => {
  assertEqual(
    highlightKeyClaim("Resposta simples sem nada.", "inexistente"),
    "Resposta simples sem nada.",
    "non-substring → no highlight",
  );
});

scenario("no highlight when the phrase is ambiguous (appears twice)", () => {
  assertEqual(highlightKeyClaim("dose dose", "dose"), "dose dose", "ambiguous");
});

scenario("null phrase yields no highlight (overview answers)", () => {
  assertEqual(
    highlightKeyClaim("Este medicamento serve para a dor.", null),
    "Este medicamento serve para a dor.",
    "null phrase",
  );
});

scenario("rejects sentence-length phrases (> 14 words)", () => {
  const longPhrase = "um dois três quatro cinco seis sete oito nove dez onze doze treze catorze quinze";
  const answer = `Início ${longPhrase} fim.`;
  assertEqual(highlightKeyClaim(answer, longPhrase), answer, "too many words");
});

scenario("rejects overlong phrases (> 90 chars)", () => {
  const longPhrase = "a".repeat(91);
  const answer = `x ${longPhrase} y`;
  assertEqual(highlightKeyClaim(answer, longPhrase), answer, "too long");
});

scenario("trims surrounding whitespace and stray == in the phrase", () => {
  assertEqual(
    highlightKeyClaim("tome com água após a refeição.", "  ==com água== "),
    "tome ==com água== após a refeição.",
    "phrase normalization",
  );
});

// ── stripHighlightLeak ──────────────────────────────────────────────────────
console.log("\n=== stripHighlightLeak Unit Tests ===\n");

scenario("removes a standalone 'A afirmação-chave é:' line", () => {
  assertEqual(
    stripHighlightLeak("Resposta normal.\nA afirmação-chave é: algo importante"),
    "Resposta normal.",
    "afirmação-chave line",
  );
});

scenario("removes an English 'Key claim:' line", () => {
  assertEqual(
    stripHighlightLeak("The answer.\nKey claim: something"),
    "The answer.",
    "key claim line",
  );
});

scenario("unwraps stray ==markers== left in the text", () => {
  assertEqual(
    stripHighlightLeak("tome ==com água== sempre"),
    "tome com água sempre",
    "stray markers unwrapped",
  );
});

scenario("keeps a normal answer untouched", () => {
  const normal = "De acordo com a página 3, tome um comprimido por dia.";
  assertEqual(stripHighlightLeak(normal), normal, "untouched");
});

// ── findEnclosingBold ───────────────────────────────────────────────────────
console.log("\n=== findEnclosingBold Unit Tests ===\n");

scenario("returns the span when range is inside bold", () => {
  const text = "a **bold here** b";
  const start = text.indexOf("here");
  const span = findEnclosingBold(text, start, start + 4);
  assert(span !== null, "expected an enclosing bold span");
  assertEqual(text.slice(span!.innerStart, span!.innerEnd), "bold here", "inner content");
});

scenario("returns null when range is outside any bold", () => {
  const text = "no bold **x** here";
  const start = text.indexOf("here");
  assertEqual(findEnclosingBold(text, start, start + 4), null, "no enclosing bold");
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
