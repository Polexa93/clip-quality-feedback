import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import type { DB } from "../db/index.js";
import { CLIP_TYPES, type Clip } from "@cqf/shared";
import { createUploadMiddleware, uploadsRelativePath } from "../middleware/upload.js";

const clipTypeSchema = z.enum(CLIP_TYPES as [string, ...string[]]);

const createClipSchema = z.object({
  title: z.string().trim().min(1, "title is required").max(200),
  clipType: clipTypeSchema.default("other"),
  // Only used when no file is uploaded — links to a clip hosted elsewhere.
  videoUrl: z.string().url().optional(),
});

interface ClipRow {
  id: number;
  title: string;
  clip_type: string;
  video_url: string;
  created_at: string;
  review_count: number;
  average_rating: number | null;
}

function toClip(row: ClipRow): Clip {
  return {
    id: row.id,
    title: row.title,
    clipType: row.clip_type as Clip["clipType"],
    videoUrl: row.video_url,
    status: row.review_count > 0 ? "reviewed" : "pending",
    createdAt: row.created_at,
    reviewCount: row.review_count,
    averageRating: row.average_rating,
  };
}

const CLIP_SELECT_BASE = `
  SELECT
    c.id,
    c.title,
    c.clip_type,
    c.video_url,
    c.created_at,
    COUNT(r.id) AS review_count,
    AVG(r.rating) AS average_rating
  FROM clips c
  LEFT JOIN reviews r ON r.clip_id = c.id
`;
const CLIP_LIST_SQL = `${CLIP_SELECT_BASE} GROUP BY c.id ORDER BY c.created_at DESC, c.id DESC`;
const CLIP_BY_ID_SQL = `${CLIP_SELECT_BASE} WHERE c.id = ? GROUP BY c.id`;

export function clipsRouter(db: DB, uploadsDir: string): Router {
  const router = Router();
  const upload = createUploadMiddleware(uploadsDir);

  router.get("/", (_req, res) => {
    const rows = db.prepare(CLIP_LIST_SQL).all() as unknown as ClipRow[];
    res.json(rows.map(toClip));
  });

  router.get("/:id", (req, res) => {
    const row = db.prepare(CLIP_BY_ID_SQL).get(req.params.id) as unknown as ClipRow | undefined;
    if (!row) {
      res.status(404).json({ error: "Clip not found" });
      return;
    }
    res.json(toClip(row));
  });

  router.post("/", upload.single("video"), (req, res) => {
    const parsed = createClipSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const file = req.file;
    const videoUrl = file
      ? uploadsRelativePath(uploadsDir, file.path)
      : parsed.data.videoUrl;

    if (!videoUrl) {
      res.status(400).json({ error: "Provide either a video file upload or a videoUrl" });
      return;
    }

    const result = db
      .prepare(
        "INSERT INTO clips (title, clip_type, video_url) VALUES (@title, @clip_type, @video_url)"
      )
      .run({
        title: parsed.data.title,
        clip_type: parsed.data.clipType,
        video_url: videoUrl,
      });

    const row = db.prepare(CLIP_BY_ID_SQL).get(result.lastInsertRowid) as unknown as ClipRow;
    res.status(201).json(toClip(row));
  });

  router.delete("/:id", (req, res) => {
    const row = db.prepare("SELECT id, video_url FROM clips WHERE id = ?").get(req.params.id) as
      | { id: number; video_url: string }
      | undefined;
    if (!row) {
      res.status(404).json({ error: "Clip not found" });
      return;
    }

    // Reviews and review_tags cascade-delete via the FK constraints in
    // 001_init.sql (ON DELETE CASCADE), so this is the only query needed.
    db.prepare("DELETE FROM clips WHERE id = ?").run(row.id);

    // Best-effort cleanup of an uploaded file — an external videoUrl has
    // nothing local to remove, and a missing/already-gone file shouldn't
    // fail the request either way.
    if (row.video_url.startsWith("/uploads/")) {
      const filePath = path.join(uploadsDir, row.video_url.slice("/uploads/".length));
      fs.unlink(filePath, () => {});
    }

    res.status(204).end();
  });

  return router;
}
