// Shared types used by both the server (API responses) and the client (fetch results).
// Keeping these in one place means the contract between frontend and backend can't drift silently.

export type ClipType =
  | "tutorial"
  | "podcast"
  | "interview"
  | "commentary"
  | "highlight"
  | "other";

export const CLIP_TYPES: ClipType[] = [
  "tutorial",
  "podcast",
  "interview",
  "commentary",
  "highlight",
  "other",
];

export type ClipStatus = "pending" | "reviewed";

export interface Clip {
  id: number;
  title: string;
  clipType: ClipType;
  /** Path (relative to the server's public uploads dir) or an external URL. */
  videoUrl: string;
  status: ClipStatus;
  createdAt: string;
  /** Populated on list/detail endpoints once at least one review exists. */
  reviewCount: number;
  averageRating: number | null;
}

export type TagSentiment = "positive" | "negative";

export interface Tag {
  id: number;
  label: string;
  sentiment: TagSentiment;
}

export interface Review {
  id: number;
  clipId: number;
  rating: number; // 1-5
  reviewerName: string | null;
  comment: string | null;
  tags: Tag[];
  createdAt: string;
}

export interface CreateReviewInput {
  rating: number;
  reviewerName?: string | null;
  comment?: string | null;
  tagIds: number[];
}

export interface AnalyticsSummary {
  totalClips: number;
  reviewedClips: number;
  totalReviews: number;
  averageRating: number | null;
}

export interface TagFrequency {
  tag: Tag;
  count: number;
  /** Percentage of reviews that included this tag, 0-100. */
  percentOfReviews: number;
}

export interface ClipTypeBreakdown {
  clipType: ClipType;
  averageRating: number | null;
  reviewCount: number;
}
