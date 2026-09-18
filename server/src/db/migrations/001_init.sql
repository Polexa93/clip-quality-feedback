CREATE TABLE IF NOT EXISTS clips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  clip_type TEXT NOT NULL DEFAULT 'other',
  video_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL UNIQUE,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clip_id INTEGER NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  reviewer_name TEXT,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS review_tags (
  review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (review_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_clip_id ON reviews(clip_id);
CREATE INDEX IF NOT EXISTS idx_review_tags_tag_id ON review_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_clips_clip_type ON clips(clip_type);
