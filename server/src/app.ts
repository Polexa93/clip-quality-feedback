import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import type { DB } from "./db/index.js";
import { clipsRouter } from "./routes/clips.js";
import { reviewsRouter } from "./routes/reviews.js";
import { tagsRouter } from "./routes/tags.js";
import { analyticsRouter } from "./routes/analytics.js";

/** Builds the Express app. Kept separate from index.ts so tests can create
 * an app around an isolated in-memory DB without binding a port. */
export function createApp(db: DB, uploadsDir: string): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/clips", clipsRouter(db, uploadsDir));
  app.use("/api/clips/:clipId/reviews", reviewsRouter(db));
  app.use("/api/tags", tagsRouter(db));
  app.use("/api/analytics", analyticsRouter(db));

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(400).json({ error: err instanceof Error ? err.message : "Unexpected error" });
  };
  app.use(errorHandler);

  return app;
}
