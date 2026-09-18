// Dev-only convenience script: `npm run seed -w server`.
// Creates/reuses the dev SQLite file, seeds the default tag catalog, and
// adds a couple of sample clips so the UI has something to show immediately.
import path from "node:path";
import { createDb } from "./index.js";
import { seedDefaultTags } from "./seedData.js";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data", "clips.db");
const db = createDb(DB_PATH);

seedDefaultTags(db);

const clipCount = db.prepare("SELECT COUNT(*) as n FROM clips").get() as { n: number };
if (clipCount.n === 0) {
  const insertClip = db.prepare(
    "INSERT INTO clips (title, clip_type, video_url) VALUES (@title, @clip_type, @video_url)"
  );
  insertClip.run({
    title: "Sample tutorial clip",
    clip_type: "tutorial",
    video_url: "https://example.com/sample-clip.mp4",
  });
  insertClip.run({
    title: "Sample podcast clip",
    clip_type: "podcast",
    video_url: "https://example.com/sample-podcast.mp4",
  });
  console.log("Seeded 2 sample clips.");
} else {
  console.log(`Skipped sample clips — ${clipCount.n} already present.`);
}

console.log(`Seed complete. DB at ${DB_PATH}`);
db.close();
