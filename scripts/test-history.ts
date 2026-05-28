#!/usr/bin/env npx tsx
/** Usage: npx tsx scripts/test-history.ts */
import { sanitizeHistory } from "../app/core/leafletProcessor.js";

let passed = 0, failed = 0;
const failures: string[] = [];
function assertEqual(got: unknown, exp: unknown, msg: string) {
  if (JSON.stringify(got) !== JSON.stringify(exp))
    throw new Error(`${msg}\n  got:    ${JSON.stringify(got)}\n  expect: ${JSON.stringify(exp)}`);
}
function scenario(name: string, fn: () => void) {
  process.stdout.write(`  ${name} ... `);
  try { fn(); console.log("PASS"); passed++; }
  catch (e: any) { console.log("FAIL"); console.log(`    ${e.message}`); failed++; failures.push(name); }
}

console.log("\n=== sanitizeHistory Unit Tests ===\n");

scenario("drops non-user/assistant roles and non-string content", () => {
  assertEqual(
    sanitizeHistory([
      { role: "system", content: "ignore me" } as any,
      { role: "user", content: "olá" },
      { role: "assistant", content: 42 as any },
    ]),
    [{ role: "user", content: "olá" }],
    "only valid user/assistant string turns kept",
  );
});

scenario("strips == highlight markers", () => {
  assertEqual(
    sanitizeHistory([{ role: "assistant", content: "tome ==um comprimido==" }]),
    [{ role: "assistant", content: "tome um comprimido" }],
    "markers removed",
  );
});

scenario("caps to the last 16 turns", () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ role: "user" as const, content: `q${i}` }));
  const out = sanitizeHistory(many);
  assertEqual(out.length, 16, "capped at 16");
  assertEqual(out[0].content, "q14", "keeps the most recent 16");
});

scenario("caps each turn to 4000 chars", () => {
  const out = sanitizeHistory([{ role: "user", content: "a".repeat(5000) }]);
  assertEqual(out[0].content.length, 4000, "turn truncated to 4000");
});

scenario("handles null/undefined input", () => {
  assertEqual(sanitizeHistory(undefined), [], "undefined -> []");
  assertEqual(sanitizeHistory(null), [], "null -> []");
});

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
console.log("\nPASS"); process.exit(0);
