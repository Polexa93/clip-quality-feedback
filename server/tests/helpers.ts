import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { createApp } from "../src/app.js";
import { createDb, type DB } from "../src/db/index.js";
import { seedDefaultTags } from "../src/db/seedData.js";

/** Spins up a fresh in-memory DB + temp uploads dir + Express app per test file. */
export function setupTestApp() {
  const db: DB = createDb(":memory:");
  seedDefaultTags(db);
  const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), "cqf-uploads-"));
  const app = createApp(db, uploadsDir);
  return { app, db, uploadsDir };
}
