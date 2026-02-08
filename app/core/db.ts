import Database from "better-sqlite3";
import path from "node:path";

// Store the database next to the server output (persists across restarts on Fly.io volumes)
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "medabot.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS medicine_cache (
        name_key    TEXT PRIMARY KEY,
        med_guid    TEXT NOT NULL,
        name        TEXT NOT NULL,
        active_substance TEXT NOT NULL DEFAULT '',
        created_at  INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
  }
  return db;
}

export interface CachedMedicine {
  guid: string;
  name: string;
  activeSubstance: string;
}

export function getCachedGuid(nameKey: string): CachedMedicine | null {
  const row = getDb()
    .prepare("SELECT med_guid, name, active_substance FROM medicine_cache WHERE name_key = ?")
    .get(nameKey) as { med_guid: string; name: string; active_substance: string } | undefined;

  if (!row) return null;
  return { guid: row.med_guid, name: row.name, activeSubstance: row.active_substance };
}

export function setCachedGuid(nameKey: string, data: CachedMedicine): void {
  getDb()
    .prepare(
      `INSERT INTO medicine_cache (name_key, med_guid, name, active_substance)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(name_key) DO UPDATE SET
         med_guid = excluded.med_guid,
         name = excluded.name,
         active_substance = excluded.active_substance,
         created_at = unixepoch()`
    )
    .run(nameKey, data.guid, data.name, data.activeSubstance);
}

export function deleteCachedGuid(nameKey: string): void {
  getDb()
    .prepare("DELETE FROM medicine_cache WHERE name_key = ?")
    .run(nameKey);
}
