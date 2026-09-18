import { Router } from "express";
import { z } from "zod";
import { withTransaction, type DB } from "../db/index.js";
import type { Review, Tag } from "@cqf/shared";

const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  reviewerName: z.string().trim().max(100).optional().nullable(),
  comment: z.string().trim().max(2000).optional().nullable(),
  tagIds: z.array(z.coerce.number().int().positive()).default([]),
});

interface ReviewRow {
  id: number;
  clip_id: number;
  rating: number;
  reviewer_name: string | null;
  comment: string | null;
  created_at: string;
}

interface TagRow {
  id: number;
  label: string;
  sentiment: string;
}

function attachTags(db: DB, reviews: ReviewRow[]): Review[] {
  if (reviews.length === 0) return [];

  const reviewIds = reviews.map((r) => r.id);
  const placeholders = reviewIds.map(() => "?").join(",");
  const tagRows = db
    .prepare(
      `SELECT rt.review_id, t.id, t.label, t.sentiment
       FROM review_tags rt JOIN tags t ON t.id = rt.tag_id
       WHERE rt.review_id IN (${placeholders})`
    )
    .all(...reviewIds) as unknown as (TagRow & { review_id: number })[];

  const tagsByReview = new Map<number, Tag[]>();
  for (const row of tagRows) {
    const list = tagsByReview.get(row.review_id) ?? [];
    list.push({ id: row.id, label: row.label, sentiment: row.sentiment as Tag["sentiment"] });
    tagsByReview.set(row.review_id, list);
  }

  return reviews.map((r) => ({
    id: r.id,
    clipId: r.clip_id,
    rating: r.rating,
    reviewerName: r.reviewer_name,
    comment: r.comment,
    createdAt: r.created_at,
    tags: tagsByReview.get(r.id) ?? [],
  }));
}

export function reviewsRouter(db: DB): Router {
  const router = Router({ mergeParams: true });

  router.get<{ clipId: string }>("/", (req, res) => {
    const clipId = Number(req.params.clipId);
    const rows = db
      .prepare("SELECT * FROM reviews WHERE clip_id = ? ORDER BY created_at DESC, id DESC")
      .all(clipId) as unknown as ReviewRow[];
    res.json(attachTags(db, rows));
  });

  router.post<{ clipId: string }>("/", (req, res) => {
    const clipId = Number(req.params.clipId);
    const clip = db.prepare("SELECT id FROM clips WHERE id = ?").get(clipId);
    if (!clip) {
      res.status(404).json({ error: "Clip not found" });
      return;
    }

    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { rating, reviewerName, comment, tagIds } = parsed.data;

    if (tagIds.length > 0) {
      const placeholders = tagIds.map(() => "?").join(",");
      const found = db
        .prepare(`SELECT id FROM tags WHERE id IN (${placeholders})`)
        .all(...tagIds) as unknown as { id: number }[];
      if (found.length !== new Set(tagIds).size) {
        res.status(400).json({ error: "One or more tagIds do not exist" });
        return;
      }
    }

    const reviewId = withTransaction(db, () => {
      const result = db
        .prepare(
          "INSERT INTO reviews (clip_id, rating, reviewer_name, comment) VALUES (?, ?, ?, ?)"
        )
        .run(clipId, rating, reviewerName ?? null, comment ?? null);

      const insertedId = result.lastInsertRowid as number;
      const insertTag = db.prepare(
        "INSERT INTO review_tags (review_id, tag_id) VALUES (?, ?)"
      );
      for (const tagId of tagIds) insertTag.run(insertedId, tagId);
      return insertedId;
    });
    const row = db.prepare("SELECT * FROM reviews WHERE id = ?").get(reviewId) as unknown as ReviewRow;
    res.status(201).json(attachTags(db, [row])[0]);
  });

  return router;
}
