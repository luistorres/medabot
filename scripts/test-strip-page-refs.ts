#!/usr/bin/env npx tsx
/** Usage: npx tsx scripts/test-strip-page-refs.ts */
import { stripInlinePageRefs } from "../app/utils/stripInlinePageRefs.js";

let passed = 0, failed = 0;
const failures: string[] = [];
function eq(got: string, exp: string, msg: string) {
  if (got !== exp) throw new Error(`${msg}\n  got:    "${got}"\n  expect: "${exp}"`);
}
function scenario(name: string, fn: () => void) {
  process.stdout.write(`  ${name} ... `);
  try { fn(); console.log("PASS"); passed++; }
  catch (e: any) { console.log("FAIL"); console.log(`    ${e.message}`); failed++; failures.push(name); }
}

console.log("\n=== stripInlinePageRefs Unit Tests ===\n");

scenario("removes parenthetical page ref", () => {
  eq(stripInlinePageRefs("Tome um comprimido (página 3)."), "Tome um comprimido.", "paren");
});
scenario("removes plural parenthetical range", () => {
  eq(stripInlinePageRefs("Há avisos (páginas 3 e 4)."), "Há avisos.", "plural paren");
});
scenario("removes sentence-leading ref and re-capitalizes", () => {
  eq(
    stripInlinePageRefs("De acordo com a página 3, não deve exceder 6 comprimidos."),
    "Não deve exceder 6 comprimidos.",
    "leading",
  );
});
scenario("removes 'consulte a página' leading form", () => {
  eq(stripInlinePageRefs("Consulte a página 3 para detalhes."), "Para detalhes.", "consulte");
});
scenario("removes mid-sentence comma-wrapped ref cleanly", () => {
  eq(stripInlinePageRefs("A dose, na página 3, é de 1 g."), "A dose é de 1 g.", "comma-wrapped");
});
scenario("removes trailing inline ref", () => {
  eq(stripInlinePageRefs("Evite álcool na página 3."), "Evite álcool.", "trailing");
});
scenario("leaves clean prose untouched", () => {
  eq(stripInlinePageRefs("Tome um comprimido de 8 em 8 horas."), "Tome um comprimido de 8 em 8 horas.", "noop");
});
scenario("does not eat unrelated numbers", () => {
  eq(stripInlinePageRefs("A dose máxima é 4 g por dia."), "A dose máxima é 4 g por dia.", "numbers safe");
});
scenario("removes 'folha' and 'secção' variants", () => {
  eq(stripInlinePageRefs("Veja a secção 4 para mais."), "Para mais.", "secção");
  eq(stripInlinePageRefs("Mais detalhes (folha 2)."), "Mais detalhes.", "folha paren");
});
scenario("removes English 'page' variant", () => {
  eq(stripInlinePageRefs("See the dose (page 3)."), "See the dose.", "english page");
});
scenario("removes sentence-initial 'Na página' form", () => {
  eq(stripInlinePageRefs("Na página 3, não exceda 6 comprimidos."), "Não exceda 6 comprimidos.", "leading-bare");
});
scenario("removes 'A página N indica que' subject form", () => {
  eq(stripInlinePageRefs("A página 3 indica que deve evitar álcool."), "Deve evitar álcool.", "leading-subject");
});
scenario("does not mangle a decimal section ref into '.3' (regression)", () => {
  // Model wrote "Fala na secção 4.3, ..." — previously TRAILING_RE stripped
  // "na secção 4" (the "." of 4.3 satisfied its lookahead), leaving "Fala.3".
  // Decimal-aware REF_NUM no longer matches the integer alone, so coherent text stays.
  eq(
    stripInlinePageRefs("Fala na secção 4.3, «Contraindicações»."),
    "Fala na secção 4.3, «Contraindicações».",
    "no mangle",
  );
});

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
console.log("\nPASS"); process.exit(0);
