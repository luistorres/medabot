import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

const XLSX_FILENAME = "authorized.xlsx";

// Column mapping from Portuguese headers
const COL_MAP: Record<string, string> = {
  "Substância Ativa/DCI": "active_substance",
  "Nome do Medicamento": "name",
  "Forma Farmacêutica": "pharmaceutical_form",
  "Dosagem": "dosage",
  "Titular de AIM": "titular",
  "Genérico": "generic",
  "Comercialização": "commercialized",
};

function findXlsx(): string | null {
  // 1. Check CWD (local dev / Docker COPY)
  const cwdPath = path.join(process.cwd(), XLSX_FILENAME);
  if (fs.existsSync(cwdPath)) return cwdPath;

  // 2. Check alongside the DB file (Fly.io volume at /data/)
  const dbPath = process.env.DB_PATH;
  if (dbPath) {
    const volPath = path.join(path.dirname(dbPath), XLSX_FILENAME);
    if (fs.existsSync(volPath)) return volPath;
  }

  return null;
}

export function seedMedicines(db: Database.Database): void {
  const xlsxPath = findXlsx();
  if (!xlsxPath) {
    console.log(`${XLSX_FILENAME} not found — skipping medicine seeding`);
    return;
  }

  // Compute file hash
  const fileBuffer = fs.readFileSync(xlsxPath);
  const fileHash = createHash("sha256").update(fileBuffer).digest("hex");

  // Check if already seeded with this version
  const storedHash = db
    .prepare("SELECT value FROM metadata WHERE key = 'medicines_hash'")
    .get() as { value: string } | undefined;

  if (storedHash?.value === fileHash) {
    const count = (
      db.prepare("SELECT count(*) as n FROM medicines").get() as { n: number }
    ).n;
    console.log(`Medicines DB up-to-date (${count} rows, hash ${fileHash.slice(0, 8)}…)`);
    return;
  }

  console.log(`Seeding medicines from ${XLSX_FILENAME}…`);
  const start = performance.now();

  // Dynamic import xlsx (externalized, won't be bundled)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const XLSX = require("xlsx");
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet);

  // Truncate and re-insert in a transaction
  const insertRow = db.prepare(`
    INSERT INTO medicines (name, active_substance, pharmaceutical_form, dosage, titular, generic, commercialized)
    VALUES (@name, @active_substance, @pharmaceutical_form, @dosage, @titular, @generic, @commercialized)
  `);

  const txn = db.transaction(() => {
    db.exec("DELETE FROM medicines");
    db.exec("DELETE FROM medicines_fts");

    let inserted = 0;
    for (const row of rows) {
      const mapped: Record<string, string> = {
        name: "",
        active_substance: "",
        pharmaceutical_form: "",
        dosage: "",
        titular: "",
        generic: "",
        commercialized: "",
      };

      for (const [ptHeader, enField] of Object.entries(COL_MAP)) {
        mapped[enField] = (row[ptHeader] || "").toString().trim();
      }

      // Skip rows without a name
      if (!mapped.name) continue;

      insertRow.run(mapped);
      inserted++;
    }

    // Rebuild FTS index
    db.exec("INSERT INTO medicines_fts(medicines_fts) VALUES('rebuild')");

    // Store hash
    db.prepare(
      "INSERT INTO metadata (key, value) VALUES ('medicines_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(fileHash);

    return inserted;
  });

  const count = txn();
  const elapsed = Math.round(performance.now() - start);
  console.log(`Seeded ${count} medicines in ${elapsed}ms (hash ${fileHash.slice(0, 8)}…)`);
}
