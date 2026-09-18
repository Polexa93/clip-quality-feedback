import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { setupTestApp } from "./helpers.js";

describe("reviews API", () => {
  let ctx: ReturnType<typeof setupTestApp>;
  let clipId: number;

  beforeEach(async () => {
    ctx = setupTestApp();
    const clip = (
      await request(ctx.app)
        .post("/api/clips")
        .send({ title: "Clip", clipType: "tutorial", videoUrl: "https://example.com/a.mp4" })
    ).body;
    clipId = clip.id;
  });

  it("submits a review with rating, tags, and a comment", async () => {
    const tags = (await request(ctx.app).get("/api/tags")).body;
    const strongHook = tags.find((t: { label: string }) => t.label === "Strong hook");
    const poorCaptions = tags.find((t: { label: string }) => t.label === "Poor captions");

    const res = await request(ctx.app)
      .post(`/api/clips/${clipId}/reviews`)
      .send({
        rating: 4,
        reviewerName: "Alex",
        comment: "Good clip overall, but the first 3 seconds could be stronger.",
        tagIds: [strongHook.id, poorCaptions.id],
      });

    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(4);
    expect(res.body.reviewerName).toBe("Alex");
    expect(res.body.tags).toHaveLength(2);
    expect(res.body.tags.map((t: { label: string }) => t.label).sort()).toEqual(
      ["Poor captions", "Strong hook"].sort()
    );
  });

  it("rejects a rating outside 1-5", async () => {
    const res = await request(ctx.app).post(`/api/clips/${clipId}/reviews`).send({ rating: 7 });
    expect(res.status).toBe(400);
  });

  it("rejects an unknown tagId", async () => {
    const res = await request(ctx.app)
      .post(`/api/clips/${clipId}/reviews`)
      .send({ rating: 3, tagIds: [999999] });
    expect(res.status).toBe(400);
  });

  it("404s when reviewing a clip that doesn't exist", async () => {
    const res = await request(ctx.app).post("/api/clips/999999/reviews").send({ rating: 3 });
    expect(res.status).toBe(404);
  });

  it("lists reviews for a clip, newest first", async () => {
    await request(ctx.app).post(`/api/clips/${clipId}/reviews`).send({ rating: 3 });
    await request(ctx.app).post(`/api/clips/${clipId}/reviews`).send({ rating: 5 });

    const res = await request(ctx.app).get(`/api/clips/${clipId}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].rating).toBe(5);
  });
});
