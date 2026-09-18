import { Router } from "express";
import type { DB } from "../db/index.js";
import type { Tag } from "@cqf/shared";

interface TagRow {
  id: number;
  label: string;
  sentiment: string;
}

function toTag(row: TagRow): Tag {
  return { id: row.id, label: row.label, sentiment: row.sentiment as Tag["sentiment"] };
}

export function tagsRouter(db: DB): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const rows = db
      .prepare("SELECT id, label, sentiment FROM tags ORDER BY sentiment, label")
      .all() as unknown as TagRow[];
    res.json(rows.map(toTag));
  });

  return router;
}
