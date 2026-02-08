import Database from "better-sqlite3";
import path from "node:path";
import { seedMedicines } from "./seedMedicines";

// Store the database next to the server output (persists across restarts on Fly.io volumes)
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "medabot.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");

    // Drop the old dead-code table if it exists
    db.exec(`DROP TABLE IF EXISTS medicine_cache`);

    db.exec(`
      CREATE TABLE IF NOT EXISTS pdf_cache (
        name_key         TEXT PRIMARY KEY,
        rcm_pdf          BLOB,
        fi_pdf           BLOB,
        medicine_name    TEXT NOT NULL,
        active_substance TEXT NOT NULL DEFAULT '',
        dosage           TEXT NOT NULL DEFAULT '',
        confidence       REAL NOT NULL DEFAULT 0,
        created_at       INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);

    // Add dosage column if missing (migration for existing DBs)
    const cols = db.prepare("PRAGMA table_info(pdf_cache)").all() as { name: string }[];
    if (!cols.some((c) => c.name === "dosage")) {
      db.exec(`ALTER TABLE pdf_cache ADD COLUMN dosage TEXT NOT NULL DEFAULT ''`);
    }

    // Drop legacy search_cache — replaced by local medicines DB
    db.exec(`DROP TABLE IF EXISTS search_cache`);

    // --- Medicines catalog tables ---
    db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS medicines (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        name                TEXT NOT NULL,
        active_substance    TEXT NOT NULL DEFAULT '',
        pharmaceutical_form TEXT NOT NULL DEFAULT '',
        dosage              TEXT NOT NULL DEFAULT '',
        titular             TEXT NOT NULL DEFAULT '',
        generic             TEXT NOT NULL DEFAULT '',
        commercialized      TEXT NOT NULL DEFAULT ''
      )
    `);

    // FTS5 virtual table for full-text search with Portuguese accent handling
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS medicines_fts USING fts5(
        name,
        active_substance,
        content='medicines',
        content_rowid='id',
        tokenize='unicode61 remove_diacritics 2'
      )
    `);

    // Clean expired PDF cache entries (older than 30 days)
    db.exec(`DELETE FROM pdf_cache WHERE created_at <= unixepoch() - 2592000`);

    // Seed medicines from authorized.xlsx (no-op if already up-to-date)
    try {
      seedMedicines(db);
    } catch (err: any) {
      console.warn("Medicine seeding skipped:", err.message);
    }
  }
  return db;
}

export interface CachedPdf {
  rcmPdf: Buffer | null;
  fiPdf: Buffer | null;
  medicineName: string;
  activeSubstance: string;
  dosage: string;
  confidence: number;
}

export function getCachedPdf(nameKey: string): CachedPdf | null {
  const row = getDb()
    .prepare(
      `SELECT rcm_pdf, fi_pdf, medicine_name, active_substance, dosage, confidence
       FROM pdf_cache
       WHERE name_key = ? AND created_at > unixepoch() - 2592000`
    )
    .get(nameKey) as
    | {
        rcm_pdf: Buffer | null;
        fi_pdf: Buffer | null;
        medicine_name: string;
        active_substance: string;
        dosage: string;
        confidence: number;
      }
    | undefined;

  if (!row) return null;
  return {
    rcmPdf: row.rcm_pdf ? Buffer.from(row.rcm_pdf) : null,
    fiPdf: row.fi_pdf ? Buffer.from(row.fi_pdf) : null,
    medicineName: row.medicine_name,
    activeSubstance: row.active_substance,
    dosage: row.dosage,
    confidence: row.confidence,
  };
}

export function setCachedPdf(nameKey: string, data: CachedPdf): void {
  getDb()
    .prepare(
      `INSERT INTO pdf_cache (name_key, rcm_pdf, fi_pdf, medicine_name, active_substance, dosage, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(name_key) DO UPDATE SET
         rcm_pdf = excluded.rcm_pdf,
         fi_pdf = excluded.fi_pdf,
         medicine_name = excluded.medicine_name,
         active_substance = excluded.active_substance,
         dosage = excluded.dosage,
         confidence = excluded.confidence,
         created_at = unixepoch()`
    )
    .run(
      nameKey,
      data.rcmPdf,
      data.fiPdf,
      data.medicineName,
      data.activeSubstance,
      data.dosage,
      data.confidence
    );
}

export function deleteCachedPdf(nameKey: string): void {
  getDb()
    .prepare("DELETE FROM pdf_cache WHERE name_key = ?")
    .run(nameKey);
}


