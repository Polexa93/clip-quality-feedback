import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// node:sqlite is deliberately loaded via require() rather than a static
// `import ... from "node:sqlite"`. It's new enough that it's absent from
// Node's reported builtinModules list, which trips up Vite/vitest's import
// analysis (it tries to resolve "sqlite" as an npm package and fails).
// require() sidesteps that static analysis entirely.
const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

// Uses Node's built-in node:sqlite (stable as of Node 22.5+/24, still flagged
// "experimental" in its own warning banner) instead of a native addon like
// better-sqlite3 — no node-gyp/Python toolchain required to install this repo.
export type DB = InstanceType<typeof import("node:sqlite").DatabaseSync>;

/**
 * Opens a SQLite database at `dbPath` (or an in-memory DB when omitted/":memory:")
 * and applies every .sql file in migrations/ in filename order. Migrations are
 * plain CREATE TABLE IF NOT EXISTS statements, so re-running them is a no-op.
 */
export function createDb(dbPath: string = ":memory:"): DB {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    db.exec(sql);
  }

  return db;
}

/** Runs `fn` inside a BEGIN/COMMIT block, rolling back if it throws. */
export function withTransaction<T>(db: DB, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
