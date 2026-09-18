# Clip Quality Feedback

An internal tool for reviewing AI-generated video clips. Reviewers watch a
clip, give it a 1–5 star rating, tag what worked / what didn't, and leave a
comment. The system rolls that feedback up into analytics: average quality,
most common problems, and quality by clip type.

```
AI generates clips → reviewers evaluate them → feedback becomes quality data
```

## Stack

- **Server**: Node.js + Express + TypeScript, SQLite via Node's built-in
  [`node:sqlite`](https://nodejs.org/api/sqlite.html) (no native build step —
  just needs Node **22.5+**), file uploads via `multer`, validation via `zod`.
- **Client**: React + TypeScript + Vite, plain CSS (no UI framework), simple
  bar visualizations for the dashboard (no charting library needed at this
  scale).
- **Shared**: a small `@cqf/shared` package with the TypeScript types used by
  both sides, so the API contract can't drift silently.
- **Tests**: Vitest + Supertest against an in-memory SQLite DB per test file.

npm workspaces monorepo:

```
clip-quality-feedback/
├── shared/   @cqf/shared   — types shared by server + client
├── server/   @cqf/server   — Express API + SQLite
└── client/   @cqf/client   — React + Vite UI
```

## Getting started

Requires Node **22.5+** (for `node:sqlite`).

```bash
npm install
npm run build -w shared   # compile shared types once before first run
npm run seed              # creates server/data/clips.db, seeds tags + 2 sample clips
npm run dev                # runs server (:4000) and client (:5173) together
```

Open http://localhost:5173. The Vite dev server proxies `/api` and
`/uploads` requests to the Express server, so no CORS setup is needed.

Individual pieces:

```bash
npm run dev:server   # API only, http://localhost:4000
npm run dev:client   # UI only, http://localhost:5173
npm test              # server test suite (Vitest)
npm run build          # type-checks and builds all three packages
```

## Data model

- **clips** — title, type (`tutorial` / `podcast` / `interview` /
  `commentary` / `highlight` / `other`), and a `video_url` that's either a
  path under `/uploads` (file was uploaded) or an external URL.
- **tags** — a fixed catalog of positive/negative attributes (e.g. "Strong
  hook", "Poor captions"), seeded on first run (`server/src/db/seedData.ts`).
- **reviews** — one per (reviewer, clip): rating 1–5, optional reviewer name,
  optional comment, and any number of tags.
- **review_tags** — join table between reviews and tags.

No authentication — this is a small trusted internal tool. Reviewer name on
a review is a free-text field, not an identity.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/clips` | list clips with review count + average rating |
| GET | `/api/clips/:id` | clip detail |
| POST | `/api/clips` | create a clip — multipart with a `video` file, or JSON `{ title, clipType, videoUrl }` |
| GET | `/api/clips/:id/reviews` | list reviews for a clip |
| POST | `/api/clips/:id/reviews` | submit a review — `{ rating, reviewerName?, comment?, tagIds[] }` |
| GET | `/api/tags` | the tag catalog |
| GET | `/api/analytics/summary` | total clips/reviews, average rating |
| GET | `/api/analytics/issues` | negative tags ranked by frequency |
| GET | `/api/analytics/by-type` | average rating grouped by clip type |

## Notes / next steps

- Uploaded files live under `server/data/uploads/` (gitignored) and are
  served statically at `/uploads/...`. For a real deployment, swap this for
  S3/an equivalent — the upload middleware (`server/src/middleware/upload.ts`)
  is the only place that would need to change.
- `node:sqlite` is still flagged experimental by Node itself; it was chosen
  here specifically to avoid a native-module build step (`better-sqlite3`
  requires a working Python/node-gyp toolchain, which this dev machine
  didn't have). If that becomes a problem, swapping back to `better-sqlite3`
  only touches `server/src/db/index.ts`.
- No auth/reviewer identity beyond a free-text name — add real auth in
  `server/src/app.ts` if this ever leaves a trusted internal network.
