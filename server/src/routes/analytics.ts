import { Router } from "express";
import type { DB } from "../db/index.js";
import type { AnalyticsSummary, ClipTypeBreakdown, Tag, TagFrequency } from "@cqf/shared";

export function analyticsRouter(db: DB): Router {
  const router = Router();

  router.get("/summary", (_req, res) => {
    const totals = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM clips) AS total_clips,
           (SELECT COUNT(DISTINCT clip_id) FROM reviews) AS reviewed_clips,
           (SELECT COUNT(*) FROM reviews) AS total_reviews,
           (SELECT AVG(rating) FROM reviews) AS average_rating`
      )
      .get() as unknown as {
      total_clips: number;
      reviewed_clips: number;
      total_reviews: number;
      average_rating: number | null;
    };

    const summary: AnalyticsSummary = {
      totalClips: totals.total_clips,
      reviewedClips: totals.reviewed_clips,
      totalReviews: totals.total_reviews,
      averageRating: totals.average_rating,
    };
    res.json(summary);
  });

  // Most frequently cited *negative* tags — "what's going wrong most often".
  router.get("/issues", (_req, res) => {
    const totalReviews = (
      db.prepare("SELECT COUNT(*) AS n FROM reviews").get() as unknown as { n: number }
    ).n;

    const rows = db
      .prepare(
        `SELECT t.id, t.label, t.sentiment, COUNT(*) AS count
         FROM review_tags rt
         JOIN tags t ON t.id = rt.tag_id
         WHERE t.sentiment = 'negative'
         GROUP BY t.id
         ORDER BY count DESC`
      )
      .all() as unknown as { id: number; label: string; sentiment: string; count: number }[];

    const issues: TagFrequency[] = rows.map((row) => ({
      tag: { id: row.id, label: row.label, sentiment: row.sentiment as Tag["sentiment"] },
      count: row.count,
      percentOfReviews: totalReviews > 0 ? Math.round((row.count / totalReviews) * 1000) / 10 : 0,
    }));
    res.json(issues);
  });

  // Average rating grouped by clip type — "what content types perform best".
  router.get("/by-type", (_req, res) => {
    const rows = db
      .prepare(
        `SELECT c.clip_type, AVG(r.rating) AS average_rating, COUNT(r.id) AS review_count
         FROM clips c
         LEFT JOIN reviews r ON r.clip_id = c.id
         GROUP BY c.clip_type
         ORDER BY average_rating DESC NULLS LAST`
      )
      .all() as unknown as { clip_type: string; average_rating: number | null; review_count: number }[];

    const breakdown: ClipTypeBreakdown[] = rows.map((row) => ({
      clipType: row.clip_type as ClipTypeBreakdown["clipType"],
      averageRating: row.average_rating,
      reviewCount: row.review_count,
    }));
    res.json(breakdown);
  });

  return router;
}
