#!/usr/bin/env npx tsx
/**
 * E2E integration test for the regulatoryPDF pipeline + SQLite cache.
 *
 * Usage:
 *   npx tsx scripts/e2e-test.ts          # Full suite (hits INFARMED, ~30-60s)
 *   npx tsx scripts/e2e-test.ts --smoke   # DB schema validation only (<100ms)
 */

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

// ── Isolate test DB (must happen BEFORE importing app modules) ──────────────
const TEST_DB = path.join(process.cwd(), "medabot-test.db");
for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}
process.env.DB_PATH = TEST_DB;

// ── Minimal test harness ────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

function timer() {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}

async function scenario(name: string, fn: () => Promise<void>) {
  const t = timer();
  process.stdout.write(`  ${name} ... `);
  try {
    await fn();
    console.log(`PASS (${t()}ms)`);
    passed++;
  } catch (err: any) {
    console.log(`FAIL (${t()}ms)`);
    console.log(`    ${err.message}`);
    failed++;
    failures.push(name);
  }
}

function summary() {
  console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log("Failed:");
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  return failed === 0 ? 0 : 1;
}

// ── DB inspection helpers (read-only, independent of app abstraction) ───────
function openTestDb() {
  return new Database(TEST_DB, { readonly: true });
}

function tableColumns(db: Database.Database, table: string): string[] {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  return cols.map((c) => c.name);
}

function rowCount(db: Database.Database, table: string): number {
  return (
    db.prepare(`SELECT count(*) as n FROM ${table}`).get() as { n: number }
  ).n;
}

// ── Run ─────────────────────────────────────────────────────────────────────
const smokeOnly = process.argv.includes("--smoke");

async function main() {
  // Dynamic import AFTER DB_PATH is set so the singleton uses the test DB
  const { regulatoryPDF } = await import("../app/core/regulatoryPdf.js");
  // Trigger lazy DB initialization so the file exists for read-only inspection
  const { getCachedPdf } = await import("../app/core/db.js");
  getCachedPdf("__init__");

  console.log(`\n=== E2E Test Suite ${smokeOnly ? "(smoke)" : "(full)"} ===\n`);
  console.log(`Test DB: ${TEST_DB}\n`);

  // ── Scenario 0: DB Schema Smoke ─────────────────────────────────────────
  await scenario("Scenario 0: DB schema smoke", async () => {
    const db = openTestDb();
    try {
      const pdfCols = tableColumns(db, "pdf_cache");
      assert(pdfCols.includes("name_key"), "pdf_cache missing name_key");
      assert(pdfCols.includes("rcm_pdf"), "pdf_cache missing rcm_pdf");
      assert(pdfCols.includes("fi_pdf"), "pdf_cache missing fi_pdf");
      assert(pdfCols.includes("medicine_name"), "pdf_cache missing medicine_name");
      assert(
        pdfCols.includes("active_substance"),
        "pdf_cache missing active_substance"
      );
      assert(pdfCols.includes("dosage"), "pdf_cache missing dosage");
      assert(pdfCols.includes("confidence"), "pdf_cache missing confidence");
      assert(pdfCols.includes("created_at"), "pdf_cache missing created_at");

      // Medicines table schema
      const medCols = tableColumns(db, "medicines");
      assert(medCols.includes("id"), "medicines missing id");
      assert(medCols.includes("name"), "medicines missing name");
      assert(medCols.includes("active_substance"), "medicines missing active_substance");
      assert(medCols.includes("pharmaceutical_form"), "medicines missing pharmaceutical_form");
      assert(medCols.includes("dosage"), "medicines missing dosage");
      assert(medCols.includes("titular"), "medicines missing titular");
      assert(medCols.includes("generic"), "medicines missing generic");
      assert(medCols.includes("commercialized"), "medicines missing commercialized");

      // Medicines should be seeded from authorized.xlsx
      const medCount = rowCount(db, "medicines");
      assert(medCount > 10000, `Expected >10,000 medicines, got ${medCount}`);
      console.log(`    (${medCount} medicines seeded)`);

      const mode = db.pragma("journal_mode") as { journal_mode: string }[];
      assert(
        mode[0].journal_mode === "wal",
        `Expected WAL mode, got ${mode[0].journal_mode}`
      );
    } finally {
      db.close();
    }
  });

  if (smokeOnly) {
    const code = summary();
    cleanup();
    process.exit(code);
  }

  // ── Scenario 0.5: Local search performance ─────────────────────────────
  await scenario('Scenario 0.5: Local search "ben-u-ron" (<50ms)', async () => {
    const { searchMedicinesLocally } = await import("../app/core/localSearch.js");
    const t = timer();
    const results = searchMedicinesLocally({ name: "ben-u-ron" });
    const elapsed = t();

    assert(results.length > 1, `Expected multiple local results, got ${results.length}`);
    assert(elapsed < 50, `Expected <50ms for local search, got ${elapsed}ms`);
    console.log(`    (${results.length} results in ${elapsed}ms)`);
  });

  // ── Scenario 1: Fresh "ben-u-ron" search (disambiguation via local DB) ─
  let selectedCandidate: any = null;

  await scenario('Scenario 1: Fresh "ben-u-ron" (local DB disambiguation)', async () => {
    const t = timer();
    const result = await regulatoryPDF({ name: "ben-u-ron" });
    const elapsed = t();

    assert(
      result.candidates !== undefined && result.candidates.length > 1,
      `Expected multiple candidates, got ${result.candidates?.length ?? 0}`
    );
    assert(result.rcm === null, "Expected rcm to be null for disambiguation");
    // Local DB search should be instant (no Playwright)
    assert(elapsed < 500, `Expected <500ms for local DB search, got ${elapsed}ms`);

    // Capture full candidate for later scenarios
    selectedCandidate = result.candidates![0];
    console.log(`    (captured candidate: "${selectedCandidate.name}")`);
  });

  // ── Scenario 2: Repeat "ben-u-ron" (local DB, consistent results) ───────
  await scenario('Scenario 2: Repeat "ben-u-ron" (local DB repeat)', async () => {
    const t = timer();
    const result = await regulatoryPDF({ name: "ben-u-ron" });
    const elapsed = t();

    assert(
      result.candidates !== undefined && result.candidates.length > 1,
      `Expected multiple candidates, got ${result.candidates?.length ?? 0}`
    );
    assert(result.rcm === null, "Expected rcm to be null");
    assert(elapsed < 500, `Expected <500ms for cache hit, got ${elapsed}ms`);
  });

  // ── Scenario 3: Specific candidate → single result + PDF download ──────
  await scenario("Scenario 3: Specific candidate → PDF download", async () => {
    assert(selectedCandidate !== null, "No candidate captured from scenario 1");

    const t = timer();
    const result = await regulatoryPDF({
      name: selectedCandidate.name,
      selectedCandidate,
    });
    const elapsed = t();

    assert(result.rcm !== null, "Expected rcm PDF buffer");
    assert(
      result.rcm!.subarray(0, 5).toString("ascii").startsWith("%PDF"),
      "Expected PDF magic bytes"
    );

    // Verify pdf_cache was populated
    const db = openTestDb();
    try {
      const pdfCount = rowCount(db, "pdf_cache");
      assert(pdfCount >= 1, `Expected >=1 pdf_cache row, got ${pdfCount}`);
    } finally {
      db.close();
    }

    console.log(`    (PDF: ${result.rcm!.length} bytes, ${elapsed}ms)`);
  });

  // ── Scenario 4: Repeat specific candidate (PDF cache hit) ──────────────
  await scenario("Scenario 4: Repeat specific candidate (PDF cache hit)", async () => {
    assert(selectedCandidate !== null, "No candidate captured");

    const t = timer();
    const result = await regulatoryPDF({
      name: selectedCandidate.name,
      selectedCandidate,
    });
    const elapsed = t();

    assert(result.rcm !== null, "Expected rcm PDF buffer");
    assert(elapsed < 100, `Expected <100ms for PDF cache hit, got ${elapsed}ms`);
  });

  // ── Scenario 5: Force refresh "ben-u-ron" (re-queries local DB) ───────
  await scenario('Scenario 5: Force refresh "ben-u-ron"', async () => {
    const t = timer();
    const result = await regulatoryPDF({ name: "ben-u-ron" }, true);
    const elapsed = t();

    assert(
      result.candidates !== undefined && result.candidates.length > 1,
      `Expected multiple candidates after refresh, got ${result.candidates?.length ?? 0}`
    );
    // Force refresh still uses local DB — should be fast
    assert(elapsed < 500, `Expected <500ms for force refresh (local DB), got ${elapsed}ms`);
  });

  const code = summary();
  cleanup();
  process.exit(code);
}

function cleanup() {
  for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch {}
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  cleanup();
  process.exit(1);
});
