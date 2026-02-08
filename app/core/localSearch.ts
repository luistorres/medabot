import { getDb } from "./db";
import { stringSimilarity } from "./textUtils";
import type { SearchCandidate } from "./regulatoryPdf";

interface LocalSearchInput {
  name: string;
  activeSubstance?: string;
  dosage?: string;
}

interface MedicineRow {
  id: number;
  name: string;
  active_substance: string;
  pharmaceutical_form: string;
  dosage: string;
  titular: string;
  generic: string;
  commercialized: string;
}

/**
 * Build an FTS5 query from input words using prefix matching.
 * e.g. "ben-u-ron" → "ben u ron*"  (hyphen becomes space, last word gets prefix)
 */
function buildFtsQuery(text: string): string {
  const words = text
    .replace(/[-/]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return "";
  // All words as prefix matches for better recall
  return words.map((w) => `"${w}"*`).join(" ");
}

/**
 * Search the local medicines database for candidates matching the input.
 * Uses FTS5 for initial retrieval, then re-ranks with Levenshtein similarity.
 */
export function searchMedicinesLocally(input: LocalSearchInput): SearchCandidate[] {
  const db = getDb();

  // Check if medicines table has data
  const count = (db.prepare("SELECT count(*) as n FROM medicines").get() as { n: number }).n;
  if (count === 0) return [];

  let rows: MedicineRow[] = [];

  // Strategy 1: FTS5 search
  const ftsQuery = buildFtsQuery(input.name);
  if (ftsQuery) {
    try {
      rows = db
        .prepare(
          `SELECT m.id, m.name, m.active_substance, m.pharmaceutical_form,
                  m.dosage, m.titular, m.generic, m.commercialized
           FROM medicines_fts fts
           JOIN medicines m ON m.id = fts.rowid
           WHERE medicines_fts MATCH ?
           ORDER BY bm25(medicines_fts)
           LIMIT 50`
        )
        .all(ftsQuery) as MedicineRow[];
    } catch {
      // FTS query syntax error — fall through to LIKE
      rows = [];
    }
  }

  // Strategy 2: LIKE fallback if FTS5 returned nothing
  if (rows.length === 0) {
    const likePattern = `%${input.name.replace(/[-/]/g, "%")}%`;
    rows = db
      .prepare(
        `SELECT id, name, active_substance, pharmaceutical_form,
                dosage, titular, generic, commercialized
         FROM medicines
         WHERE name LIKE ? OR active_substance LIKE ?
         LIMIT 50`
      )
      .all(likePattern, likePattern) as MedicineRow[];
  }

  if (rows.length === 0) return [];

  // Re-rank with Levenshtein similarity (same logic as INFARMED scraping)
  const scored = rows.map((r) => {
    const nameSimilarity = stringSimilarity(r.name, input.name);
    const substanceSimilarity =
      r.active_substance && input.activeSubstance
        ? stringSimilarity(r.active_substance, input.activeSubstance)
        : 0;

    const similarity = input.activeSubstance
      ? nameSimilarity * 0.7 + substanceSimilarity * 0.3
      : nameSimilarity;

    return { row: r, similarity };
  });

  // Optional dosage filtering: if provided, boost exact dosage matches
  if (input.dosage) {
    const normalizedDosage = input.dosage.toLowerCase().trim();
    for (const s of scored) {
      if (s.row.dosage.toLowerCase().trim() === normalizedDosage) {
        s.similarity = Math.min(1.0, s.similarity + 0.1);
      }
    }
  }

  // Sort by similarity descending
  scored.sort((a, b) => b.similarity - a.similarity);

  // Convert to SearchCandidate[]
  return scored.map((s) => ({
    name: s.row.name,
    activeSubstance: s.row.active_substance || "(unknown)",
    similarity: s.similarity,
    pharmaceuticalForm: s.row.pharmaceutical_form || undefined,
    dosage: s.row.dosage || undefined,
    titular: s.row.titular || undefined,
  }));
}
