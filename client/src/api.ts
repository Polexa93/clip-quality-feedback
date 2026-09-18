import type {
  AnalyticsSummary,
  ClipTypeBreakdown,
  Clip,
  ClipType,
  CreateReviewInput,
  Review,
  Tag,
  TagFrequency,
} from "@cqf/shared";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json", ...init.headers }
      : init?.headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ? JSON.stringify(body.error) : `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listClips: () => request<Clip[]>("/api/clips"),
  getClip: (id: number) => request<Clip>(`/api/clips/${id}`),

  createClipFromUrl: (title: string, clipType: ClipType, videoUrl: string) =>
    request<Clip>("/api/clips", {
      method: "POST",
      body: JSON.stringify({ title, clipType, videoUrl }),
    }),

  createClipFromFile: (title: string, clipType: ClipType, file: File) => {
    const form = new FormData();
    form.set("title", title);
    form.set("clipType", clipType);
    form.set("video", file);
    return request<Clip>("/api/clips", { method: "POST", body: form });
  },

  deleteClip: (id: number) => request<void>(`/api/clips/${id}`, { method: "DELETE" }),

  listTags: () => request<Tag[]>("/api/tags"),

  listReviews: (clipId: number) => request<Review[]>(`/api/clips/${clipId}/reviews`),
  submitReview: (clipId: number, input: CreateReviewInput) =>
    request<Review>(`/api/clips/${clipId}/reviews`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getSummary: () => request<AnalyticsSummary>("/api/analytics/summary"),
  getIssues: () => request<TagFrequency[]>("/api/analytics/issues"),
  getByType: () => request<ClipTypeBreakdown[]>("/api/analytics/by-type"),
};
