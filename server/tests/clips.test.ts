import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { setupTestApp } from "./helpers.js";

describe("clips API", () => {
  let ctx: ReturnType<typeof setupTestApp>;

  beforeEach(() => {
    ctx = setupTestApp();
  });

  it("creates a clip via videoUrl and lists it", async () => {
    const createRes = await request(ctx.app)
      .post("/api/clips")
      .send({ title: "My Clip", clipType: "tutorial", videoUrl: "https://example.com/a.mp4" });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({
      title: "My Clip",
      clipType: "tutorial",
      videoUrl: "https://example.com/a.mp4",
      status: "pending",
      reviewCount: 0,
      averageRating: null,
    });

    const listRes = await request(ctx.app).get("/api/clips");
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].title).toBe("My Clip");
  });

  it("rejects a clip with no title", async () => {
    const res = await request(ctx.app)
      .post("/api/clips")
      .send({ clipType: "tutorial", videoUrl: "https://example.com/a.mp4" });
    expect(res.status).toBe(400);
  });

  it("rejects a clip with neither a file nor a videoUrl", async () => {
    const res = await request(ctx.app).post("/api/clips").send({ title: "No source" });
    expect(res.status).toBe(400);
  });

  it("defaults clipType to 'other' when omitted", async () => {
    const res = await request(ctx.app)
      .post("/api/clips")
      .send({ title: "No type", videoUrl: "https://example.com/a.mp4" });
    expect(res.status).toBe(201);
    expect(res.body.clipType).toBe("other");
  });

  it("returns 404 for an unknown clip id", async () => {
    const res = await request(ctx.app).get("/api/clips/9999");
    expect(res.status).toBe(404);
  });

  it("reflects review count and average rating after a review is submitted", async () => {
    const clip = (
      await request(ctx.app)
        .post("/api/clips")
        .send({ title: "Reviewed clip", clipType: "podcast", videoUrl: "https://example.com/b.mp4" })
    ).body;

    await request(ctx.app).post(`/api/clips/${clip.id}/reviews`).send({ rating: 4, tagIds: [] });
    await request(ctx.app).post(`/api/clips/${clip.id}/reviews`).send({ rating: 2, tagIds: [] });

    const res = await request(ctx.app).get(`/api/clips/${clip.id}`);
    expect(res.body.status).toBe("reviewed");
    expect(res.body.reviewCount).toBe(2);
    expect(res.body.averageRating).toBe(3);
  });
});
