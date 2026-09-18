import path from "node:path";
import { createApp } from "./app.js";
import { createDb } from "./db/index.js";
import { seedDefaultTags } from "./db/seedData.js";

const PORT = Number(process.env.PORT ?? 4000);
const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data", "clips.db");
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "data", "uploads");

const db = createDb(DB_PATH);
seedDefaultTags(db);

const app = createApp(db, UPLOADS_DIR);

app.listen(PORT, () => {
  console.log(`Clip Quality Feedback API listening on http://localhost:${PORT}`);
  console.log(`DB: ${DB_PATH}`);
  console.log(`Uploads: ${UPLOADS_DIR}`);
});
