import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { setupTestApp } from "./helpers.js";

describe("analytics API", () => {
  let ctx: ReturnType<typeof setupTestApp>;

  beforeEach(() => {
    ctx = setupTestApp();
  });

  async function createClip(title: string, clipType: string) {
    const res = await request(ctx.app)
      .post("/api/clips")
      .send({ title, clipType, videoUrl: "https://example.com/x.mp4" });
    return res.body;
  }

  async function review(clipId: number, rating: number, tagLabels: string[] = []) {
    const tags = (await request(ctx.app).get("/api/tags")).body;
    const tagIds = tagLabels.map((l) => tags.find((t: { label: string }) => t.label === l).id);
    await request(ctx.app).post(`/api/clips/${clipId}/reviews`).send({ rating, tagIds });
  }

  it("returns zeroed summary when nothing has been reviewed yet", async () => {
    await createClip("Unreviewed", "tutorial");
    const res = await request(ctx.app).get("/api/analytics/summary");
    expect(res.body).toEqual({
      totalClips: 1,
      reviewedClips: 0,
      totalReviews: 0,
      averageRating: null,
    });
  });

  it("computes summary averages across multiple reviews", async () => {
    const clipA = await createClip("A", "tutorial");
    const clipB = await createClip("B", "podcast");
    await review(clipA.id, 5);
    await review(clipA.id, 3);
    await review(clipB.id, 4);

    const res = await request(ctx.app).get("/api/analytics/summary");
    expect(res.body.totalClips).toBe(2);
    expect(res.body.reviewedClips).toBe(2);
    expect(res.body.totalReviews).toBe(3);
    expect(res.body.averageRating).toBe(4);
  });

  it("ranks negative tags by frequency for the issues report", async () => {
    const clip = await createClip("C", "tutorial");
    await review(clip.id, 2, ["Weak hook"]);
    await review(clip.id, 3, ["Weak hook", "Poor captions"]);
    await review(clip.id, 4, ["Poor captions"]);

    const res = await request(ctx.app).get("/api/analytics/issues");
    expect(res.status).toBe(200);
    const labels = res.body.map((i: { tag: { label: string } }) => i.tag.label);
    // Both "Weak hook" and "Poor captions" appear twice; order between ties isn't asserted.
    expect(labels).toContain("Weak hook");
    expect(labels).toContain("Poor captions");
    expect(res.body.every((i: { tag: { sentiment: string } }) => i.tag.sentiment === "negative")).toBe(true);
    const weakHook = res.body.find((i: { tag: { label: string } }) => i.tag.label === "Weak hook");
    expect(weakHook.count).toBe(2);
    expect(weakHook.percentOfReviews).toBeCloseTo((2 / 3) * 100, 1);
  });

  it("breaks down average rating by clip type", async () => {
    const tutorial = await createClip("Tut", "tutorial");
    const podcast = await createClip("Pod", "podcast");
    await review(tutorial.id, 5);
    await review(podcast.id, 3);

    const res = await request(ctx.app).get("/api/analytics/by-type");
    const byType = Object.fromEntries(
      res.body.map((r: { clipType: string; averageRating: number }) => [r.clipType, r.averageRating])
    );
    expect(byType.tutorial).toBe(5);
    expect(byType.podcast).toBe(3);
  });
});
