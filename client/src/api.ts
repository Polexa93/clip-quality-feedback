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

  /**
   * Uses XMLHttpRequest instead of `fetch` specifically so upload progress
   * can be reported — `fetch` has no reliable, widely-supported way to
   * observe how much of a request body has been sent yet.
   */
  createClipFromFile: (title: string, clipType: ClipType, file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.set("title", title);
    form.set("clipType", clipType);
    form.set("video", file);

    return new Promise<Clip>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/clips");

      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        let body: unknown;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          body = undefined;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body as Clip);
        } else {
          const error = (body as { error?: unknown } | undefined)?.error;
          reject(new Error(error ? JSON.stringify(error) : `Request failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error while uploading."));
      xhr.send(form);
    });
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
