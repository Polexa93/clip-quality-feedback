import type { TagSentiment } from "@cqf/shared";
import { withTransaction, type DB } from "./index.js";

export const DEFAULT_TAGS: { label: string; sentiment: TagSentiment }[] = [
  { label: "Strong hook", sentiment: "positive" },
  { label: "Weak hook", sentiment: "negative" },
  { label: "Good pacing", sentiment: "positive" },
  { label: "Slow pacing", sentiment: "negative" },
  { label: "Good captions", sentiment: "positive" },
  { label: "Poor captions", sentiment: "negative" },
  { label: "Good framing", sentiment: "positive" },
  { label: "Bad framing", sentiment: "negative" },
  { label: "Clear audio", sentiment: "positive" },
  { label: "Audio issues", sentiment: "negative" },
  { label: "Engaging content", sentiment: "positive" },
  { label: "Feels generic", sentiment: "negative" },
];

/**
 * Ensures the default tag catalog exists. Safe to call on every server
 * startup and in tests — INSERT OR IGNORE makes it idempotent.
 */
export function seedDefaultTags(db: DB): void {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO tags (label, sentiment) VALUES (@label, @sentiment)"
  );
  withTransaction(db, () => {
    for (const tag of DEFAULT_TAGS) insert.run(tag);
  });
}
